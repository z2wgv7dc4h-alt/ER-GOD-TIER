/**
 * Task 105 — the combat toolkit engine (pure, tested).
 *
 * This is the "stuck on a boss" brain behind Usage-model moment 4. It consults
 * data the repo already holds and never re-derives AR, negation or quest state
 * that another module owns:
 *   - attack rating + status buildup: `ar.ts` (`getWeaponAttack`)
 *   - boss/enemy negation, poise, HP, status resist: `enemy.ts` over
 *     `npc-combat.json` / `enemy-combat.json` (real NpcParam data)
 *   - boss region + recommended level: `catalog.ts` + `regionLevels.ts`
 *   - owned spirit ashes / talismans / buffs: `loot.ts` + `catalog.ts`
 *   - co-op summon rules: `coop.ts`
 *
 * `bossPrep` and `damageVs` are synchronous and pure: callers pass the data
 * they already loaded (weapons, boss/enemy combat rows, region bands) and the
 * functions never fetch and never mutate. Passing nothing falls back to the
 * tables `enemy.ts` already warmed from the UI.
 *
 * Two honesty rules, copied from `Build.tsx` / `Build.preview.test.ts`:
 *   1. Defence is NOT in the extracted NpcParam table. `damageVs` reports
 *      negation (real) and only models defence when a caller supplies a
 *      `defense` row on the target; otherwise the result says so.
 *   2. Frostbite resistance is absent from the same extract, so its status row
 *      is reported as "not extracted" rather than guessed.
 */
import {
  AttackPowerType,
  affinityLabel,
  displayAttackRating,
  findWeapon,
  getWeaponAttack,
  statsToAttributes,
  type Attribute,
  type Weapon,
} from './ar'
import {
  cachedBossCombat,
  cachedEnemyCombat,
  damageTypeToAttackPower,
  effectiveDamage,
  type BossCombat,
  type CombatStats,
  type DamageType,
  type EnemyCombat,
} from './enemy'
import { bandFor, type RegionLevel } from './regionLevels'
import { byId } from '../knowledge/catalog'
import { loot } from '../knowledge/loot'
import { knownFactIds } from './infer'
import { isCoop } from './coop'
import type { Character, Stats } from '../types'

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

const DAMAGE_TYPES: DamageType[] = ['physical', 'magic', 'fire', 'lightning', 'holy']

const ATTR_LABELS: Record<Attribute, string> = { str: 'STR', dex: 'DEX', int: 'INT', fai: 'FAI', arc: 'ARC' }

/** The optional data a caller has already loaded. Everything is optional. */
export type CombatData = {
  /** Vanilla 1.17 regulation weapons (from `loadWeapons`). */
  weapons?: Weapon[]
  /** Boss rows (from `loadBossCombat`, else the warmed cache). */
  bosses?: BossCombat[]
  /** Regular-enemy rows (from `loadEnemyCombat`, else the warmed cache). */
  enemies?: EnemyCombat[]
  /** Fextralife progress-route bands (from `loadRegionLevels`). */
  areas?: RegionLevel[]
}

/** A target row plus an optional, caller-supplied flat defence per type. */
type DefenseAware = CombatStats & { defense?: Partial<Record<DamageType, number>> }

// ---------------------------------------------------------------------------
// Ownership + lookup helpers
// ---------------------------------------------------------------------------

/** Every name (and alias) the character owns, from loadout + loot + catalog. */
function ownedNameSet(character: Character): Set<string> {
  const known = knownFactIds(character)
  const out = new Set<string>()
  const add = (name: string) => {
    const n = norm(name)
    if (n) out.add(n)
  }
  for (const slot of character.loadout) add(slot.name)
  for (const l of loot) {
    if (!known.has(l.id)) continue
    add(l.name)
    for (const a of l.aliases) add(a)
  }
  for (const id of known) {
    const f = byId.get(id)
    if (!f) continue
    add(f.name)
    for (const a of f.aliases) add(a)
  }
  return out
}

function owns(owned: Set<string>, name: string): boolean {
  const n = norm(name)
  if (!n) return false
  if (owned.has(n)) return true
  // "Mimic Tear Ashes" should match an owned "Mimic Tear" and vice versa.
  for (const candidate of owned) {
    if (candidate.length >= 6 && (candidate.includes(n) || n.includes(candidate))) return true
  }
  return false
}

