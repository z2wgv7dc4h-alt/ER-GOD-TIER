import { useEffect, useMemo, useState } from 'react'
import { facts } from '../knowledge/catalog'
import { mechanics } from '../knowledge/mechanics'
import { canonicalEntityId, registerEntityGraphData } from '../lib/entityGraph'
import { loadWeapons, type Weapon } from '../lib/ar'
import { useArmory, type ArmoryBoss, type ArmoryWeapon } from '../lib/armory'
import { loadBossCombat, type CombatStats } from '../lib/enemy'
import { useFanapiData, type FanapiData } from '../lib/fanapiData'
import { fanImage, normalizeName as norm } from '../lib/fanImage'
import { iconFor } from '../lib/sourcePack'
import { guideExcerpts, loadGuides, type GuideExcerpt } from '../lib/guides'
import { loadAcquisition, type Acquisition } from '../lib/acquisition'
import { loadRecipes, type Recipe } from '../lib/recipes'
import { loadSecrets, type WallSecret } from '../lib/secrets'
import { loadDialogueOwners, linesBySpeaker } from '../lib/dialogueOwners'
import { loadGameTextTable } from '../lib/gameText'
import { toWeaponStatRow } from '../lib/weaponStats'
import { CATEGORIES, type AttributeKey, type CategoryId, type EntityStat, type LibraryEntity } from './model'

/**
 * Task 95 — build the browser's catalogue from the reference data the repo
 * already ships. Every source is normalised into the shared `LibraryEntity`
 * shape; nothing is authored here. The builder is pure and the `useLibraryCatalog`
 * hook just orchestrates the existing loaders (FanAPI, armory, regulation,
 * recipes, secrets, guides, boss combat, dialogue) and caches per dataset.
 */

export type DialogueSpeaker = { speaker: string; lines: string[] }

export type CatalogInput = {
  fan: FanapiData
  armoryWeapons: ArmoryWeapon[]
  armoryBosses: ArmoryBoss[]
  weapons: Weapon[]
  recipes: Recipe[]
  secrets: WallSecret[]
  acquisitions: Acquisition[]
  guides: GuideExcerpt[]
  bossCombat: CombatStats[]
  dialogue: DialogueSpeaker[]
}

export type LibraryCatalog = {
  entities: LibraryEntity[]
  byCategory: Record<CategoryId, LibraryEntity[]>
  weaponByName: Map<string, Weapon>
  /** True while the active category's source dataset is still being fetched. */
  loading: boolean
}

/** The synchronous builder result, before the hook adds its loading flag. */
export type BuiltCatalog = Omit<LibraryCatalog, 'loading'>

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const FACT_PREFIX: Record<CategoryId, string> = {
  weapons: 'item',
  shields: 'item',
  armor: 'item',
  talismans: 'item',
  sorceries: 'item',
  incantations: 'item',
  ashes: 'item',
  spirits: 'item',
  items: 'item',
  bosses: 'boss',
  npcs: 'npc',
  locations: 'region',
  recipes: 'item',
  secrets: 'secret',
  guides: 'guide',
  mechanics: 'mechanic',
  dialogue: 'npc',
}

/** Name (and alias) -> catalog fact, so an entity reuses a real fact id + icon. */
const FACT_BY_NAME = (() => {
  const map = new Map<string, (typeof facts)[number]>()
  for (const f of facts) {
    map.set(norm(f.name), f)
    for (const a of f.aliases) if (!map.has(norm(a))) map.set(norm(a), f)
  }
  return map
})()

function factFor(name: string) {
  return FACT_BY_NAME.get(norm(name))
}

function factIdFor(category: CategoryId, name: string): string {
  const known = factFor(name)
  if (known) return known.id
  // No catalog fact matched: let the entity graph be the id authority so a
  // synthesised id (item:uchigatana) resolves through canonicalFactId/aliases and
  // ownership + Related edges agree with the rest of the app.
  return canonicalEntityId(`${FACT_PREFIX[category]}:${slug(name)}`, name)
}

