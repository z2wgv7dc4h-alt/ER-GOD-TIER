import { useEffect, useMemo, useState } from 'react'
import { facts } from '../knowledge/catalog'
import { mechanics } from '../knowledge/mechanics'
import { registerEntityGraphData, type EntityKind } from '../lib/entityGraph'
import { bossRoster, TIER_LABEL } from '../lib/bossRoster'
import { catalogueIdFor } from '../lib/catalogueIds'
import { loadWeapons, type Weapon } from '../lib/ar'
import { weaponAr } from '../lib/weaponAr'
import { useArmory, type ArmoryBoss, type ArmoryWeapon } from '../lib/armory'
import { BASE_HP_LABEL, loadBossCombat, type CombatStats } from '../lib/enemy'
import { useFanapiData, type FanapiData } from '../lib/fanapiData'
import { normalizeName as norm } from '../lib/fanImage'
import { entityImage } from '../lib/extraImages'
import { iconFor } from '../lib/sourcePack'
import { guideExcerpts, loadGuides, type GuideExcerpt } from '../lib/guides'
import { loadAcquisition, type Acquisition } from '../lib/acquisition'
import { loadRecipes, type Recipe } from '../lib/recipes'
import { loadSecrets, type WallSecret } from '../lib/secrets'
import { loadDialogueOwners, linesBySpeaker } from '../lib/dialogueOwners'
import { loadGameTextTable } from '../lib/gameText'
import { toWeaponStatRow } from '../lib/weaponStats'
import { allRecords, type EntityRecord } from '../lib/entityIndex'
import { ensureEntityIndex, useEntityIndex } from '../lib/entityEnrich'
import { useGuide, type GuideItem } from '../lib/guide'
import { registerPeekCatalog } from '../peek/peekData'
import { canonicalName } from '../lib/canonicalNames'
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
  /** Task 132 §4 — the enriched entity index (NPCs/locations/enemies/items). */
  index?: EntityRecord[]
  /** Task 132 §4 — the guide catalogue, for the Key Items / Materials category. */
  guideItems?: GuideItem[]
}

export type LibraryCatalog = {
  entities: LibraryEntity[]
  byCategory: Record<CategoryId, LibraryEntity[]>
  weaponByName: Map<string, Weapon>
  /** True while the active category's source dataset is still being fetched. */
  loading: boolean
  /**
   * Categories whose dataset has a loader that has not finished yet. The rail
   * uses this to tell "not loaded yet" (show) from "genuinely empty" (hide), so
   * a category can never render as a permanent 0 (Task 137 §1).
   */
  pending: Set<CategoryId>
}

/** The synchronous builder result, before the hook adds loading/pending. */
export type BuiltCatalog = Omit<LibraryCatalog, 'loading' | 'pending'>

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
  enemies: 'enemy',
  materials: 'item',
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
  // Task 123 §2: shared with the build-time index so both name a row identically.
  return catalogueIdFor(FACT_PREFIX[category], name)
}

const ICON_KIND: Partial<Record<CategoryId, string>> = {
  bosses: 'boss',
  npcs: 'npc',
  locations: 'grace',
  enemies: 'enemy',
}

/**
 * Task 122 §C: which catalogue rows are real graph entities, and their kind.
 * Prose surfaces (recipes, secrets, guides, dialogue) are not "names of things"
 * and are deliberately left out.
 */
const CATALOG_KIND: Partial<Record<CategoryId, EntityKind>> = {
  weapons: 'weapon',
  shields: 'shield',
  armor: 'armor',
  talismans: 'talisman',
  sorceries: 'spell',
  incantations: 'spell',
  ashes: 'ash',
  spirits: 'spirit',
  items: 'item',
  bosses: 'boss',
  npcs: 'npc',
  locations: 'region',
  enemies: 'enemy',
  materials: 'item',
  mechanics: 'mechanic',
}