function requirementOf(stats: Stats, weapon: Weapon): { meets: boolean; requirement: string } {
  const attrs = statsToAttributes(stats)
  const missing = (Object.entries(weapon.requirements) as [Attribute, number][])
    .filter(([a, req]) => attrs[a] < (req ?? 0))
    .map(([a, req]) => `${req} ${ATTR_LABELS[a]} (you have ${attrs[a]})`)
  return { meets: missing.length === 0, requirement: missing.length ? `needs ${missing.join(', ')}` : '' }
}

/** The damage type the target takes the most from (lowest negation). */
export function bestDamageTypeFor(target: CombatStats): DamageType {
  return DAMAGE_TYPES.reduce((best, type) => (target.negation[type] < target.negation[best] ? type : best), DAMAGE_TYPES[0])
}

/** Types the target is weak to (negative negation), most weak first. */
export function weakDamageTypes(target: CombatStats): DamageType[] {
  return DAMAGE_TYPES.filter((t) => target.negation[t] < 0).sort((a, b) => target.negation[a] - target.negation[b])
}

/** Types the target resists (positive negation), most resistant first. */
export function resistDamageTypes(target: CombatStats): DamageType[] {
  return DAMAGE_TYPES.filter((t) => target.negation[t] > 0).sort((a, b) => target.negation[b] - target.negation[a])
}

// ---------------------------------------------------------------------------
// damageVs — per-type breakdown after negation, then optional defence
// ---------------------------------------------------------------------------

export type DamageVs =
  | {
      status: 'ok'
      weaponName: string
      affinity: string
      upgrade: number
      meets: boolean
      requirement: string
      targetName: string
      /** Raw attack power per damage type, before any target mitigation. */
      ar: Partial<Record<AttackPowerType, number>>
      /** After the target's per-type negation (real NpcParam data). */
      afterNegation: Partial<Record<AttackPowerType, number>>
      /**
       * After an optional flat per-type defence. Equals `afterNegation` when the
       * target carries no `defense` row, which is the case for every extracted
       * boss/enemy — `defenseModelled` says which.
       */
      afterDefense: Partial<Record<AttackPowerType, number>>
      arTotal: number
      negationTotal: number
      defenseTotal: number
      defenseModelled: boolean
    }
  | { status: 'unknown'; reason: string }

function sumDamage(ap: Partial<Record<AttackPowerType, number>>): number {
  return DAMAGE_TYPES.reduce((total, type) => total + (ap[damageTypeToAttackPower[type]] ?? 0), 0)
}

function applyDefense(
  ap: Partial<Record<AttackPowerType, number>>,
  target: DefenseAware,
): Partial<Record<AttackPowerType, number>> {
  const out: Partial<Record<AttackPowerType, number>> = {}
  for (const type of DAMAGE_TYPES) {
    const value = ap[damageTypeToAttackPower[type]] ?? 0
    if (value === 0) continue
    const def = target.defense?.[type] ?? 0
    out[damageTypeToAttackPower[type]] = Math.max(0, value - def)
  }
  return out
}

/**
 * One weapon's per-damage-type output against one target. `weaponId` is the
 * weapon name as the regulation table spells it (e.g. "Uchigatana"); affinity
 * is a label like "Blood" and is resolved through `ar.ts`.
 */
export function damageVs(
  weaponId: string,
  upgrade: number,
  affinity: string | undefined,
  stats: Stats,
  targetId: string,
  opts: CombatData = {},
): DamageVs {
  const weapons = opts.weapons ?? []
  const weapon = findWeapon(weapons, { id: 'combat', name: weaponId, kind: 'armament', affinity })
  if (!weapon) return { status: 'unknown', reason: `No vanilla 1.17 regulation data for "${weaponId}".` }

  const target: DefenseAware | undefined =
    (opts.bosses ?? cachedBossCombat()).find((b) => b.factId === targetId) ??
    (opts.enemies ?? cachedEnemyCombat()).find((e) => e.factId === targetId)
  if (!target) return { status: 'unknown', reason: `No combat row for "${targetId}".` }

  const maxUpgrade = Math.max(0, weapon.attack.length - 1)
  const level = Math.max(0, Math.min(upgrade, maxUpgrade))
  const result = getWeaponAttack({ weapon, attributes: statsToAttributes(stats), upgradeLevel: level })
  const { meets, requirement } = requirementOf(stats, weapon)

  const afterNegation = effectiveDamage(result.attackPower, target).byType
  const defenseModelled = Boolean(target.defense)
  const afterDefense = defenseModelled ? applyDefense(afterNegation, target) : afterNegation

  return {
    status: 'ok',
    weaponName: weapon.name,
    affinity: affinityLabel(weapon.affinityId),
    upgrade: level,
    meets,
    requirement,
    targetName: target.name,
    ar: result.attackPower,
    afterNegation,
    afterDefense,
    arTotal: displayAttackRating(result.attackPower),
    negationTotal: sumDamage(afterNegation),
    defenseTotal: sumDamage(afterDefense),
    defenseModelled,
  }
}

