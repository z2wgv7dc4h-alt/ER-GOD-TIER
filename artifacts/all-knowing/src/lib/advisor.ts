import {
  AttackPowerType,
  affinityLabel,
  attackRatingForSlot,
  displayAttackRating,
  findWeapon,
  getWeaponAttack,
  statsToAttributes,
  type Attribute,
  type Weapon,
} from './ar'
import { primaryScaling } from './upgradeAdvice'
import { scalingLetter } from './weaponStats'
import { buildHunt } from './buildHunt'
import { opBuilds, type OpBuild } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { loot, type Loot } from '../knowledge/loot'
import { byId, facts, type Fact } from '../knowledge/catalog'
import { approachingGates, gateState, gates, type Gate } from '../knowledge/gates'
import { stillAvailable } from '../knowledge/storylines'
import { warpGraces } from '../knowledge/graces'
import { bandFor, type RegionLevel } from './regionLevels'
import { currentRegion } from './leftovers'
import { lootPin } from './leftoverPins'
import { SOFT_CAPS, type StatKey } from './softCaps'
import { canonicalFactId } from './aliases'
import { regionReachableFrom } from '../knowledge/regionRoutes'
import type { CoordPin } from './coords'
import type { Character, MapMarker, ModuleId, Stats } from '../types'

/**
 * Advisor (Task 96): a pure recommendation engine over data that already
 * exists. It consolidates — it never re-derives AR, soft caps, gates, quest
 * state or kit hunts that another module owns:
 *   - archetype read from stats + equipped weapons (Task 10 AR data)
 *   - AR-ranked upgrades via `ar.ts` (`getWeaponAttack` / `displayAttackRating`)
 *   - obtainable-now from reached regions + fired gates (`gates.ts`) + owned
 *   - gear from an authored tag table, located through `loot.ts` / `catalog.ts`
 *   - respec via `buildHunt.ts`
 *   - to-do via `gates.ts` + `storylines.ts` + `regionLevels.ts`
 *   - warnings from `softCaps.ts` and real weapon requirements
 *
 * Task 114 makes the ranking honest: an item is only recommended when its
 * acquisition region is reached (or adjacent on the guide's route) and it is
 * not Shadow of the Erdtree content the character cannot reach. Scores weight
 * AR by how well the weapon scales with the stats the build actually invests in
 * and by how much it grows +10 levels in the main stat.
 *
 * `advise` is synchronous and pure: callers pass the optional data they already
 * loaded (weapons, region bands, coords, weights). It never fetches and never
 * mutates.
 */

const OFF: Attribute[] = ['str', 'dex', 'int', 'fai', 'arc']
const ATTR_LABELS: Record<Attribute, string> = { str: 'STR', dex: 'DEX', int: 'INT', fai: 'FAI', arc: 'ARC' }
const ATTR_LABELS_SHORT: Record<Attribute, string> = { str: 'Str', dex: 'Dex', int: 'Int', fai: 'Fai', arc: 'Arc' }
const STAT_LABELS: Record<keyof Stats, string> = {
  vigor: 'Vig',
  mind: 'Mind',
  endurance: 'End',
  strength: 'Str',
  dexterity: 'Dex',
  intelligence: 'Int',
  faith: 'Fai',
  arcane: 'Arc',
}
const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

/** Weapon-type buckets used by the Task 114 sanity filters. */
const TORCH_TYPE = 87
const SHIELD_TYPES = new Set([65, 67, 69, 90])
const BOW_TYPES = new Set([50, 51, 53, 55, 56])

export type Archetype =
  | 'strength'
  | 'dexterity'
  | 'quality'
  | 'intelligence'
  | 'faith'
  | 'arcane'
  | 'bleed'
  | 'hybrid'

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  quality: 'Quality (Str/Dex)',
  intelligence: 'Intelligence',
  faith: 'Faith',
  arcane: 'Arcane',
  bleed: 'Bleed / Arcane',
  hybrid: 'Int/Faith hybrid',
}

const ARCHETYPE_ATTRS: Record<Archetype, Attribute[]> = {
  strength: ['str'],
  dexterity: ['dex'],
  quality: ['str', 'dex'],
  intelligence: ['int'],
  faith: ['fai'],
  arcane: ['arc'],
  bleed: ['arc', 'dex'],
  hybrid: ['int', 'fai'],
}

/** The class starting armament, for the "otherwise compare to…" fallback. */
const STARTING_WEAPON: Record<string, string> = {
  vagabond: 'Longsword',
  warrior: 'Scimitar',
  hero: 'Battle Axe',
  bandit: 'Great Knife',
  astrologer: "Astrologer's Staff",
  prophet: 'Short Spear',
  samurai: 'Uchigatana',
  prisoner: 'Estoc',
  confessor: 'Broadsword',
  wretch: 'Club',
  'heavy-knight': 'Hefty Scimitar',
  'idus-knight': 'Idus Sword',
}

const SCALING_RANK: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, '–': 0, '-': 0 }
const SCALING_FIT: Record<string, number> = { S: 1.5, A: 1.35, B: 1.2, C: 1.05, D: 0.9, E: 0.78, '–': 0.6, '-': 0.6 }

export type BuildRead = {
  archetype: Archetype
  label: string
  /** 0..1 — a heuristic, not a probability. */
  confidence: number
  reason: string
  /** Offensive attributes, highest first. */
  attributes: { attr: Attribute; value: number }[]
}