/**
 * Task 196 §1 — the loaded entity-index records, keyed by their canonical
 * `kind:slug` id. A card resolves its picture by this map first.
 */
type RecordIndex = Map<string, EntityRecord>

function buildRecordIndex(index: EntityRecord[] | undefined): RecordIndex {
  const map = new Map<string, EntityRecord>()
  for (const record of index ?? []) map.set(record.id, record)
  return map
}

/**
 * Task 196 §1 — names an entity's picture may be filed under. The guide
 * catalogue repeats a key item as "#1 … #N" acquisition rows; the picture lives
 * on the base name, so the trailing counter is stripped for the lookup only.
 */
function iconNameVariants(name: string): string[] {
  const out = [name]
  const base = name.replace(/\s*#\s*\d+\s*$/i, '').trim()
  if (base && base !== name) out.push(base)
  return out
}

// Task 196 §1 — a record may still carry a pack glyph (e.g. a boss-keyed spirit
// used for a boss entry). That is not the entity's real picture, so it must not
// shadow the name lookup; the same placeholder test the index builder uses.
const PLACEHOLDER_IMAGE_RE = /\/pack-icons\//

function iconForEntity(category: CategoryId, name: string, index?: RecordIndex): string | undefined {
  // Task 196 §1: the enriched record's own picture (the game icons from
  // Task 154 and `image-index-extra.json` from Task 184) is the first rung, so
  // DLC and loot rows stop falling back to a generic glyph. Then the name
  // lookup (FanAPI → local extra), then the brand `cat-<kind>` icon, then the
  // pack/chrome seal as the last resort.
  const kind = CATALOG_KIND[category] ?? (category === 'guides' ? 'guide' : undefined)
  for (const variant of iconNameVariants(name)) {
    const recordImage = index?.get(factIdFor(category, variant))?.image
    if (recordImage && !PLACEHOLDER_IMAGE_RE.test(recordImage)) {
      // A remote FanAPI URL has a cached local copy: prefer it (works offline, no network fetch).
      if (/^https?:/.test(recordImage)) return entityImage(variant, factFor(variant)?.aliases, kind) ?? recordImage
      return recordImage
    }
  }
  for (const variant of iconNameVariants(name)) {
    const picture = entityImage(variant, factFor(variant)?.aliases, kind)
    if (picture) return picture
  }
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

/** Normalised-name -> acquisition row, so lookups stay O(1) per entity. */
function acquisitionIndex(acquisitions: Acquisition[]): Map<string, Acquisition> {
  const map = new Map<string, Acquisition>()
  for (const a of acquisitions) {
    const key = norm(a.name)
    if (key && !map.has(key)) map.set(key, a)
  }
  return map
}

function weaponEntity(
  category: 'weapons' | 'shields',
  seed: WeaponSeed,
  regRow: ReturnType<typeof toWeaponStatRow> | undefined,
  acqByName: Map<string, Acquisition>,
  index?: RecordIndex,
): LibraryEntity {
  const where =
    seed.where ||
    acqByName.get(norm(seed.name))?.location ||
    undefined
  const scaling: Partial<Record<AttributeKey, string>> = {}
  if (regRow) {
    for (const s of regRow.scaling) {
      const key = ({ Str: 'str', Dex: 'dex', Int: 'int', Fai: 'fai', Arc: 'arc' } as const)[s.attr as 'Str' | 'Dex' | 'Int' | 'Fai' | 'Arc']
      if (key) scaling[key] = s.letter
    }
  }
  const tags = [seed.subtype, seed.skill].filter(Boolean) as string[]
  const name = canonicalName(seed.name)
  return {
    id: `${category}:${slug(name)}`,
    factId: factIdFor(category, name),
    name,
    category,
    subtype: seed.subtype ?? (category === 'shields' ? 'Shield' : 'Weapon'),
    region: undefined,
    campaign: campaignFlag(seed.dlc),
    dlc: seed.dlc,
    icon: iconForEntity(category, seed.name, index),
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

function buildWeapons(input: CatalogInput, index?: RecordIndex): { weapons: LibraryEntity[]; shields: LibraryEntity[]; weaponByName: Map<string, Weapon> } {
  const reps = representativeWeapons(input.weapons)
  const weaponByName = new Map<string, Weapon>()
  for (const [name, w] of reps) {
    weaponByName.set(norm(name), w)
    weaponByName.set(norm(w.name), w)
  }
  const rowCache = new Map<string, ReturnType<typeof toWeaponStatRow> | undefined>()
  const rowByName = (name: string) => {
    if (rowCache.has(name)) return rowCache.get(name)
    const key = norm(name)
    const w = reps.get(name) ?? weaponByName.get(key)
    const row = w ? toWeaponStatRow(w) : undefined
    rowCache.set(name, row)
    return row
  }
  const acqByName = acquisitionIndex(input.acquisitions)

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
    weapons.push(weaponEntity('weapons', seed, rowByName(seed.name), acqByName, index))
  }
  for (const s of input.fan.shields) {
    const seed: WeaponSeed = {
      name: s.name,
      subtype: s.category,
      weight: s.weight,
    }
    shields.push(weaponEntity('shields', seed, rowByName(s.name), acqByName, index))
  }
  return { weapons, shields, weaponByName }
}

// ---------------------------------------------------------------------------
// simple fanapi-backed categories
// ---------------------------------------------------------------------------

function baseEntity(category: CategoryId, rawName: string, extra: Partial<LibraryEntity> = {}, index?: RecordIndex): LibraryEntity {
  const name = canonicalName(rawName)
  return {
    id: `${category}:${slug(name)}`,
    factId: factIdFor(category, name),
    name,
    category,
    icon: iconForEntity(category, name, index),
    ...extra,
  }
}

function buildArmor(fan: FanapiData, index?: RecordIndex): LibraryEntity[] {
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
    }, index)
  })
}