// ---------------------------------------------------------------------------
// Status procs
// ---------------------------------------------------------------------------

export type StatusKey = 'bleed' | 'frost' | 'poison' | 'scarletRot' | 'sleep' | 'madness'

type StatusSpec = {
  key: StatusKey
  label: string
  attack: AttackPowerType
  /** NpcParam `resist` field, or null when the extract has no field (frost). */
  resist: (r: CombatStats['resist']) => number | null
}

const STATUS_SPECS: StatusSpec[] = [
  { key: 'bleed', label: 'Bleed', attack: AttackPowerType.BLEED, resist: (r) => r.bleed },
  { key: 'frost', label: 'Frost', attack: AttackPowerType.FROST, resist: () => null },
  { key: 'poison', label: 'Poison', attack: AttackPowerType.POISON, resist: (r) => r.poison },
  { key: 'scarletRot', label: 'Scarlet Rot', attack: AttackPowerType.SCARLET_ROT, resist: (r) => r.scarletRot },
  { key: 'sleep', label: 'Sleep', attack: AttackPowerType.SLEEP, resist: (r) => r.sleep },
  { key: 'madness', label: 'Madness', attack: AttackPowerType.MADNESS, resist: (r) => r.madness },
]

/** Threshold at which a nonzero resistance is effectively immunity in-game. */
export const STATUS_IMMUNE_AT = 999

export type StatusRow = {
  key: StatusKey
  label: string
  /** Target's resist threshold, or null when not extracted (frost). */
  resist: number | null
  /** Status buildup per hit from the given weapon (0 when it cannot inflict it). */
  buildup: number
  /** Hits needed to fill the meter, or null when unavailable/immune/no buildup. */
  hitsToProc: number | null
  immune: boolean
  note: string
}

/**
 * Status resistance and "hits to proc" for one target at one weapon. The
 * per-hit buildup is the weapon's status attack power from `ar.ts` at the given
 * upgrade (clamped to the table); the meter is the target's NpcParam resist
 * threshold, so hits = ceil(resist / buildup). This is the first-proc count;
 * the game raises resistance after each proc, so later procs take longer and
 * the note says as much.
 */
export function statusRows(weapon: Weapon | undefined, target: CombatStats, upgrade = 0): StatusRow[] {
  const level = weapon ? Math.max(0, Math.min(upgrade, weapon.attack.length - 1)) : 0
  return STATUS_SPECS.map((spec) => {
    const resist = spec.resist(target.resist)
    const buildup = weapon ? Math.floor(weapon.attack[level]?.[spec.attack] ?? 0) : 0
    const immune = resist != null && resist >= STATUS_IMMUNE_AT
    let hitsToProc: number | null = null
    let note: string
    if (resist == null) {
      note = 'Frostbite resistance is not in the NpcParam extract.'
    } else if (immune) {
      note = 'Immune.'
    } else if (buildup <= 0) {
      note = 'Your weapon inflicts no buildup.'
    } else {
      hitsToProc = Math.ceil(resist / buildup)
      note = `${buildup}/hit · first proc; resistance rises after each proc.`
    }
    return { key: spec.key, label: spec.label, resist, buildup, hitsToProc, immune, note }
  })
}

// ---------------------------------------------------------------------------
// Authored tables: spirit ashes, helpers, summons
// ---------------------------------------------------------------------------

export type SpiritTier = 'S' | 'A' | 'B' | 'C'

export type SpiritAsh = {
  name: string
  /** Names/aliases that prove ownership. */
  match: string[]
  tier: SpiritTier
  why: string
}