const ICON_KIND: Partial<Record<CategoryId, string>> = {
  bosses: 'boss',
  npcs: 'npc',
  locations: 'grace',
}

function iconForEntity(category: CategoryId, name: string): string | undefined {
  const aliases = factFor(name)?.aliases
  const fan = fanImage(name, aliases)
  if (fan) return fan
  return iconFor(name, ICON_KIND[category]).url
}

function campaignFlag(dlc?: boolean): LibraryEntity['campaign'] {
  return dlc ? 'sote' : 'base'
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

// ---------------------------------------------------------------------------
// weapons + shields
// ---------------------------------------------------------------------------

type WeaponSeed = {
  name: string
  subtype?: string
  dlc?: boolean
  weight?: number
  where?: string
  skill?: string
  requirements?: Partial<Record<AttributeKey, number>>
}

const AFFINITY_RANK = (affinityId: number) => (affinityId === 0 ? 0 : affinityId === -1 ? 1 : 2 + affinityId)

/** One regulation row per base weapon name, Standard affinity preferred. */
function representativeWeapons(weapons: Weapon[]): Map<string, Weapon> {
  const best = new Map<string, Weapon>()
  for (const w of weapons) {
    const cur = best.get(w.weaponName)
    if (!cur || AFFINITY_RANK(w.affinityId) < AFFINITY_RANK(cur.affinityId)) best.set(w.weaponName, w)
  }
  return best
}

function regRequirements(seed: WeaponSeed, row: ReturnType<typeof toWeaponStatRow> | undefined): WeaponSeed['requirements'] {
  if (seed.requirements && Object.keys(seed.requirements).length) return seed.requirements
  if (!row) return undefined
  const map: Partial<Record<AttributeKey, number>> = {}
  for (const r of row.requirements) {
    const key = ({ Str: 'str', Dex: 'dex', Int: 'int', Fai: 'fai', Arc: 'arc' } as const)[r.attr as 'Str' | 'Dex' | 'Int' | 'Fai' | 'Arc']
    if (key) map[key] = r.value
  }
  return Object.keys(map).length ? map : undefined
}

function weaponEntity(
  category: 'weapons' | 'shields',
  seed: WeaponSeed,
  regRow: ReturnType<typeof toWeaponStatRow> | undefined,
  acquisitions: Acquisition[],
): LibraryEntity {
  const where =
    seed.where ||
    acquisitions.find((a) => norm(a.name) === norm(seed.name))?.location ||
    undefined
  const scaling: Partial<Record<AttributeKey, string>> = {}
  if (regRow) {
    for (const s of regRow.scaling) {
      const key = ({ Str: 'str', Dex: 'dex', Int: 'int', Fai: 'fai', Arc: 'arc' } as const)[s.attr as 'Str' | 'Dex' | 'Int' | 'Fai' | 'Arc']
      if (key) scaling[key] = s.letter
    }
  }
  const tags = [seed.subtype, seed.skill].filter(Boolean) as string[]
  return {
    id: `${category}:${slug(seed.name)}`,
    factId: factIdFor(category, seed.name),
    name: seed.name,
    category,
    subtype: seed.subtype ?? (category === 'shields' ? 'Shield' : 'Weapon'),
    region: undefined,
    campaign: campaignFlag(seed.dlc),
    dlc: seed.dlc,
    icon: iconForEntity(category, seed.name),
    weight: seed.weight,
    requirements: regRequirements(seed, regRow),
    scaling: Object.keys(scaling).length ? scaling : undefined,
    attack: regRow?.attack,
    weaponName: seed.name,
    stats: seed.skill ? [{ label: 'Skill', value: seed.skill }] : undefined,
    tags: tags.length ? tags : undefined,
    where,
  }
}

function buildWeapons(input: CatalogInput): { weapons: LibraryEntity[]; shields: LibraryEntity[]; weaponByName: Map<string, Weapon> } {
  const reps = representativeWeapons(input.weapons)
  const weaponByName = new Map<string, Weapon>()
  for (const [name, w] of reps) {
    weaponByName.set(norm(name), w)
    weaponByName.set(norm(w.name), w)
  }
  const rowByName = (name: string) => {
    const w = reps.get(name) ?? weaponByName.get(norm(name))
    return w ? toWeaponStatRow(w) : undefined
  }

  const seeds = new Map<string, WeaponSeed>()
  const upsert = (seed: WeaponSeed) => {
    const key = norm(seed.name)
    const cur = seeds.get(key)
    if (!cur) {
      seeds.set(key, seed)
      return
    }
    if (!cur.subtype && seed.subtype) cur.subtype = seed.subtype
    if (cur.dlc === undefined && seed.dlc !== undefined) cur.dlc = seed.dlc
    if (cur.weight === undefined && seed.weight !== undefined) cur.weight = seed.weight
    if (!cur.where && seed.where) cur.where = seed.where
    if (!cur.skill && seed.skill) cur.skill = seed.skill
    if (!cur.requirements && seed.requirements) cur.requirements = seed.requirements
  }

  for (const w of input.fan.weapons) {
    upsert({ name: w.name, subtype: w.category, weight: w.weight })
  }
  for (const w of input.armoryWeapons) {
    if (/shield/i.test(w.type) && !/thrusting/i.test(w.type)) continue
    const req: Partial<Record<AttributeKey, number>> = {}
    for (const key of ['str', 'dex', 'int', 'fai', 'arc'] as AttributeKey[]) {
      const v = num(w.req?.[key])
      if (v) req[key] = v
    }
    upsert({
      name: w.name,
      subtype: w.type,
      dlc: w.dlc,
      weight: num(w.weight),
      where: w.where,
      skill: w.skill && w.skill !== 'No Skill' && w.skill !== 'Ashes of War' ? w.skill : undefined,
      requirements: Object.keys(req).length ? req : undefined,
    })
  }
  // Regulation-only armaments (not in FanAPI/armory) still deserve a row.
  for (const [name, w] of reps) {
    upsert({ name, dlc: w.dlc })
  }

  const shieldNames = new Set(input.fan.shields.map((s) => norm(s.name)))
  const weapons: LibraryEntity[] = []
  const shields: LibraryEntity[] = []
  for (const seed of seeds.values()) {
    if (shieldNames.has(norm(seed.name))) continue
    weapons.push(weaponEntity('weapons', seed, rowByName(seed.name), input.acquisitions))
  }
  for (const s of input.fan.shields) {
    const seed: WeaponSeed = {
      name: s.name,
      subtype: s.category,
      weight: s.weight,
    }
    shields.push(weaponEntity('shields', seed, rowByName(s.name), input.acquisitions))
  }
  return { weapons, shields, weaponByName }
}

// ---------------------------------------------------------------------------
// simple fanapi-backed categories
// ---------------------------------------------------------------------------

function baseEntity(category: CategoryId, name: string, extra: Partial<LibraryEntity> = {}): LibraryEntity {
  return {
    id: `${category}:${slug(name)}`,
    factId: factIdFor(category, name),
    name,
    category,
    icon: iconForEntity(category, name),
    ...extra,
  }
}

function buildArmor(fan: FanapiData): LibraryEntity[] {
  return fan.armors.map((a) => {
    const stats: EntityStat[] = [{ label: 'Poise', value: String(a.poise) }]
    const negation = Object.entries(a.dmgNegation)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ')
    if (negation) stats.push({ label: 'Negation', value: negation })
    const tags = [a.category, ...Object.keys(a.dmgNegation)].filter(Boolean)
    return baseEntity('armor', a.name, {
      subtype: a.category,
      weight: a.weight,
      stats,
      tags,
      lore: negation ? `Damage negation: ${negation}.` : undefined,
    })
  })
}

function buildTalismans(fan: FanapiData): LibraryEntity[] {
  return fan.talismans.map((t) =>
    baseEntity('talismans', t.name, {
      subtype: 'Talisman',
      stats: [{ label: 'Effect', value: t.effect }],
      lore: t.effect,
    }),
  )
}

function buildSpells(fan: FanapiData, type: 'Sorcery' | 'Incantation', category: CategoryId): LibraryEntity[] {
  return fan.spells
    .filter((s) => s.type === type)
    .map((s) => {
      const requirements: Partial<Record<AttributeKey, number>> = {}
      for (const [k, v] of Object.entries(s.requires)) {
        const key = k === 'Intelligence' ? 'int' : k === 'Faith' ? 'fai' : k === 'Arcane' ? 'arc' : undefined
        if (key && v) requirements[key] = v
      }
      return baseEntity(category, s.name, {
        subtype: type,
        requirements: Object.keys(requirements).length ? requirements : undefined,
        stats: [
          { label: 'FP cost', value: String(s.cost) },
          { label: 'Slots', value: String(s.slots) },
        ],
        tags: [type],
        lore: s.effect,
      })
    })
}

function buildAshes(fan: FanapiData): LibraryEntity[] {
  return fan.ashes.map((a) =>
    baseEntity('ashes', a.name, {
      subtype: a.affinity || 'Ash of War',
      stats: a.skill ? [{ label: 'Skill', value: a.skill }] : undefined,
      tags: [a.affinity, a.skill].filter(Boolean) as string[],
      lore: a.skill ? `Grants the skill ${a.skill}.` : undefined,
    }),
  )
}

function buildSpirits(fan: FanapiData): LibraryEntity[] {
  return fan.spirits.map((s) =>
    baseEntity('spirits', s.name, {
      subtype: 'Spirit Ash',
      stats: [
        { label: 'FP cost', value: String(s.fpCost) },
        { label: 'HP cost', value: String(s.hpCost) },
      ],
      lore: s.effect,
    }),
  )
}

function buildItems(fan: FanapiData, acquisitions: Acquisition[]): LibraryEntity[] {
  return fan.items.map((i) => {
    const acq = acquisitions.find((a) => norm(a.name) === norm(i.name))
    return baseEntity('items', i.name, {
      subtype: i.type && i.type !== '-' ? i.type : 'Item',
      stats: [{ label: 'Type', value: i.type || 'Item' }],
      tags: [i.type].filter((t) => t && t !== '-') as string[],
      where: acq?.location || acq?.near || undefined,
      lore: i.effect,
    })
  })
}

// ---------------------------------------------------------------------------
// bosses
// ---------------------------------------------------------------------------

function buildBosses(input: CatalogInput): LibraryEntity[] {
  const combatByName = new Map<string, CombatStats>()
  for (const c of input.bossCombat) combatByName.set(norm(c.name), c)

  const seeds = new Map<string, { name: string; region?: string; location?: string; hp?: string; drops: string[]; type?: string; notes?: string; parryable?: boolean | null }>()
  for (const b of input.fan.bosses) {
    seeds.set(norm(b.name), {
      name: b.name,
      region: b.region,
      location: b.location,
      hp: b.hp == null ? undefined : String(b.hp),
      drops: Array.isArray(b.drops) ? b.drops : [],
    })
  }
  for (const b of input.armoryBosses) {
    const key = norm(b.name)
    const cur = seeds.get(key)
    if (cur) {
      cur.type = b.type
      cur.notes = b.notes
      cur.parryable = b.parryable
      if (!cur.region && b.region) cur.region = b.region
    } else {
      seeds.set(key, { name: b.name, region: b.region, type: b.type, notes: b.notes, parryable: b.parryable, drops: [] })
    }
  }

  const out: LibraryEntity[] = []
  for (const seed of seeds.values()) {
    const combat = combatByName.get(norm(seed.name))
    const stats: EntityStat[] = []
    if (seed.hp) stats.push({ label: 'HP', value: seed.hp })
    if (seed.location) stats.push({ label: 'Location', value: seed.location })
    if (seed.drops.length) stats.push({ label: 'Drops', value: seed.drops.join(' · ') })
    if (combat) {
      const weak = Object.entries(combat.negation)
        .filter(([, v]) => v < 0)
        .map(([k, v]) => `${k} ${-v}%`)
      const resist = Object.entries(combat.negation)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k} ${v}%`)
      if (weak.length) stats.push({ label: 'Weak to', value: weak.join(' · ') })
      if (resist.length) stats.push({ label: 'Resists', value: resist.join(' · ') })
      if (combat.poise != null) stats.push({ label: 'Poise', value: String(combat.poise) })
      stats.push({
        label: 'Status resist',
        value: `poison ${combat.resist.poison} · rot ${combat.resist.scarletRot} · bleed ${combat.resist.bleed} · sleep ${combat.resist.sleep} · madness ${combat.resist.madness} · curse ${combat.resist.curse}`,
      })
    }
    out.push(
      baseEntity('bosses', seed.name, {
        subtype: seed.type ?? 'Boss',
        region: seed.region,
        stats,
        tags: [seed.region, seed.type].filter(Boolean) as string[],
        where: seed.location,
        lore: seed.notes,
      }),
    )
  }
  return out
}

// ---------------------------------------------------------------------------
// npcs, locations, and the ripped-pack categories
// ---------------------------------------------------------------------------

function buildNpcs(fan: FanapiData): LibraryEntity[] {
  return fan.npcs.map((n) => {
    const stats: EntityStat[] = []
    if (n.role) stats.push({ label: 'Role', value: n.role })
    if (n.location) stats.push({ label: 'Location', value: n.location })
    return baseEntity('npcs', n.name, {
      subtype: n.role || 'NPC',
      region: n.location,
      stats,
      tags: [n.role].filter(Boolean) as string[],
      where: n.location,
    })
  })
}

function buildLocations(fan: FanapiData): LibraryEntity[] {
  return fan.locations.map((l) =>
    baseEntity('locations', l.name, {
      subtype: 'Location',
      region: l.region,
      stats: l.region ? [{ label: 'Region', value: l.region }] : undefined,
      tags: [l.region].filter(Boolean) as string[],
      where: l.region,
    }),
  )
}

function buildRecipes(recipes: Recipe[]): LibraryEntity[] {
  return recipes.map((r) =>
    baseEntity('recipes', r.name, {
      subtype: 'Crafting',
      stats: r.materials.map((m) => ({ label: m.name, value: `x${m.qty}` })),
      tags: r.materials.map((m) => m.name),
      lore: `Materials: ${r.materials.map((m) => `${m.name} x${m.qty}`).join(', ')}.`,
    }),
  )
}

function buildSecrets(secrets: WallSecret[]): LibraryEntity[] {
  return secrets.map((w) =>
    baseEntity('secrets', `${w.area}${w.heading ? ` — ${w.heading}` : ''}`, {
      subtype: w.area,
      region: w.area,
      stats: w.heading ? [{ label: 'Section', value: w.heading }] : undefined,
      tags: [w.area, w.heading].filter(Boolean) as string[],
      where: w.area,
      lore: w.text,
    }),
  )
}

function buildGuides(guides: GuideExcerpt[]): LibraryEntity[] {
  return guides.map((g) =>
    baseEntity('guides', g.heading || g.page, {
      subtype: g.page,
      stats: [{ label: 'Page', value: g.page }],
      tags: [g.page],
      where: g.url,
      lore: g.text,
    }),
  )
}

function buildMechanics(): LibraryEntity[] {
  // Task 107 §11: the Task 106 mechanics glossary as a Library category. Each
  // card is an entity page, its numbers become the stat rows and its prose the
  // lore tab; the ids are the authored `mechanic:<slug>` facts.
  return mechanics.map((m) => {
    const stats: EntityStat[] = m.numbers.map((n, i) => ({ label: `Key ${i + 1}`, value: n }))
    return {
      id: m.id,
      factId: m.id,
      name: m.title,
      category: 'mechanics' as CategoryId,
      subtype: m.category,
      stats: stats.length ? stats : undefined,
      tags: [m.category, ...m.aliases],
      lore: m.body,
      where: m.source,
    }
  })
}

function buildDialogue(dialogue: DialogueSpeaker[]): LibraryEntity[] {
  return dialogue.map((d) =>
    baseEntity('dialogue', d.speaker, {
      subtype: 'Speaker',
      stats: [{ label: 'Lines', value: String(d.lines.length) }],
      tags: ['Dialogue'],
      lore: d.lines.slice(0, 24).join('\n'),
    }),
  )
}

// ---------------------------------------------------------------------------
// assembly
// ---------------------------------------------------------------------------

export function buildCatalog(input: CatalogInput): BuiltCatalog {
  const { weapons, shields, weaponByName } = buildWeapons(input)
  const entities: LibraryEntity[] = [
    ...weapons,
    ...shields,
    ...buildArmor(input.fan),
    ...buildTalismans(input.fan),
    ...buildSpells(input.fan, 'Sorcery', 'sorceries'),
    ...buildSpells(input.fan, 'Incantation', 'incantations'),
    ...buildAshes(input.fan),
    ...buildSpirits(input.fan),
    ...buildItems(input.fan, input.acquisitions),
    ...buildBosses(input),
    ...buildNpcs(input.fan),
    ...buildLocations(input.fan),
    ...buildRecipes(input.recipes),
    ...buildSecrets(input.secrets),
    ...buildGuides(input.guides),
    ...buildMechanics(),
    ...buildDialogue(input.dialogue),
  ]
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.id, [] as LibraryEntity[]])) as Record<CategoryId, LibraryEntity[]>
  for (const e of entities) byCategory[e.category].push(e)
  for (const list of Object.values(byCategory)) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return { entities, byCategory, weaponByName }
}

const EMPTY_INPUT: CatalogInput = {
  fan: {
    armors: [], talismans: [], spells: [], ashes: [], spirits: [],
    items: [], locations: [], creatures: [], bosses: [], npcs: [],
    ammos: [], classes: [], weapons: [], shields: [],
  },
  armoryWeapons: [],
  armoryBosses: [],
  weapons: [],
  recipes: [],
  secrets: [],
  acquisitions: [],
  guides: [],
  bossCombat: [],
  dialogue: [],
}

/**
 * Orchestrates the existing loaders. Core reference data streams in first;
 * the heavier ripped-pack datasets (recipes/secrets/guides/acquisition/boss
 * combat/dialogue) are fetched the first time their category is opened.
 */
export function useLibraryCatalog(activeCategory: CategoryId): LibraryCatalog {
  const fan = useFanapiData()
  const { weapons: armoryWeapons, bosses: armoryBosses } = useArmory()

  const [weapons, setWeapons] = useState<Weapon[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [secrets, setSecrets] = useState<WallSecret[]>([])
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([])
  const [guides, setGuides] = useState<GuideExcerpt[]>([])
  const [bossCombat, setBossCombat] = useState<CombatStats[]>([])
  const [dialogue, setDialogue] = useState<DialogueSpeaker[]>([])
  // Task 103 §2: which lazy datasets have finished (success or failure), so the
  // skeleton grid can stop even when a dataset is legitimately empty.
  const [settled, setSettled] = useState<Set<CategoryId>>(() => new Set())
  const markSettled = (id: CategoryId) =>
    setSettled((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))

  useEffect(() => {
    let cancelled = false
    void loadWeapons().then((rows) => { if (!cancelled) setWeapons(rows) }).catch(() => { /* no regulation data */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (activeCategory === 'bosses' && bossCombat.length === 0) {
      void loadBossCombat()
        .then((rows) => { if (!cancelled) setBossCombat(rows) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('bosses') })
    }
    if (activeCategory === 'recipes' && recipes.length === 0) {
      void loadRecipes()
        .then((d) => { if (!cancelled) setRecipes(d.recipes) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('recipes') })
    }
    if (activeCategory === 'secrets' && secrets.length === 0) {
      void loadSecrets()
        .then((d) => { if (!cancelled) setSecrets(d.walls) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('secrets') })
    }
    if (activeCategory === 'guides' && guides.length === 0) {
      void loadGuides()
        .then((d) => { if (!cancelled) setGuides(guideExcerpts(d)) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('guides') })
    }
    if ((activeCategory === 'weapons' || activeCategory === 'shields' || activeCategory === 'items' || activeCategory === 'armor' || activeCategory === 'talismans') && acquisitions.length === 0) {
      void loadAcquisition()
        .then((d) => { if (!cancelled) setAcquisitions(d.rows) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled(activeCategory) })
    }
    if (activeCategory === 'dialogue' && dialogue.length === 0) {
      void Promise.all([loadDialogueOwners(), loadGameTextTable('TalkMsg')])
        .then(([owners, text]) => {
          if (cancelled) return
          const groups = [...linesBySpeaker(owners).entries()].map(([speaker, lines]) => ({
            speaker,
            lines: lines.map((id) => text[id]).filter((line): line is string => Boolean(line)),
          }))
          setDialogue(groups)
        })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('dialogue') })
    }
    return () => { cancelled = true }
  }, [activeCategory, bossCombat.length, recipes.length, secrets.length, guides.length, acquisitions.length, dialogue.length])

  // Task 97: fold the loaded async reference data into the shared entity graph,
  // so the universal entity panel's edges agree with the Library browser.
  useEffect(() => {
    registerEntityGraphData({
      bossCombat: bossCombat.length ? bossCombat : undefined,
      recipes: recipes.length ? recipes : undefined,
      acquisitions: acquisitions.length ? acquisitions : undefined,
    })
  }, [bossCombat, recipes, acquisitions])

  return useMemo(() => {
    const catalog = buildCatalog({
      fan,
      armoryWeapons,
      armoryBosses,
      weapons,
      recipes,
      secrets,
      acquisitions,
      guides,
      bossCombat,
      dialogue,
    })
    const coreReady =
      weapons.length > 0 ||
      fan.armors.length > 0 ||
      fan.talismans.length > 0 ||
      fan.spells.length > 0 ||
      fan.items.length > 0 ||
      fan.bosses.length > 0 ||
      fan.npcs.length > 0 ||
      fan.locations.length > 0
    const lazyPending =
      (activeCategory === 'bosses' && bossCombat.length === 0 && !settled.has('bosses')) ||
      (activeCategory === 'recipes' && recipes.length === 0 && !settled.has('recipes')) ||
      (activeCategory === 'secrets' && secrets.length === 0 && !settled.has('secrets')) ||
      (activeCategory === 'guides' && guides.length === 0 && !settled.has('guides')) ||
      (activeCategory === 'dialogue' && dialogue.length === 0 && !settled.has('dialogue'))
    const loading = catalog.byCategory[activeCategory].length === 0 && (!coreReady || lazyPending)
    return { ...catalog, loading }
  }, [fan, armoryWeapons, armoryBosses, weapons, recipes, secrets, acquisitions, guides, bossCombat, dialogue, activeCategory, settled])
}

/** Exposed for tests: the empty catalogue shape. */
export const EMPTY_CATALOG_INPUT = EMPTY_INPUT