function buildTalismans(fan: FanapiData, index?: RecordIndex): LibraryEntity[] {
  return fan.talismans.map((t) =>
    baseEntity('talismans', t.name, {
      subtype: 'Talisman',
      stats: [{ label: 'Effect', value: t.effect }],
      lore: t.effect,
    }, index),
  )
}

function buildSpells(fan: FanapiData, type: 'Sorcery' | 'Incantation', category: CategoryId, index?: RecordIndex): LibraryEntity[] {
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
      }, index)
    })
}

function buildAshes(fan: FanapiData, index?: RecordIndex): LibraryEntity[] {
  return fan.ashes.map((a) =>
    baseEntity('ashes', a.name, {
      subtype: a.affinity || 'Ash of War',
      stats: a.skill ? [{ label: 'Skill', value: a.skill }] : undefined,
      tags: [a.affinity, a.skill].filter(Boolean) as string[],
      lore: a.skill ? `Grants the skill ${a.skill}.` : undefined,
    }, index),
  )
}

function buildSpirits(fan: FanapiData, index?: RecordIndex): LibraryEntity[] {
  return fan.spirits.map((s) =>
    baseEntity('spirits', s.name, {
      subtype: 'Spirit Ash',
      stats: [
        { label: 'FP cost', value: String(s.fpCost) },
        { label: 'HP cost', value: String(s.hpCost) },
      ],
      lore: s.effect,
    }, index),
  )
}

function buildItems(fan: FanapiData, acquisitions: Acquisition[], index?: RecordIndex): LibraryEntity[] {
  const acqByName = acquisitionIndex(acquisitions)
  return fan.items.map((i) => {
    const acq = acqByName.get(norm(i.name))
    return baseEntity('items', i.name, {
      subtype: i.type && i.type !== '-' ? i.type : 'Item',
      stats: [{ label: 'Type', value: i.type || 'Item' }],
      tags: [i.type].filter((t) => t && t !== '-') as string[],
      where: acq?.location || acq?.near || undefined,
      lore: i.effect,
    }, index)
  })
}