/**
 * Authored spirit-ash tier table. Ownership is still resolved from the save
 * (`loot.ts` / `catalog.ts`), so only ashes the character actually has appear.
 */
export const SPIRIT_ASHES: SpiritAsh[] = [
  { name: 'Black Knife Tiche', match: ['black knife tiche', 'tiche'], tier: 'S', why: 'Destined Death burns a percentage of max HP; dodges well.' },
  { name: 'Mimic Tear Ashes', match: ['mimic tear ashes', 'mimic tear', 'mimic'], tier: 'S', why: 'A copy of your whole build; costs HP, not FP.' },
  { name: 'Ancient Dragon Knight Kristoff', match: ['ancient dragon knight kristoff', 'kristoff'], tier: 'A', why: 'Very high poise and a shield; soaks aggro.' },
  { name: 'Banished Knight Oleg', match: ['banished knight oleg', 'oleg'], tier: 'A', why: 'Aggressive two-weapon pressure without much FP.' },
  { name: 'Banished Knight Engvall', match: ['banished knight engvall', 'engvall'], tier: 'A', why: 'Tanky greatsword ash that holds a boss in place.' },
  { name: 'Lhutel the Headless', match: ['lhutel the headless', 'lhutel'], tier: 'A', why: 'Teleports, high poise and survives long.' },
  { name: 'Redmane Knight Ogha', match: ['redmane knight ogha', 'ogha'], tier: 'A', why: 'Greatbow range damage on big arenas.' },
  { name: 'Dolores the Sleeping Arrow Puppet', match: ['dolores the sleeping arrow puppet', 'dolores'], tier: 'A', why: 'Sleep buildup controls humanoid bosses.' },
  { name: 'Finger Maiden Therolina Puppet', match: ['finger maiden therolina puppet', 'therolina'], tier: 'B', why: 'Pure healer; keeps you up but adds no pressure.' },
  { name: 'Greatshield Soldiers', match: ['greatshield soldiers'], tier: 'A', why: 'Three shields wall off a physical boss.' },
  { name: 'Stormhawk Deenh', match: ['stormhawk deenh', 'deenh'], tier: 'B', why: 'Buff and fast harasser for a Dex build.' },
  { name: 'Kaiden Sellsword', match: ['kaiden sellsword', 'kaiden'], tier: 'B', why: 'Cheap, sturdy early summon.' },
  { name: 'Ancestral Follower', match: ['ancestral follower'], tier: 'B', why: 'Ranged support that keeps its distance.' },
  { name: 'Skeletal Militiaman Ashes', match: ['skeletal militiaman ashes', 'skeletal militiaman'], tier: 'C', why: 'Resurrects unless the corpse is hit; low damage.' },
  { name: 'Jellyfish Spirit Ashes', match: ['jellyfish spirit ashes', 'spirit jellyfish', 'jellyfish'], tier: 'C', why: 'Big HP pool and poison; a pure tank.' },
  { name: 'Lone Wolf Ashes', match: ['lone wolf ashes', 'wolves'], tier: 'C', why: 'Early trio; good for drawing aggro only.' },
  { name: 'Avionette Soldier Ashes', match: ['avionette soldier ashes', 'avionette'], tier: 'C', why: 'Flying harassment, low durability.' },
  { name: 'Demi-Human Ashes', match: ['demi human ashes', 'demihuman ashes'], tier: 'C', why: 'Cheap crowd, easily killed.' },
]

export type HelperTag = 'physical' | 'magic' | 'fire' | 'lightning' | 'holy' | 'poise' | 'general'

export type Helper = {
  name: string
  kind: 'talisman' | 'armor' | 'buff'
  why: string
  tags: HelperTag[]
}