export type UpgradeRecommendation = {
  name: string
  weaponName: string
  affinity: string
  /** The +N this number was computed at (reachable upgrade). */
  upgrade: number
  ar: number
  /** AR at the currently equipped upgrade, when this weapon is equipped. */
  arNow: number
  /** Percent gain over the comparison armament (0 when there is no baseline). */
  gainPct: number
  /** Name of the armament the gain is measured against. */
  gainVs?: string
  /** Build fit: AR × scaling fit × growth. Higher is better. */
  score: number
  /** Scaling letters at max upgrade, e.g. "Dex C · Str D". */
  scaling: string
  /** One-line why, e.g. "C Dex scaling, 5.5 wt, bleed". */
  why: string
  weight?: number
  meets: boolean
  /** Human string, e.g. "needs +5 STR", or '' when the requirements are met. */
  requirement: string
  owned: boolean
  obtainableNow: boolean
  /** Behind a fired world-state gate — gone this run. */
  lost: boolean
  /** Shadow of the Erdtree content the character cannot yet reach. */
  dlc: boolean
  /** Acquisition region not reached and not adjacent — belongs under "Later". */
  later: boolean
  /** Owned, or its acquisition region is reached/adjacent. */
  reachable: boolean
  region?: string
  where?: string
  factId?: string
  pin: MapMarker | null
}

export type GearPick = {
  name: string
  kind: 'talisman' | 'armor'
  why: string
  owned: boolean
  obtainableNow: boolean
  lost: boolean
  reachable: boolean
  dlc: boolean
  region?: string
  where?: string
  factId?: string
  pin: MapMarker | null
}

export type RespecStat = { attr: string; key: keyof Stats; from: number; to: number }
export type RespecPiece = {
  factId: string
  name: string
  source: 'kit' | 'need'
  kind?: string
  pin: MapMarker | null
}
export type RespecPlan = {
  targetId: string
  targetName: string
  levelNow: number
  levelTarget: number
  /** Levels to gain (0 when the target is already reachable). */
  levelsNeeded: number
  larvalTears: number
  rennalaAvailable: boolean
  rennalaNote: string
  stats: RespecStat[]
  have: RespecPiece[]
  missing: RespecPiece[]
  pins: MapMarker[]
  pinTarget: RespecPiece | null
  unresolved: { id: string; name?: string; source: 'kit' | 'need' }[]
}

export type TodoItem = {
  id: string
  kind: 'missable' | 'region' | 'quest' | 'level'
  title: string
  reason: string
  action: string
  factId?: string
  module: ModuleId
  score: number
}

export type AdvisorWarning = {
  kind: 'equip-load' | 'requirement' | 'soft-cap'
  text: string
  stat?: StatKey
  factId?: string
}

export type AdviseOptions = {
  /** Vanilla 1.17 regulation weapons (from `loadWeapons`). */
  weapons?: Weapon[]
  /** Fextralife progress-route bands (from `loadRegionLevels`). */
  areas?: RegionLevel[]
  /** Plate pins for Show-on-map targets (from `useCoords`). */
  coords?: CoordPin[]
  /** Override the reachable upgrade level for weapon comparisons. */
  reachableUpgrade?: number
  /** Current/max equip load, when the caller has it. No formula in-repo. */
  equipLoad?: { current: number; max: number }
  /** Base weapon name (normalised) → weight, so the 70% load guard can act. */
  weights?: Record<string, number>
  /** Cap for the upgrades list. Default 8. */
  limit?: number
}

export type Advice = {
  build: BuildRead
  upgrades: UpgradeRecommendation[]
  /** Unreachable picks (DLC locked, region not reached), capped at 3. */
  later: UpgradeRecommendation[]
  gear: GearPick[]
  todo: TodoItem[]
  warnings: AdvisorWarning[]
}

// ---------------------------------------------------------------------------
// Shared lookups
// ---------------------------------------------------------------------------