// ---------------------------------------------------------------------------
// bosses
// ---------------------------------------------------------------------------

function buildBosses(input: CatalogInput, index?: RecordIndex): LibraryEntity[] {
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

  // Task 130 §2 — the canonical roster backs the Bosses category: every
  // encounter's boss appears even when FanAPI/armory never listed it, and the
  // roster's region / location / HP / drops fill any gap.
  for (const b of bossRoster) {
    const key = norm(b.name)
    const cur = seeds.get(key)
    if (cur) {
      if (!cur.region && b.region) cur.region = b.region
      if (!cur.location) cur.location = b.grace ? `${b.location} · ${b.grace}` : b.location
      if (!cur.hp && b.hp != null) cur.hp = String(b.hp)
      if (b.drops.length) cur.drops = [...new Set([...cur.drops, ...b.drops])]
    } else {
      seeds.set(key, {
        name: b.name,
        region: b.region,
        location: b.grace ? `${b.location} · ${b.grace}` : b.location,
        hp: b.hp == null ? undefined : String(b.hp),
        drops: b.drops,
        type: TIER_LABEL[b.tier],
      })
    }
  }

  const out: LibraryEntity[] = []
  for (const seed of seeds.values()) {
    const combat = combatByName.get(norm(seed.name))
    const stats: EntityStat[] = []
    // Task 137 §3 — the authoritative HP is the NpcParam base HP, clearly
    // labelled. A fan/roster HP is only a fallback and is marked as listed.
    if (combat) stats.push({ label: BASE_HP_LABEL, value: String(combat.baseHp) })
    else if (seed.hp) stats.push({ label: 'HP (listed)', value: seed.hp })
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
      }, index),
    )
  }
  return out
}

// ---------------------------------------------------------------------------
// npcs, locations, and the ripped-pack categories
// ---------------------------------------------------------------------------

function buildNpcs(fan: FanapiData, index: EntityRecord[]): LibraryEntity[] {
  const out: LibraryEntity[] = []
  const seen = new Set<string>()
  const push = (e: LibraryEntity) => {
    if (seen.has(e.id)) return
    seen.add(e.id)
    out.push(e)
  }
  for (const n of fan.npcs) {
    const stats: EntityStat[] = []
    if (n.role) stats.push({ label: 'Role', value: n.role })
    if (n.location) stats.push({ label: 'Location', value: n.location })
    push(baseEntity('npcs', n.name, {
      subtype: n.role || 'NPC',
      region: n.location,
      stats,
      tags: [n.role].filter(Boolean) as string[],
      where: n.location,
    }))
  }
  for (const rec of index) {
    if (rec.kind !== 'npc') continue
    const stats: EntityStat[] = []
    if (rec.stats?.Role) stats.push({ label: 'Role', value: rec.stats.Role })
    if (rec.stats?.Affiliation) stats.push({ label: 'Affiliation', value: rec.stats.Affiliation })
    if (rec.location) stats.push({ label: 'Location', value: rec.location })
    push(baseEntity('npcs', rec.name, {
      id: rec.id,
      factId: rec.id,
      subtype: rec.stats?.Role || 'NPC',
      region: rec.region || rec.location,
      icon: rec.image || iconForEntity('npcs', rec.name),
      stats,
      tags: [rec.stats?.Role].filter(Boolean) as string[],
      where: rec.location,
      lore: rec.description,
    }))
  }
  return out
}