/** Authored "what helps against X" table, filtered by what the character owns. */
export const COMBAT_HELPERS: Helper[] = [
  { name: 'Lord of Blood’s Exultation', kind: 'talisman', why: 'A bleed proc becomes a 20% damage window.', tags: ['general'] },
  { name: 'White Mask', kind: 'armor', why: 'Attack up while anything nearby is bleeding.', tags: ['general'] },
  { name: 'Fire Scorpion Charm', kind: 'talisman', why: 'More fire damage — pair with a fire weakness.', tags: ['fire'] },
  { name: 'Magic Scorpion Charm', kind: 'talisman', why: 'More magic damage — pair with a magic weakness.', tags: ['magic'] },
  { name: 'Lightning Scorpion Charm', kind: 'talisman', why: 'More lightning damage — pair with a lightning weakness.', tags: ['lightning'] },
  { name: 'Sacred Scorpion Charm', kind: 'talisman', why: 'More holy damage — pair with a holy weakness.', tags: ['holy'] },
  { name: 'Dragoncrest Greatshield Talisman', kind: 'talisman', why: 'Physical negation — the best defensive pickup.', tags: ['physical', 'general'] },
  { name: 'Shard of Alexander', kind: 'talisman', why: 'Boosts the Ash of War a stance break sets up.', tags: ['poise'] },
  { name: 'Axe Talisman', kind: 'talisman', why: 'Charged attacks break stance faster.', tags: ['poise'] },
  { name: 'Claw Talisman', kind: 'talisman', why: 'Jump attacks break stance faster and hit safely.', tags: ['poise'] },
  { name: "Bull-Goat's Talisman", kind: 'talisman', why: 'More poise so slow swings finish through a hit.', tags: ['poise'] },
  { name: 'Green Turtle Talisman', kind: 'talisman', why: 'Stamina regen for long stance-break punish windows.', tags: ['poise', 'general'] },
  { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Attack up at full HP for hit-and-run spacing.', tags: ['general'] },
  { name: 'Golden Vow', kind: 'buff', why: 'Aura attack + defence; stacks with a body buff.', tags: ['general'] },
  { name: 'Flame, Grant Me Strength', kind: 'buff', why: 'Body attack + stamina buff; stacks with an aura.', tags: ['general', 'fire'] },
  { name: 'Bloodflame Blade', kind: 'buff', why: 'Adds fire damage and stacking bleed to a weapon.', tags: ['fire', 'general'] },
]

export type SummonInfo = {
  name: string
  factId: string
  available: boolean
  note: string
}

/**
 * Authored NPC-summon table, keyed by boss fact id. Every `factId` is an
 * existing catalog fact, so availability reads straight off the character's
 * completed steps. In co-op the NPC sign cannot be used alongside a furled
 * finger, so co-op always reports it unavailable (see `coop.ts`).
 */
export const BOSS_SUMMONS: Record<string, { name: string; factId: string }[]> = {
  'boss:godrick': [{ name: 'Nepheli Loux', factId: 'quest:nepheli:met' }],
  'boss:radahn': [{ name: 'Alexander, Iron Fist', factId: 'quest:alexander:festival' }],
  'boss:bayle': [{ name: 'Igon', factId: 'quest:igon:summon' }],
}

// ---------------------------------------------------------------------------
// bossPrep
// ---------------------------------------------------------------------------

export type WeaponVsBoss = {
  name: string
  weaponName: string
  affinity: string
  upgrade: number
  ar: number
  /** AR after the boss' per-type negation. */
  effectiveDamage: number
  breakdown: Partial<Record<AttackPowerType, number>>
  /** Raw per-type attack power, for status rows. */
  raw: Partial<Record<AttackPowerType, number>>
  bestType: DamageType
  meets: boolean
  requirement: string
  equipped: boolean
  source: 'equipped' | 'owned'
}

export type RecommendedLevel = {
  area: string
  levelMin: number
  levelMax: number
  status: 'under' | 'in' | 'over'
}

export type BossPrep = {
  bossId: string
  name: string
  region?: string
  hp: number
  poise: number | null
  negation: Record<DamageType, number>
  weakTo: DamageType[]
  resists: DamageType[]
  bestType: DamageType
  status: StatusRow[]
  weapons: WeaponVsBoss[]
  bestWeapon: WeaponVsBoss | null
  spirits: SpiritAsh[]
  helpers: Helper[]
  level: RecommendedLevel | null
  summon: SummonInfo | null
  coop: boolean
}

type Candidate = { weapon: Weapon; upgrade: number; equipped: boolean }

function weaponCandidates(character: Character, weapons: Weapon[]): Candidate[] {
  const byKey = new Map<string, Candidate>()
  const add = (candidate: Candidate) => {
    const key = `${candidate.weapon.weaponName}|${candidate.weapon.affinityId}`
    const cur = byKey.get(key)
    // An equipped weapon beats an owned copy; otherwise keep the higher upgrade.
    if (!cur || (candidate.equipped && !cur.equipped) || (candidate.equipped === cur.equipped && candidate.upgrade > cur.upgrade)) {
      byKey.set(key, candidate)
    }
  }

  for (const slot of character.loadout) {
    if (slot.kind !== 'armament' && slot.kind !== 'catalyst' && slot.kind !== 'shield') continue
    const weapon = findWeapon(weapons, slot)
    if (!weapon) continue
    const max = Math.max(0, weapon.attack.length - 1)
    add({ weapon, upgrade: Math.max(0, Math.min(slot.upgrade ?? max, max)), equipped: true })
  }

  const known = knownFactIds(character)
  for (const l of loot) {
    if (l.kind !== 'weapon' || !known.has(l.id)) continue
    const weapon = findWeapon(weapons, { id: l.id, name: l.name, kind: 'armament' })
    if (!weapon) continue
    const max = Math.max(0, weapon.attack.length - 1)
    add({ weapon, upgrade: max, equipped: false })
  }

  return [...byKey.values()]
}

/** Build the whole "how do I beat this boss" card for one character. */
export function bossPrep(bossId: string, character: Character, opts: CombatData = {}): BossPrep | null {
  const target = (opts.bosses ?? cachedBossCombat()).find((b) => b.factId === bossId)
  if (!target) return null

  const weapons = opts.weapons ?? []
  const attrs = statsToAttributes(character.stats)
  const owned = ownedNameSet(character)

  const bestType = bestDamageTypeFor(target)
  const candidates = weaponCandidates(character, weapons)
  const prepared = candidates
    .map(({ weapon, upgrade, equipped }) => {
      const result = getWeaponAttack({ weapon, attributes: attrs, upgradeLevel: upgrade })
      const effective = effectiveDamage(result.attackPower, target)
      const { meets, requirement } = requirementOf(character.stats, weapon)
      const row: WeaponVsBoss = {
        name: weapon.name,
        weaponName: weapon.weaponName,
        affinity: affinityLabel(weapon.affinityId),
        upgrade,
        ar: displayAttackRating(result.attackPower),
        effectiveDamage: effective.total,
        breakdown: effective.byType,
        raw: result.attackPower,
        bestType,
        meets,
        requirement,
        equipped,
        source: equipped ? 'equipped' : 'owned',
      }
      return { row, weapon }
    })
    .sort((a, b) => b.row.effectiveDamage - a.row.effectiveDamage)

  const rows = prepared.map((p) => p.row)
  const bestWeapon = rows[0] ?? null
  const status = statusRows(prepared[0]?.weapon, target, prepared[0]?.row.upgrade ?? 0)

  const spiritRows = SPIRIT_ASHES.filter((a) => a.match.some((m) => owns(owned, m))).sort(
    (a, b) => a.tier.localeCompare(b.tier),
  )

  const helperTraits: HelperTag[] = [bestType as HelperTag]
  if (target.poise != null && target.poise >= 100) helperTraits.push('poise')
  helperTraits.push('general')
  const helpers = COMBAT_HELPERS.filter((h) => h.tags.some((t) => helperTraits.includes(t)) && owns(owned, h.name))

  const fact = byId.get(bossId)
  const region = fact?.region
  const band = bandFor(opts.areas ?? [], region)
  const level: RecommendedLevel | null = band
    ? {
        area: band.area,
        levelMin: band.levelMin,
        levelMax: band.levelMax,
        status: character.level < band.levelMin ? 'under' : character.level > band.levelMax ? 'over' : 'in',
      }
    : null

  const coop = isCoop(character)
  const authored = BOSS_SUMMONS[bossId]?.[0]
  const known = knownFactIds(character)
  const summon: SummonInfo | null = authored
    ? {
        name: authored.name,
        factId: authored.factId,
        available: !coop && known.has(authored.factId),
        note: coop
          ? 'In co-op you cannot also summon the NPC.'
          : known.has(authored.factId)
            ? 'Summon sign available before the fog gate.'
            : 'Not unlocked yet this run.',
      }
    : null

  return {
    bossId,
    name: target.name,
    region,
    hp: target.baseHp,
    poise: target.poise,
    negation: target.negation,
    weakTo: weakDamageTypes(target),
    resists: resistDamageTypes(target),
    bestType,
    status,
    weapons: rows,
    bestWeapon,
    spirits: spiritRows,
    helpers,
    level,
    summon,
    coop,
  }
}