function known(c: Character, id: string): boolean {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

const lootByNorm = new Map<string, Loot>()
for (const l of loot) {
  for (const key of [l.name, ...l.aliases]) {
    const n = norm(key)
    if (n && !lootByNorm.has(n)) lootByNorm.set(n, l)
  }
}

const factByNorm = new Map<string, Fact>()
for (const f of facts) {
  const n = norm(f.name)
  if (n && !factByNorm.has(n)) factByNorm.set(n, f)
}

// Task 113 §6 — the reverse of `Fact.implies`: which facts a fact opens up.
const unlocksBy = new Map<string, Fact[]>()
for (const f of facts) {
  for (const req of f.implies) {
    const list = unlocksBy.get(req) ?? []
    list.push(f)
    unlocksBy.set(req, list)
  }
}

export function lootForName(name: string): Loot | undefined {
  return lootByNorm.get(norm(name))
}

export function reachedRegions(character: Character): string[] {
  const out = new Set<string>()
  for (const id of [
    ...character.discoveredGraces,
    ...character.defeatedBosses,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ]) {
    const f = byId.get(canonicalFactId(id))
    if (f?.region) out.add(f.region)
  }
  for (const id of character.discoveredGraces) {
    const g = warpGraces.find((x) => x.id === id)
    if (g?.region) out.add(g.region)
  }
  if (typeof character.answers.lastRegion === 'string' && character.answers.lastRegion) {
    out.add(character.answers.lastRegion)
  }
  return [...out]
}

/**
 * Task 114 §1 — the character can enter the Realm of Shadow once Mohg and
 * Radahn are down (the withered arm), or if they are already there, or if any
 * DLC fact is known at all. Otherwise every SotE item stays under "Later".
 */
function canEnterDlc(character: Character): boolean {
  if (known(character, 'boss:mohg') && known(character, 'boss:radahn')) return true
  if (known(character, 'region:shadow')) return true
  for (const id of [
    ...character.discoveredGraces,
    ...character.defeatedBosses,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ]) {
    if (byId.get(canonicalFactId(id))?.campaign === 'sote') return true
  }
  return false
}

/** A fired gate that names this item — it is gone for this run. */
function lostToGate(character: Character, id?: string, name?: string): Gate | null {
  const target = id ? canonicalFactId(id) : ''
  for (const gate of gates) {
    if (gateState(character, gate) !== 'fired') continue
    const hit = gate.locks.some((l) => {
      if (target && canonicalFactId(l.factId) === target) return true
      if (id && l.factId === id) return true
      return Boolean(name) && norm(l.name) === norm(name as string)
    })
    if (hit) return gate
  }
  return null
}

function ownedInLoadout(character: Character, name: string): boolean {
  const n = norm(name)
  return character.loadout.some((slot) => norm(slot.name) === n)
}

// ---------------------------------------------------------------------------
// 1. Build detection
// ---------------------------------------------------------------------------

function equippedWeapons(character: Character, weapons?: Weapon[]): Weapon[] {
  if (!weapons) return []
  return character.loadout
    .filter((s) => s.kind === 'armament' || s.kind === 'catalyst' || s.kind === 'shield')
    .map((s) => findWeapon(weapons, s))
    .filter((w): w is Weapon => Boolean(w))
}

export function detectBuild(character: Character, weapons?: Weapon[]): BuildRead {
  const attrs = statsToAttributes(character.stats)
  const ranked = OFF.map((a) => ({ attr: a, value: attrs[a] })).sort((x, y) => y.value - x.value)
  const highest = ranked[0]
  const second = ranked[1]
  const gap = highest.value - second.value

  const equipped = equippedWeapons(character, weapons)
  const primaries = new Set(equipped.map((w) => primaryScaling(w)).filter((a): a is Attribute => Boolean(a)))
  const hasBleedWeapon = equipped.some((w) => (w.attack[0]?.[AttackPowerType.BLEED] ?? 0) > 0)

  const intAndFaith = attrs.int >= 20 && attrs.fai >= 20 && Math.abs(attrs.int - attrs.fai) <= 15
  const qualitySpread =
    attrs.str >= 20 && attrs.dex >= 20 && Math.abs(attrs.str - attrs.dex) <= 10 &&
    (highest.attr === 'str' || highest.attr === 'dex')

  let archetype: Archetype
  if (hasBleedWeapon && (attrs.arc >= 15 || attrs.dex >= 20)) archetype = 'bleed'
  else if (intAndFaith) archetype = 'hybrid'
  else if (qualitySpread) archetype = 'quality'
  else if (highest.attr === 'str') archetype = 'strength'
  else if (highest.attr === 'dex') archetype = 'dexterity'
  else if (highest.attr === 'int') archetype = 'intelligence'
  else if (highest.attr === 'fai') archetype = 'faith'
  else archetype = 'arcane'

  const primaryAttr = ARCHETYPE_ATTRS[archetype][0]
  const support = primaries.has(primaryAttr) ? 0.15 : 0
  const spread = highest.value > 0 ? gap / highest.value : 0
  const confidence = Math.max(0.3, Math.min(0.98, 0.35 + spread * 0.5 + support))

  const values: Record<Attribute, number> = attrs
  const reason = buildReason(archetype, values)

  return {
    archetype,
    label: ARCHETYPE_LABELS[archetype],
    confidence: Math.round(confidence * 100) / 100,
    reason,
    attributes: ranked,
  }
}

function buildReason(archetype: Archetype, attrs: Record<Attribute, number>): string {
  switch (archetype) {
    case 'bleed':
      return `Arc ${attrs.arc} with a bleed weapon equipped — Hemorrhage is the plan.`
    case 'hybrid':
      return `Int ${attrs.int} / Fai ${attrs.fai} — one spread feeds both a catalyst and its incantations.`
    case 'quality':
      return `Str ${attrs.str} / Dex ${attrs.dex} — a level quality spread, so both scale.`
    case 'strength':
      return `Str ${attrs.str} is your highest offensive stat.`
    case 'dexterity':
      return `Dex ${attrs.dex} is your highest offensive stat.`
    case 'intelligence':
      return `Int ${attrs.int} is your highest offensive stat.`
    case 'faith':
      return `Fai ${attrs.fai} is your highest offensive stat.`
    case 'arcane':
      return `Arc ${attrs.arc} is your highest offensive stat, without a bleed weapon equipped.`
  }
}

// ---------------------------------------------------------------------------
// 2. Stronger weapons for my build
// ---------------------------------------------------------------------------

function reachableUpgradeFor(character: Character, opts: AdviseOptions): number {
  if (typeof opts.reachableUpgrade === 'number') return Math.max(0, opts.reachableUpgrade)
  if (opts.areas?.length) {
    const band = bandFor(opts.areas, currentRegion(character))
    if (band?.upgradeMax != null) return Math.max(0, band.upgradeMax)
  }
  return 0
}

function requirementOf(character: Character, weapon: Weapon): { meets: boolean; requirement: string } {
  const attrs = statsToAttributes(character.stats)
  const missing = (Object.entries(weapon.requirements) as [Attribute, number][])
    .filter(([a, req]) => attrs[a] < (req ?? 0))
    .map(([a, req]) => `+${(req ?? 0) - attrs[a]} ${ATTR_LABELS[a]}`)
  return { meets: missing.length === 0, requirement: missing.length ? `needs ${missing.join(', ')}` : '' }
}

function slotUpgrade(character: Character, weaponName: string): number {
  const n = norm(weaponName)
  const slot = character.loadout.find((s) => norm(s.name) === n)
  return slot?.upgrade ?? 0
}

function maxUpgradeOf(weapon: Weapon): number {
  return Math.max(0, weapon.attack.length - 1)
}

/** The scaling letter for one attribute at a given upgrade level. */
function letterAt(weapon: Weapon, attr: Attribute, upgrade: number): string {
  const value = weapon.attributeScaling[upgrade]?.[attr] ?? 0
  return scalingLetter(weapon.scalingTiers, value)
}

function bestLetter(weapon: Weapon, attrs: Attribute[], upgrade: number): string {
  let best = '–'
  for (const a of attrs) {
    const letter = letterAt(weapon, a, upgrade)
    if (SCALING_RANK[letter] > SCALING_RANK[best]) best = letter
  }
  return best
}

/** "Dex C · Str D", archetype attribute first, then the rest. */
function scalingText(weapon: Weapon, archetype: Archetype): string {
  const max = maxUpgradeOf(weapon)
  const primary = ARCHETYPE_ATTRS[archetype]
  const parts: string[] = []
  for (const a of primary) parts.push(`${ATTR_LABELS_SHORT[a]} ${letterAt(weapon, a, max)}`)
  for (const a of OFF) {
    if (primary.includes(a)) continue
    parts.push(`${ATTR_LABELS_SHORT[a]} ${letterAt(weapon, a, max)}`)
  }
  return parts.join(' · ')
}

function weaponWeight(opts: AdviseOptions, weapon: Weapon): number | undefined {
  const w = opts.weights?.[norm(weapon.weaponName)] ?? opts.weights?.[norm(weapon.name)]
  return typeof w === 'number' && Number.isFinite(w) ? w : undefined
}

/** The five attributes weighted by how much the character invests in them. */
function fitOf(weapon: Weapon, build: BuildRead, attrs: ReturnType<typeof statsToAttributes>, ar: number, arPlus: number): number {
  const max = maxUpgradeOf(weapon)
  const relevant = ARCHETYPE_ATTRS[build.archetype]
  const archLetter = bestLetter(weapon, relevant, max)
  const topLetter = bestLetter(weapon, OFF, max)
  const primary = primaryScaling(weapon)
  const onBuild = Boolean(primary && relevant.includes(primary))
  let fit = SCALING_FIT[archLetter] ?? 0.6
  // AR mostly from a stat the player does not invest in: the weapon only
  // splashes the archetype, so dock it.
  if (!onBuild && SCALING_RANK[archLetter] < SCALING_RANK[topLetter]) fit *= 0.8
  // Reflects growth: a weapon that barely improves +10 levels is a dead end.
  const growth = ar > 0 ? Math.max(0.5, Math.min(1.6, arPlus / ar)) : 1
  return fit * growth * (1 + attrs[relevant[0]] / 500)
}

type Baseline = { ar: number; name?: string }

function bestEquipped(character: Character, weapons: Weapon[]): Baseline {
  let ar = 0
  let name: string | undefined
  for (const slot of character.loadout.filter((s) => s.kind === 'armament')) {
    const rating = attackRatingForSlot(weapons, slot, character.stats, false)
    if (rating.status === 'ok' && rating.total > ar) {
      ar = rating.total
      name = slot.name
    }
  }
  return { ar, name }
}

function findWeaponByName(weapons: Weapon[], name: string): Weapon | undefined {
  const n = norm(name)
  const hits = weapons.filter((w) => norm(w.weaponName) === n || norm(w.name) === n)
  return hits.find((w) => w.affinityId === 0) ?? hits.find((w) => w.affinityId === -1) ?? hits[0]
}

function arAt(weapon: Weapon, character: Character, upgrade: number): number {
  const result = getWeaponAttack({
    weapon,
    attributes: statsToAttributes(character.stats),
    upgradeLevel: Math.min(Math.max(0, upgrade), maxUpgradeOf(weapon)),
  })
  return displayAttackRating(result.attackPower)
}

/**
 * Task 114 §4 — the armament a pick is measured against: the best equipped
 * weapon, else the best weapon already owned, else the class starting weapon.
 */
function comparisonBaseline(character: Character, weapons: Weapon[], opts: AdviseOptions): Baseline {
  const equipped = bestEquipped(character, weapons)
  if (equipped.ar > 0) return equipped

  const reachable = reachableUpgradeFor(character, opts)
  let owned: Baseline = { ar: 0 }
  for (const row of loot) {
    if (row.kind !== 'weapon' || !known(character, row.id)) continue
    const weapon = findWeaponByName(weapons, row.name)
    if (!weapon) continue
    const ar = arAt(weapon, character, reachable)
    if (ar > owned.ar) owned = { ar, name: row.name }
  }
  if (owned.ar > 0) return owned

  const start = STARTING_WEAPON[character.startingClass]
  if (start) {
    const weapon = findWeaponByName(weapons, start)
    if (weapon) {
      const ar = arAt(weapon, character, reachable)
      if (ar > 0) return { ar, name: start }
    }
  }
  return { ar: 0 }
}

export function rankUpgrades(character: Character, build: BuildRead, opts: AdviseOptions = {}): UpgradeRecommendation[] {
  const weapons = opts.weapons
  if (!weapons) return []
  const cap = opts.limit ?? 200
  const reachable = reachableUpgradeFor(character, opts)
  const relevant = ARCHETYPE_ATTRS[build.archetype]
  const attrs = statsToAttributes(character.stats)
  const reached = reachedRegions(character)
  const dlcOpen = canEnterDlc(character)
  const baseline = comparisonBaseline(character, weapons, opts)

  // Classes the player already uses: allow bows/shields only then (Task 114 §3).
  const equippedTypes = new Set(equippedWeapons(character, weapons).map((w) => w.weaponType))
  const weightBudget = opts.equipLoad && opts.equipLoad.max > 0 ? opts.equipLoad : null

  const byName = new Map<string, UpgradeRecommendation>()
  for (const weapon of weapons) {
    if (weapon.affinityId !== 0 && weapon.affinityId !== -1) continue
    if (weapon.sorceryTool || weapon.incantationTool) continue
    if (weapon.weaponType === TORCH_TYPE) continue
    if (SHIELD_TYPES.has(weapon.weaponType) && !equippedTypes.has(weapon.weaponType)) continue
    if (BOW_TYPES.has(weapon.weaponType) && !equippedTypes.has(weapon.weaponType)) continue

    const max = maxUpgradeOf(weapon)
    const primary = primaryScaling(weapon)
    const bleed = (weapon.attack[0]?.[AttackPowerType.BLEED] ?? 0) > 0
    const archLetter = bestLetter(weapon, relevant, max)
    const onBuild = Boolean(primary && relevant.includes(primary))
    // Keep on-build weapons, or off-build ones that still scale meaningfully
    // (≥ C) in the archetype stat — but never a random AR-king.
    const splash = SCALING_RANK[archLetter] >= SCALING_RANK.C
    const bleedBuild = build.archetype === 'bleed' && bleed
    if (!onBuild && !splash && !bleedBuild) continue

    const upgrade = Math.min(reachable, max)
    const result = getWeaponAttack({ weapon, attributes: attrs, upgradeLevel: upgrade })
    const ar = displayAttackRating(result.attackPower)
    if (!ar) continue

    const lootRow = lootForName(weapon.weaponName) ?? lootForName(weapon.name)
    const owned = Boolean((lootRow && known(character, lootRow.id)) || ownedInLoadout(character, weapon.weaponName))
    const gate = lostToGate(character, lootRow?.id, lootRow?.name ?? weapon.weaponName)
    const lost = Boolean(gate)
    const region = lootRow?.region
    const weight = weaponWeight(opts, weapon)

    // Task 114 §3 — a weapon that would push a not-yet-owned kit past 70% load
    // is skipped outright.
    if (!owned && weightBudget && weight != null) {
      if ((weightBudget.current + weight) / weightBudget.max > 0.7) continue
    }

    const dlc = Boolean(weapon.dlc)
    const dlcBlocked = dlc && !dlcOpen
    const placeReachable =
      !dlcBlocked && !lost && Boolean(lootRow) && regionReachableFrom(reached, region)
    const isReachable = owned || placeReachable

    const { meets, requirement } = requirementOf(character, weapon)
    const arNow = ownedInLoadout(character, weapon.weaponName)
      ? arAt(weapon, character, slotUpgrade(character, weapon.weaponName))
      : 0
    const attrsPlus = { ...attrs, [relevant[0]]: Math.min(99, attrs[relevant[0]] + 10) }
    const arPlus = displayAttackRating(
      getWeaponAttack({ weapon, attributes: attrsPlus, upgradeLevel: upgrade }).attackPower,
    )
    const gainPct =
      baseline.ar > 0 ? Math.round(((ar - baseline.ar) / baseline.ar) * 1000) / 10 : 0

    const whyBits = [`${archLetter} ${ATTR_LABELS_SHORT[relevant[0]]} scaling`]
    if (weight != null) whyBits.push(`${weight} wt`)
    if (bleed) whyBits.push('bleed')
    if ((weapon.attack[0]?.[AttackPowerType.FROST] ?? 0) > 0) whyBits.push('frost')

    const entry: UpgradeRecommendation = {
      name: weapon.name,
      weaponName: weapon.weaponName,
      affinity: affinityLabel(weapon.affinityId),
      upgrade,
      ar,
      arNow,
      gainPct,
      gainVs: baseline.ar > 0 ? baseline.name : undefined,
      score: Math.round(ar * fitOf(weapon, build, attrs, ar, arPlus) * 10) / 10,
      scaling: scalingText(weapon, build.archetype),
      why: whyBits.join(', '),
      weight,
      meets,
      requirement,
      owned,
      obtainableNow: !owned && !lost && placeReachable,
      lost,
      dlc,
      later: !isReachable,
      reachable: isReachable,
      region,
      where: lootRow?.how,
      factId: lootRow?.id,
      pin: lootRow ? lootPin(lootRow, opts.coords ?? []) : null,
    }
    const cur = byName.get(weapon.weaponName)
    if (!cur || entry.score > cur.score) byName.set(weapon.weaponName, entry)
  }

  return [...byName.values()]
    .sort((a, b) => b.score - a.score || b.ar - a.ar || a.name.localeCompare(b.name))
    .slice(0, cap)
}

// ---------------------------------------------------------------------------
// 3. Gear picks
// ---------------------------------------------------------------------------

type GearTag = { name: string; kind: 'talisman' | 'armor'; why: string }

/**
 * Authored archetype → gear tags. Names resolve through `loot.ts` / the
 * catalog; the table exists because "which talisman suits which build" is
 * domain knowledge, not something the regulation dump expresses.
 */
export const GEAR_TAGS: Record<Archetype, GearTag[]> = {
  strength: [
    { name: 'Shard of Alexander', kind: 'talisman', why: 'Boosts the big skills and ashes a strength build actually uses.' },
    { name: "Great-Jar's Arsenal", kind: 'talisman', why: 'More equip load so heavy armour does not force a fat roll.' },
    { name: 'Claw Talisman', kind: 'talisman', why: 'Jump attacks are the colossal opener.' },
    { name: 'Axe Talisman', kind: 'talisman', why: 'Charged attacks hit harder, which is how you trade.' },
    { name: "Bull-Goat's Talisman", kind: 'talisman', why: 'Poise so slow swings finish through a hit.' },
  ],
  dexterity: [
    { name: "Millicent's Prosthesis", kind: 'talisman', why: 'Dex builds land fast combos, so the successive-hit bonus is always up.' },
    { name: 'Rotten Winged Sword Insignia', kind: 'talisman', why: 'Same ramp, bigger numbers, for a pure dex chain.' },
    { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Rewards the clean, hit-and-run spacing dex wants.' },
    { name: 'Spear Talisman', kind: 'talisman', why: 'Punishes the counter-hit window a fast weapon creates.' },
  ],
  quality: [
    { name: 'Shard of Alexander', kind: 'talisman', why: 'Most quality kits live on their weapon skill.' },
    { name: 'Axe Talisman', kind: 'talisman', why: 'A quality weapon usually wants the charged attack.' },
    { name: 'Claw Talisman', kind: 'talisman', why: 'Jump attacks scale off both stats at once.' },
  ],
  intelligence: [
    { name: 'Graven-Mass Talisman', kind: 'talisman', why: 'Raises sorcery damage, the whole point of an Int build.' },
    { name: 'Godfrey Icon', kind: 'talisman', why: 'Charged spells and skills — Comet Azur, Dark Moon — hit harder.' },
    { name: 'Magic Scorpion Charm', kind: 'talisman', why: 'More magic damage at the cost of physical defence.' },
    { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Safe at range, so the full-health bonus stays on.' },
  ],
  faith: [
    { name: "Flock's Canvas Talisman", kind: 'talisman', why: 'Raises incantation potency across the board.' },
    { name: 'Fire Scorpion Charm', kind: 'talisman', why: 'For the fire incantations faith actually casts.' },
    { name: 'Radagon Icon', kind: 'talisman', why: 'Faster casts; faith has the slowest animations.' },
    { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Casters stay at range, so the bonus rarely drops.' },
  ],
  arcane: [
    { name: "Lord of Blood's Exultation", kind: 'talisman', why: 'Arcane bleed pressure keeps the 20% damage window open.' },
    { name: 'White Mask', kind: 'armor', why: 'Extra attack while bleed is proccing on anything nearby.' },
    { name: "Millicent's Prosthesis", kind: 'talisman', why: 'Successive hits ramp the arcane status chains.' },
  ],
  bleed: [
    { name: "Lord of Blood's Exultation", kind: 'talisman', why: 'Turns each Hemorrhage proc into a damage window.' },
    { name: 'Rotten Winged Sword Insignia', kind: 'talisman', why: 'Multi-hit bleed chains ramp attack power.' },
    { name: "Millicent's Prosthesis", kind: 'talisman', why: 'Dex/Arc successive hits stack with the insignia.' },
    { name: 'White Mask', kind: 'armor', why: 'More attack while a bleed proc is live.' },
  ],
  hybrid: [
    { name: 'Radagon Icon', kind: 'talisman', why: 'A hybrid casts both sides; faster is always better.' },
    { name: 'Godfrey Icon', kind: 'talisman', why: 'Charged spells from either stat get the boost.' },
    { name: 'Magic Scorpion Charm', kind: 'talisman', why: 'For the Int half of the spread.' },
    { name: "Old Lord's Talisman", kind: 'talisman', why: 'Extends the buffs a hybrid shell leans on.' },
  ],
}

export function pickGear(character: Character, build: BuildRead, opts: AdviseOptions = {}): GearPick[] {
  const reached = reachedRegions(character)
  const dlcOpen = canEnterDlc(character)
  return GEAR_TAGS[build.archetype]
    .map((tag) => {
      const lootRow = lootForName(tag.name)
      const fact = lootRow ? undefined : factByNorm.get(norm(tag.name))
      const id = lootRow?.id ?? fact?.id
      const owned = Boolean((id && known(character, id)) || ownedInLoadout(character, tag.name))
      const gate = lostToGate(character, id, tag.name)
      const lost = Boolean(gate)
      const region = lootRow?.region ?? fact?.region
      const campaign = lootRow?.campaign ?? fact?.campaign
      const dlc = campaign === 'sote' || campaign === 'tarnished-pack'
      const reachable =
        owned || (!(dlc && !dlcOpen) && !lost && Boolean(id) && regionReachableFrom(reached, region))
      return {
        name: lootRow?.name ?? fact?.name ?? tag.name,
        kind: tag.kind,
        why: tag.why,
        owned,
        obtainableNow: !owned && !lost && reachable,
        lost,
        reachable,
        dlc,
        region,
        where: lootRow?.how,
        factId: id,
        pin: lootRow ? lootPin(lootRow, opts.coords ?? []) : null,
      }
    })
    // Reachable picks first (owned, then obtainable), then the long shots.
    .sort(
      (a, b) =>
        Number(b.owned) - Number(a.owned) ||
        Number(b.obtainableNow) - Number(a.obtainableNow) ||
        Number(b.reachable) - Number(a.reachable),
    )
}

// ---------------------------------------------------------------------------
// 4. Change build (respec)
// ---------------------------------------------------------------------------

const ALL_BUILDS: OpBuild[] = [...opBuilds, ...pvpBuilds]

export function planRespec(character: Character, targetBuildId: string, opts: AdviseOptions = {}): RespecPlan | null {
  const wanted = targetBuildId.trim().toLowerCase()
  const build =
    ALL_BUILDS.find((b) => b.id.toLowerCase() === wanted) ??
    ALL_BUILDS.find((b) => b.name.toLowerCase() === wanted) ??
    ALL_BUILDS.find((b) => b.name.toLowerCase().includes(wanted))
  if (!build) return null

  const stats: RespecStat[] = (Object.keys(character.stats) as (keyof Stats)[])
    .map((key) => ({ attr: STAT_LABELS[key], key, from: character.stats[key], to: build.stats[key] }))
    .filter((d) => d.from !== d.to)

  const levelsNeeded = Math.max(0, build.level - character.level)
  const rennalaAvailable = known(character, 'boss:rennala')
  const hunt = buildHunt(character, build, opts.coords ?? [])
  const pieces = (rows: typeof hunt.have): RespecPiece[] =>
    rows.map((p) => ({ factId: p.factId, name: p.name, source: p.source, kind: p.kind, pin: p.pin }))
  const pinTargetRow = hunt.pinTarget

  return {
    targetId: build.id,
    targetName: build.name,
    levelNow: character.level,
    levelTarget: build.level,
    levelsNeeded,
    larvalTears: stats.length ? 1 : 0,
    rennalaAvailable,
    rennalaNote: rennalaAvailable
      ? 'Rennala is available at Raya Lucaria — a respec costs one Larval Tear.'
      : 'Beat Rennala first; respec unlocks after her.',
    stats,
    have: pieces(hunt.have),
    missing: pieces(hunt.missing),
    pins: hunt.pins,
    pinTarget: pinTargetRow
      ? { factId: pinTargetRow.factId, name: pinTargetRow.name, source: pinTargetRow.source, kind: pinTargetRow.kind, pin: pinTargetRow.pin }
      : null,
    unresolved: hunt.unresolved,
  }
}

// ---------------------------------------------------------------------------
// 5. To do / not done yet
// ---------------------------------------------------------------------------

export function buildTodo(character: Character, opts: AdviseOptions = {}): TodoItem[] {
  const cap = opts.limit ?? 12
  const reached = reachedRegions(character)
  const out: TodoItem[] = []

  // (a) Missables before the next point of no return — the highest priority.
  const approaching = approachingGates(character)
  approaching.forEach((gate, i) => {
    const names = gate.locks.map((l) => l.name)
    out.push({
      id: gate.id,
      kind: 'missable',
      title: `Before ${gate.name}`,
      reason: names.length ? `Continuing locks: ${names.join(', ')}` : 'A point of no return is one beat away.',
      action: 'Finish what is still open here before you walk on.',
      factId: gate.locks[0]?.factId,
      module: 'quests',
      score: 100 - i,
    })
  })

  // (b) Bosses in regions already reached but not defeated.
  const usedBossReasons = new Set<string>()
  let regionCount = 0
  for (const f of facts) {
    if (regionCount >= 4) break
    if (f.kind !== 'boss' || known(character, f.id)) continue
    if (!regionReachableFrom(reached, f.region)) continue
    const bits: string[] = []
    const band = opts.areas?.length ? bandFor(opts.areas, f.region) : null
    if (band) bits.push(`recommended Lv ${band.levelMin}\u2013${band.levelMax}, you're ${character.level}`)
    const drops = (f.drops ?? []).map((id) => byId.get(id)?.name).filter((n): n is string => Boolean(n))
    if (drops.length) bits.push(`drops ${drops.slice(0, 2).join(', ')}`)
    const opens = (unlocksBy.get(f.id) ?? []).map((u) => u.name).filter(Boolean)
    if (opens.length) bits.push(`opens ${opens.slice(0, 2).join(', ')}`)
    const gate = approaching.find((g) => g.approachingWhen.includes(f.id))
    if (gate) {
      const names = gate.locks.slice(0, 2).map((lock) => lock.name)
      bits.push(names.length ? `gate ahead (${gate.name}) locks ${names.join(', ')}` : `gate ahead: ${gate.name}`)
    }
    let reason = bits.length ? bits.join('; ') : `${f.name} is still up in ${f.region}`
    if (usedBossReasons.has(reason)) reason = `${reason} — ${f.name}`
    usedBossReasons.add(reason)
    out.push({
      id: f.id,
      kind: 'region',
      title: `${f.name} — still up in ${f.region}`,
      reason,
      action: `Go clear ${f.name}.`,
      factId: f.id,
      module: 'map',
      score: 60 - regionCount,
    })
    regionCount += 1
  }

  // (c) Questline beats available now.
  const survey = stillAvailable(character)
  const rows = [...survey.active, ...survey.open]
  let questCount = 0
  for (const row of rows) {
    if (questCount >= 4) break
    const step = row.current
    if (!step) continue
    out.push({
      id: step.factId ?? step.id,
      kind: 'quest',
      title: `${row.line.name}: ${step.do}`,
      reason: row.note,
      action: step.detail,
      factId: step.factId,
      module: step.module ?? 'quests',
      score: 40 - questCount,
    })
    questCount += 1
  }

  // (d) Region level-band fit.
  const band = opts.areas?.length ? bandFor(opts.areas, currentRegion(character)) : null
  if (band) {
    const level = character.level
    const status = level < band.levelMin ? 'under' : level > band.levelMax ? 'over' : 'in'
    const text =
      status === 'under'
        ? `You are Lv ${level}; ${band.area} is Lv ${band.levelMin}-${band.levelMax} — do the open items first.`
        : status === 'over'
          ? `You are Lv ${level}; ${band.area} is Lv ${band.levelMin}-${band.levelMax} — you have out-levelled it, so move on.`
          : `You are Lv ${level}, on ${band.area}'s Lv ${band.levelMin}-${band.levelMax} band.`
    out.push({
      id: `band:${band.area}`,
      kind: 'level',
      title: `${band.area} level band`,
      reason: text,
      action: status === 'over' ? 'Push into the next region.' : 'Stay on this band before moving on.',
      module: 'map',
      score: 20,
    })
  }

  return out.sort((a, b) => b.score - a.score).slice(0, cap)
}

// ---------------------------------------------------------------------------
// 6. Warnings
// ---------------------------------------------------------------------------

export function buildWarnings(character: Character, opts: AdviseOptions = {}): AdvisorWarning[] {
  const out: AdvisorWarning[] = []

  if (opts.equipLoad && opts.equipLoad.max > 0) {
    const pct = opts.equipLoad.current / opts.equipLoad.max
    if (pct > 0.7) {
      out.push({
        kind: 'equip-load',
        text: `Equip load is ${Math.round(pct * 100)}% (above 70%) — you lose the light roll.`,
      })
    }
  }

  const weapons = opts.weapons
  if (weapons) {
    const attrs = statsToAttributes(character.stats)
    for (const slot of character.loadout) {
      if (slot.kind !== 'armament' && slot.kind !== 'shield' && slot.kind !== 'catalyst') continue
      const weapon = findWeapon(weapons, slot)
      if (!weapon) continue
      const missing = (Object.entries(weapon.requirements) as [Attribute, number][])
        .filter(([a, req]) => attrs[a] < (req ?? 0))
        .map(([a, req]) => `${ATTR_LABELS[a]} ${req}`)
      if (missing.length) {
        out.push({
          kind: 'requirement',
          text: `${slot.name}: below requirement (${missing.join(', ')}) — damage is penalised, not scaled.`,
          factId: lootForName(weapon.weaponName)?.id,
        })
      }
    }
  }

  for (const key of Object.keys(character.stats) as StatKey[]) {
    const caps = SOFT_CAPS[key]
    const last = caps[caps.length - 1]
    const value = character.stats[key]
    if (last != null && value > last) {
      out.push({
        kind: 'soft-cap',
        stat: key,
        text: `${key} is ${value} — ${value - last} point${value - last === 1 ? '' : 's'} past the ${last} soft cap, so they do little.`,
      })
    }
  }

  return out
}

// ---------------------------------------------------------------------------
// Top level
// ---------------------------------------------------------------------------

export function advise(character: Character, opts: AdviseOptions = {}): Advice {
  const build = detectBuild(character, opts.weapons)
  const pool = rankUpgrades(character, build, { ...opts, limit: 500 })
  const limit = opts.limit ?? 8
  return {
    build,
    upgrades: pool.filter((u) => u.reachable).slice(0, limit),
    // "Later" is only useful when we can say where: a DLC item or an item with
    // a known region. An unplaceable weapon is neither recommended nor listed.
    later: pool.filter((u) => !u.reachable && (u.dlc || Boolean(u.region))).slice(0, 3),
    gear: pickGear(character, build, opts),
    todo: buildTodo(character, opts),
    warnings: buildWarnings(character, opts),
  }
}

/**
 * Task 130 §3 — the "Stronger for your build" list. A weapon that is weaker than
 * the current kit (a negative or zero gain, e.g. "−5.1% vs Cane Sword") is never
 * an upgrade; only reachable weapons with a positive gain make the cut.
 */
export function strongerUpgrades<T extends { reachable: boolean; gainPct: number }>(upgrades: T[]): T[] {
  return upgrades.filter((u) => u.reachable && u.gainPct > 0)
}