function buildLocations(fan: FanapiData, index: EntityRecord[]): LibraryEntity[] {
  const out: LibraryEntity[] = []
  const seen = new Set<string>()
  const push = (e: LibraryEntity) => {
    if (seen.has(e.id)) return
    seen.add(e.id)
    out.push(e)
  }
  for (const l of fan.locations) {
    push(baseEntity('locations', l.name, {
      subtype: 'Location',
      region: l.region,
      stats: l.region ? [{ label: 'Region', value: l.region }] : undefined,
      tags: [l.region].filter(Boolean) as string[],
      where: l.region,
    }))
  }
  for (const rec of index) {
    if (rec.kind !== 'region') continue
    push(baseEntity('locations', rec.name, {
      id: rec.id,
      factId: rec.id,
      subtype: rec.stats?.Type || 'Location',
      region: rec.region || rec.location,
      icon: rec.image || iconForEntity('locations', rec.name),
      stats: rec.location ? [{ label: 'Region', value: rec.location }] : undefined,
      tags: [rec.location].filter(Boolean) as string[],
      where: rec.location,
      lore: rec.description,
    }))
  }
  return out
}

/**
 * Task 132 §4 — the Enemies category, straight from the entity index's 2,390
 * combat rows: HP, negation/resist, drops and the maps they spawn on.
 */
function buildEnemies(index: EntityRecord[]): LibraryEntity[] {
  return index
    .filter((rec) => rec.kind === 'enemy')
    .map((rec) => {
      const stats: EntityStat[] = []
      if (rec.stats?.HP) stats.push({ label: 'HP', value: rec.stats.HP })
      if (rec.stats?.Poise) stats.push({ label: 'Poise', value: rec.stats.Poise })
      if (rec.stats?.Negation) stats.push({ label: 'Negation', value: rec.stats.Negation })
      if (rec.stats?.['Status resist']) stats.push({ label: 'Status resist', value: rec.stats['Status resist'] })
      if (rec.drops?.length) stats.push({ label: 'Drops', value: rec.drops.join(' · ') })
      return baseEntity('enemies', rec.name, {
        id: rec.id,
        factId: rec.id,
        subtype: 'Enemy',
        region: rec.region,
        icon: rec.image || iconForEntity('enemies', rec.name),
        stats,
        tags: [rec.region].filter(Boolean) as string[],
        where: rec.location,
        lore: rec.strategy || rec.description,
      })
    })
}

/** Guide categories that are key items / crafting materials, not gear. */
const KEY_ITEM_CATEGORIES = new Set([
  'key-item', 'cookbook', 'bell-bearing', 'crystal-tear', 'golden-seed', 'great-rune',
  'larval-tear', 'map-fragment', 'memory-stone', 'remembrance', 'revered-spirit-ash',
  'sacred-tear', 'scadutree-fragment', 'stonesword-key', 'tool', 'whetblade',
])

/** Task 132 §4 — Key Items / Materials from the guide catalogue's own categories. */
function buildMaterials(guideItems: GuideItem[], index?: RecordIndex): LibraryEntity[] {
  return guideItems
    .filter((g) => g.category && KEY_ITEM_CATEGORIES.has(g.category))
    .map((g) =>
      baseEntity('materials', g.name, {
        subtype: g.category,
        dlc: g.dlc,
        campaign: campaignFlag(g.dlc),
        stats: [{ label: 'How', value: g.how }].filter((s) => s.value),
        tags: [g.category, g.world].filter(Boolean) as string[],
        where: g.how,
        lore: g.missable ? `${g.how} Missable.` : g.how,
      }, index),
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
  // Task 196 §1 — one id -> record map so every builder can prefer a card's own
  // enriched picture (game icon / local image) over the name lookup.
  const index = buildRecordIndex(input.index)
  const { weapons, shields, weaponByName } = buildWeapons(input, index)
  const armor = buildArmor(input.fan, index)
  const talismans = buildTalismans(input.fan, index)
  const sorceries = buildSpells(input.fan, 'Sorcery', 'sorceries', index)
  const incantations = buildSpells(input.fan, 'Incantation', 'incantations', index)
  const ashes = buildAshes(input.fan, index)
  const spirits = buildSpirits(input.fan, index)
  const items = buildItems(input.fan, input.acquisitions, index)
  const bosses = buildBosses(input, index)
  const enemies = buildEnemies(input.index ?? [])
  const npcs = buildNpcs(input.fan, input.index ?? [])
  const locations = buildLocations(input.fan, input.index ?? [])
  const materials = buildMaterials(input.guideItems ?? [], index)
  const recipes = buildRecipes(input.recipes)
  const secrets = buildSecrets(input.secrets)
  const guides = buildGuides(input.guides)
  const mechanics = buildMechanics()
  const dialogue = buildDialogue(input.dialogue)
  const entities: LibraryEntity[] = [
    ...weapons,
    ...shields,
    ...armor,
    ...talismans,
    ...sorceries,
    ...incantations,
    ...ashes,
    ...spirits,
    ...items,
    ...bosses,
    ...enemies,
    ...npcs,
    ...locations,
    ...materials,
    ...recipes,
    ...secrets,
    ...guides,
    ...mechanics,
    ...dialogue,
  ]
  // Task 126 §3 — the raw FanAPI/guide dumps carry duplicate rows (identical
  // names, occasionally a differing region). React keys and the compare tray use
  // `id`, so collapse duplicates by id here, keeping the first record and
  // unioning tags so no tag is lost.
  const deduped: LibraryEntity[] = []
  const seen = new Map<string, LibraryEntity>()
  for (const e of entities) {
    const prev = seen.get(e.id)
    if (prev) {
      if (e.tags?.length) prev.tags = [...new Set([...(prev.tags ?? []), ...e.tags])]
      continue
    }
    seen.set(e.id, e)
    deduped.push(e)
  }
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.id, [] as LibraryEntity[]])) as Record<CategoryId, LibraryEntity[]>
  for (const e of deduped) byCategory[e.category].push(e)
  for (const list of Object.values(byCategory)) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return { entities: deduped, byCategory, weaponByName }
}

/**
 * The catalogue is rebuilt only when one of its source datasets changes. The
 * hook memoises the build, but the datasets can arrive as fresh identity-equal
 * arrays (and a future dep can slip in), so this one-entry cache is the cheap
 * guarantee: an interaction like a rail click re-renders without paying the
 * multi-second catalogue cost (Task 185 §1). It keys on the exact references
 * `useLibraryCatalog` passes, not on deep equality.
 */
let cachedBuildInput: CatalogInput | null = null
let cachedBuildResult: BuiltCatalog | null = null

function sameCatalogInput(a: CatalogInput, b: CatalogInput): boolean {
  return (
    a.fan === b.fan &&
    a.armoryWeapons === b.armoryWeapons &&
    a.armoryBosses === b.armoryBosses &&
    a.weapons === b.weapons &&
    a.recipes === b.recipes &&
    a.secrets === b.secrets &&
    a.acquisitions === b.acquisitions &&
    a.guides === b.guides &&
    a.bossCombat === b.bossCombat &&
    a.dialogue === b.dialogue &&
    a.index === b.index &&
    a.guideItems === b.guideItems
  )
}

/** `buildCatalog` with a reference-keyed cache; see the note above. */
export function cachedBuildCatalog(input: CatalogInput): BuiltCatalog {
  if (cachedBuildInput && cachedBuildResult && sameCatalogInput(cachedBuildInput, input)) {
    return cachedBuildResult
  }
  const built = buildCatalog(input)
  cachedBuildInput = input
  cachedBuildResult = built
  return built
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
export function useLibraryCatalog(activeCategory: CategoryId, preload = false): LibraryCatalog {
  const fan = useFanapiData()
  const { weapons: armoryWeapons, bosses: armoryBosses } = useArmory()
  const { items: guideItems } = useGuide()
  // Task 132 §4 — NPCs/locations/enemies/key items come from the enriched index.
  ensureEntityIndex()
  const { ready: indexReady, version: indexVersion } = useEntityIndex()

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
    const want = (id: CategoryId) => preload || activeCategory === id
    if (want('bosses') && bossCombat.length === 0) {
      void loadBossCombat()
        .then((rows) => { if (!cancelled) setBossCombat(rows) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('bosses') })
    }
    if (want('recipes') && recipes.length === 0) {
      void loadRecipes()
        .then((d) => { if (!cancelled) setRecipes(d.recipes) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('recipes') })
    }
    if (want('secrets') && secrets.length === 0) {
      void loadSecrets()
        .then((d) => { if (!cancelled) setSecrets(d.walls) })
        .catch(() => { /* optional */ })
        .finally(() => { if (!cancelled) markSettled('secrets') })
    }
    if (want('guides') && guides.length === 0) {
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
    if (want('dialogue') && dialogue.length === 0) {
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
  }, [activeCategory, preload, bossCombat.length, recipes.length, secrets.length, guides.length, acquisitions.length, dialogue.length])

  // Task 97: fold the loaded async reference data into the shared entity graph,
  // so the universal entity panel's edges agree with the Library browser.
  useEffect(() => {
    registerEntityGraphData({
      bossCombat: bossCombat.length ? bossCombat : undefined,
      recipes: recipes.length ? recipes : undefined,
      acquisitions: acquisitions.length ? acquisitions : undefined,
    })
  }, [bossCombat, recipes, acquisitions])

  // The catalogue contents only depend on the reference datasets, NOT on which
  // category the user is browsing. Keeping `activeCategory` out of this memo
  // means switching category (or a rail click) never re-runs the 2.5 s build.
  const built = useMemo(
    () =>
      cachedBuildCatalog({
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
        index: indexReady ? allRecords() : [],
        guideItems,
      }),
    [fan, armoryWeapons, armoryBosses, weapons, recipes, secrets, acquisitions, guides, bossCombat, dialogue, guideItems, indexReady, indexVersion],
  )

  const { loading, pending } = useMemo(() => {
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
      (activeCategory === 'dialogue' && dialogue.length === 0 && !settled.has('dialogue')) ||
      (activeCategory === 'enemies' && !indexReady) ||
      (activeCategory === 'materials' && guideItems.length === 0)
    const loading = built.byCategory[activeCategory].length === 0 && (!coreReady || lazyPending)
    // A category is pending while its own loader (or the shared entity index)
    // has not finished. The rail must not hide these as "empty" (Task 137 §1).
    const pending = new Set<CategoryId>()
    if (!indexReady) {
      pending.add('enemies')
      pending.add('npcs')
      pending.add('locations')
    }
    if (guideItems.length === 0) pending.add('materials')
    for (const id of ['bosses', 'recipes', 'secrets', 'guides', 'dialogue'] as CategoryId[]) {
      if (!settled.has(id)) pending.add(id)
    }
    return { loading, pending }
  }, [activeCategory, built, settled, indexReady, weapons.length, bossCombat.length, recipes.length, secrets.length, guides.length, dialogue.length, guideItems.length, fan])

  const catalog = useMemo(() => ({ ...built, loading, pending }), [built, loading, pending])

  // Task 115: let peek cards show the same numeric rows the Library has.
  useEffect(() => {
    registerPeekCatalog({ entities: built.entities, weaponByName: built.weaponByName, arFor: weaponAr })
  }, [built])

  // Task 122 §C: register every Library catalogue entity in the shared graph so
  // a name that lives only in the browser (armor, extra weapons/talismans, …)
  // gets a peek card and an entity page like any authored fact.
  useEffect(() => {
    registerEntityGraphData({
      entities: built.entities
        .filter((e) => CATALOG_KIND[e.category])
        .map((e) => ({
          id: e.factId || e.id,
          kind: CATALOG_KIND[e.category] as EntityKind,
          name: e.name,
          summary: e.lore || e.where || e.region || e.subtype,
          icon: e.icon,
        })),
    })
  }, [built])

  return catalog
}

/** Exposed for tests: the empty catalogue shape. */
export const EMPTY_CATALOG_INPUT = EMPTY_INPUT
