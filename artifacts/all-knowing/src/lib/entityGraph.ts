import { byId, facts, normalize, type Fact } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { loot, type LootKind } from '../knowledge/loot'
import { remembrances } from '../knowledge/remembrances'
import { gates, gateState } from '../knowledge/gates'
import { chainsFor } from '../knowledge/inferChains'
import { allLines } from '../knowledge/storylines'
import { dungeons } from '../knowledge/dungeons'
import { dungeons as dungeonIndex, dungeonBosses } from './dungeons'
import { opBuilds } from '../knowledge/builds'
import { merchants } from '../knowledge/merchants'
import { npcLocations } from '../knowledge/npcLocations'
import { mechanics } from '../knowledge/mechanics'
import type { Character } from '../types'
import { canonicalFactId } from './aliases'
import { linkIndex, linkify } from './interlink'
import { iconFor } from './sourcePack'
import { allRecords, getEntityIndexVersion, getRecord } from './entityIndex'
import bossRoster from '../data/bosses.json'

/**
 * Task 97 — the one entity graph.
 *
 * Every entity the app knows is `kind:slug`; `getEntity` resolves it through
 * `canonicalFactId` and the alias plane, `edges` walks the relationship types in
 * `docs/USAGE-MODEL.md` §2, and `status` says where the current character stands.
 * The indexes are built once, lazily, from the reference data the repo already
 * ships; async datasets (combat, recipes, acquisition, shops) can be folded in
 * with `registerEntityGraphData` when a screen has loaded them.
 *
 * This module is the id authority: `canonicalEntityId` is what `library/catalog`
 * routes its synthesised `item:uchigatana`-style ids through, so ownership,
 * links, and the `Related` graph all agree.
 */

// ---------------------------------------------------------------------------
// Entity shape
// ---------------------------------------------------------------------------

/** Every kind named in `docs/USAGE-MODEL.md` §2. */
export type EntityKind =
  | 'weapon'
  | 'shield'
  | 'armor'
  | 'talisman'
  | 'spell'
  | 'ash'
  | 'spirit'
  | 'item'
  | 'material'
  | 'boss'
  | 'enemy'
  | 'npc'
  | 'grace'
  | 'region'
  | 'dungeon'
  | 'quest'
  | 'gate'
  | 'ending'
  | 'build'
  | 'merchant'
  | 'mechanic'

export type EntitySummary = {
  id: string
  kind: EntityKind
  name: string
  icon?: string
  summary: string
}

/** Authored relationship types; reverse edges are derived automatically. */
export type EdgeRel =
  | 'drops'
  | 'soldBy'
  | 'foundIn'
  | 'requires'
  | 'unlocks'
  | 'locks'
  | 'partOfQuest'
  | 'nextBeat'
  | 'weakTo'
  | 'resists'
  | 'goodForBuild'
  | 'craftedFrom'
  | 'tradedFor'
  | 'upgradeMaterial'
  | 'relatedLore'

/** The derived mirror of an authored relationship. */
export type EdgeRelInverse =
  | 'droppedBy'
  | 'sells'
  | 'contains'
  | 'lockedBy'
  | 'containsBeat'
  | 'previousBeat'
  | 'goodFor'
  | 'craftedInto'
  | 'upgrades'

export type AnyEdgeRel = EdgeRel | EdgeRelInverse

export type Edge = {
  rel: AnyEdgeRel
  to: string
  label: string
  source: string
}

export type EntityState = 'done' | 'owned' | 'available' | 'ahead' | 'locked' | 'missed' | 'unknown'

const INVERSE: Record<EdgeRel, AnyEdgeRel> = {
  drops: 'droppedBy',
  soldBy: 'sells',
  foundIn: 'contains',
  requires: 'unlocks',
  unlocks: 'requires',
  locks: 'lockedBy',
  partOfQuest: 'containsBeat',
  nextBeat: 'previousBeat',
  weakTo: 'weakTo',
  resists: 'resists',
  goodForBuild: 'goodFor',
  craftedFrom: 'craftedInto',
  tradedFor: 'tradedFor',
  upgradeMaterial: 'upgrades',
  relatedLore: 'relatedLore',
}

// ---------------------------------------------------------------------------
// Optional data folded in once a screen has fetched it
// ---------------------------------------------------------------------------

export type CombatRow = {
  factId?: string
  name: string
  negation?: Record<string, number>
}

export type AcquisitionRow = {
  name: string
  location: string
  near?: string
  missable?: boolean
}

export type RecipeRow = {
  id?: string
  name: string
  materials: { name: string; qty?: number }[]
}

export type ShopRow = {
  id?: string
  vendor: string
  item: string
}

/**
 * An entity the caller already knows about (the Library catalogue builds one
 * per row). Task 122 §C folds these into the graph so every Library/Gear/Build
 * name resolves as a real entity, not a stub.
 */
export type RegisteredEntity = {
  id: string
  kind: EntityKind
  name: string
  summary?: string
  icon?: string
  aliases?: string[]
}

export type EntityGraphSupplement = {
  bossCombat?: CombatRow[]
  enemyCombat?: CombatRow[]
  recipes?: RecipeRow[]
  acquisitions?: AcquisitionRow[]
  shops?: ShopRow[]
  entities?: RegisteredEntity[]
}

let supplement: EntityGraphSupplement = {}
let version = 0

/** Fold an async-loaded dataset into the graph. Safe to call repeatedly. */
export function registerEntityGraphData(data: EntityGraphSupplement): void {
  supplement = {
    bossCombat: data.bossCombat ?? supplement.bossCombat ?? [],
    enemyCombat: data.enemyCombat ?? supplement.enemyCombat ?? [],
    recipes: data.recipes ?? supplement.recipes ?? [],
    acquisitions: data.acquisitions ?? supplement.acquisitions ?? [],
    shops: data.shops ?? supplement.shops ?? [],
    entities: data.entities ?? supplement.entities ?? [],
  }
  version++
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DAMAGE_LABELS: Record<string, string> = {
  physical: 'Physical',
  magic: 'Magic',
  fire: 'Fire',
  lightning: 'Lightning',
  holy: 'Holy',
}

function damageLabel(type: string): string {
  return DAMAGE_LABELS[type] ?? type
}

function isUpgradeMaterial(name: string): boolean {
  return /smithing stone|glovewort|whetblade/i.test(name)
}

function lootKind(kind: LootKind): EntityKind {
  switch (kind) {
    case 'sorcery':
    case 'incantation':
      return 'spell'
    case 'weapon':
      return 'weapon'
    case 'talisman':
      return 'talisman'
    case 'ash':
      return 'ash'
    case 'spirit':
      return 'spirit'
    default:
      return 'item'
  }
}

function prefixKind(id: string): EntityKind {
  const prefix = id.split(':')[0]
  switch (prefix) {
    case 'boss':
    case 'bossflag':
    case 'invader':
    case 'hunt':
    case 'area':
      return 'boss'
    case 'grace':
    case 'point':
      return 'grace'
    case 'region':
      return 'region'
    case 'quest':
    case 'line':
      return 'quest'
    case 'gate':
      return 'gate'
    case 'merchant':
      return 'merchant'
    case 'build':
      return 'build'
    case 'npc':
      return 'npc'
    case 'enemy':
      return 'enemy'
    case 'damage':
    case 'mechanic':
      return 'mechanic'
    case 'dungeon':
      return 'dungeon'
    case 'loot':
      return 'item'
    default:
      return 'item'
  }
}

function iconForKind(kind: EntityKind, name: string): string | undefined {
  if (kind === 'boss') return iconFor(name, 'boss').url
  if (kind === 'grace') return iconFor(name, 'grace').url
  if (kind === 'npc') return iconFor(name, 'npc').url
  if (kind === 'dungeon') return iconFor(name, 'dungeon').url
  return undefined
}

// ---------------------------------------------------------------------------
// Index (lazy, memoised)
// ---------------------------------------------------------------------------

type Index = {
  entities: Map<string, EntitySummary>
  /** Normalised display name / alias -> canonical entity id. */
  byName: Map<string, string>
  /** Alternate id (engine row, loot row) -> canonical entity id. */
  idAlias: Map<string, string>
  /** Canonical id -> every edge, forward and reverse. */
  adjacency: Map<string, Edge[]>
}

let cachedIndex: Index | null = null
let cachedVersion = -1
let cachedEnrichVersion = -1

/** Kinds a `drops` / `sells` edge may honestly point at (Task 160). */
const OWNED_EDGE_KINDS = new Set<EntityKind>([
  'item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material',
])

/** Kinds a `foundIn` place edge may honestly point at (Task 160). */
const PLACE_EDGE_KINDS = new Set<EntityKind>(['region', 'grace', 'dungeon'])

function ensureIndex(): Index {
  // Task 122 §C: the enrichment index is a second source of entities, so the
  // cache keys on both the supplement version and the index version.
  const enrichVersion = getEntityIndexVersion()
  if (cachedIndex && cachedVersion === version && cachedEnrichVersion === enrichVersion) return cachedIndex
  cachedIndex = buildIndex()
  cachedVersion = version
  cachedEnrichVersion = enrichVersion
  return cachedIndex
}

function kindForFact(f: Fact, lootKindByName: Map<string, EntityKind>): EntityKind {
  if (f.kind === 'boss') return 'boss'
  if (f.kind === 'grace') return 'grace'
  if (f.kind === 'region') return 'region'
  if (f.kind === 'quest') return 'quest'
  const refined = lootKindByName.get(normalize(f.name))
  return refined ?? (isUpgradeMaterial(f.name) ? 'material' : 'item')
}

function factSummary(f: Fact): string {
  if (f.note) return f.note
  const bits = [f.region, f.campaign === 'base' ? '' : f.campaign].filter(Boolean)
  return bits.length ? bits.join(' · ') : f.name
}

function buildIndex(): Index {
  const entities = new Map<string, EntitySummary>()
  const byName = new Map<string, string>()
  const idAlias = new Map<string, string>()

  // Task 132 §2 — when two kinds share a display name, the character kinds win
  // in the order npc > boss > region/grace/dungeon > quest > enemy, so e.g.
  // "Patches" opens the NPC (with combat stats merged in) rather than a bare
  // invader row.
  // Task 160 — a place name is owned by the place, not by a quest line whose
  // alias happens to be that place ("Weeping Peninsula" -> line:irina), and an
  // ownable item outranks the same-named mechanics glossary card ("Rune Arc").
  const NAME_PRIORITY: Record<string, number> = {
    npc: 0,
    boss: 1,
    region: 1.5,
    grace: 1.5,
    dungeon: 1.5,
    quest: 2,
    enemy: 3,
    item: 4,
    weapon: 4,
    shield: 4,
    armor: 4,
    talisman: 4,
    spell: 4,
    ash: 4,
    spirit: 4,
    material: 4,
  }
  const namePriority = (kind: EntityKind): number => NAME_PRIORITY[kind] ?? 5

  const addEntity = (entity: EntitySummary, aliases: string[] = [], registerName = true) => {
    const existing = entities.get(entity.id)
    if (!existing) entities.set(entity.id, entity)
    else if (existing.kind === 'item' && entity.kind !== 'item') {
      entities.set(entity.id, { ...existing, kind: entity.kind, summary: existing.summary || entity.summary })
    }
    if (!registerName) return
    for (const raw of [entity.name, ...aliases]) {
      const n = normalize(raw)
      if (!n) continue
      const owner = byName.get(n)
      if (!owner) {
        byName.set(n, entity.id)
        continue
      }
      const existingOwner = entities.get(owner)
      if (existingOwner && namePriority(entity.kind) < namePriority(existingOwner.kind)) byName.set(n, entity.id)
    }
  }

  // --- catalog facts -------------------------------------------------------
  const lootKindByName = new Map<string, EntityKind>()
  for (const l of loot) lootKindByName.set(normalize(l.name), lootKind(l.kind))

  for (const f of facts) {
    const extra = f.kind === 'region' ? [f.region] : []
    addEntity(
      {
        id: f.id,
        kind: kindForFact(f, lootKindByName),
        name: f.name,
        icon: iconForKind(kindForFact(f, lootKindByName), f.name),
        summary: factSummary(f),
      },
      [...f.aliases, ...extra],
    )
  }

  // --- warp graces ---------------------------------------------------------
  for (const g of warpGraces) {
    addEntity(
      { id: g.id, kind: 'grace', name: g.name, icon: iconForKind('grace', g.name), summary: g.region },
      g.aliases,
    )
  }

  // --- loot rows -----------------------------------------------------------
  for (const l of loot) {
    const canonical = byName.get(normalize(l.name)) ?? canonicalFactId(`item:${slug(l.name)}`, l.name)
    if (canonical !== l.id) idAlias.set(l.id, canonical)
    addEntity(
      {
        id: canonical,
        kind: lootKind(l.kind),
        name: l.name,
        icon: iconForKind(lootKind(l.kind), l.name),
        summary: l.how || l.region,
      },
      l.aliases,
    )
  }

  // --- remembrances --------------------------------------------------------
  for (const r of remembrances) {
    addEntity(
      { id: r.id, kind: 'item', name: r.name, summary: `Trade at Enia for ${r.rewards.map((w) => w.name).join(' / ')}` },
      r.aliases,
    )
  }

  // --- gates ---------------------------------------------------------------
  for (const g of gates) {
    addEntity({ id: g.id, kind: 'gate', name: g.name, summary: 'Point of no return' }, g.aliases)
  }

  // --- quest lines + beats -------------------------------------------------
  for (const line of allLines) {
    const lineId = `line:${line.id}`
    addEntity(
      {
        id: lineId,
        kind: line.kind === 'ending' ? 'ending' : 'quest',
        name: line.name,
        summary: `${line.steps.length} beats`,
      },
      line.aliases,
    )
    for (const step of line.steps) {
      const beatId = step.factId || `line:${line.id}:${step.id}`
      // A step can name a real item/boss as its beat (e.g. item:fingerslayer);
      // never let the beat row reclassify the authored fact.
      if (!entities.has(beatId)) addEntity({ id: beatId, kind: 'quest', name: step.do, summary: step.detail }, [], false)
    }
  }
  // Task 138 §3 — a step's grants / lockouts / requirements are real fact ids
  // too. Register the ones that have no row yet so a lockout warning or a plan
  // step never renders a dead EntityLink. This runs after EVERY line's beats are
  // in, so a flag another line owns as a beat keeps that beat's name. Names stay
  // out of the glossary (registerName=false) — these are state flags.
  const lockName = new Map<string, string>()
  for (const g of gates) for (const l of g.locks) if (l.name && !lockName.has(l.factId)) lockName.set(l.factId, l.name)
  for (const line of allLines) {
    for (const step of line.steps) {
      for (const ref of [...(step.grants ?? []), ...(step.lockouts ?? []), ...(step.requires ?? []), ...(step.factIds ?? [])]) {
        if (entities.has(ref) || byName.has(normalize(ref))) continue
        addEntity({ id: ref, kind: prefixKind(ref), name: lockName.get(ref) ?? flagName(ref), summary: `${line.name} — ${step.do}` }, [], false)
      }
    }
  }

  // --- dungeons, builds, merchants, NPCs -----------------------------------
  for (const d of dungeons) {
    addEntity({ id: `dungeon:${d.id}`, kind: 'dungeon', name: d.name, summary: d.region })
  }
  // Task 104: the complete generated dungeon index and every boss it names.
  for (const d of dungeonIndex) {
    addEntity({ id: `dungeon:${d.id}`, kind: 'dungeon', name: d.name, icon: iconForKind('dungeon', d.name), summary: d.region })
  }
  for (const b of dungeonBosses) {
    addEntity({ id: b.id, kind: 'boss', name: b.name, summary: 'Dungeon boss' })
  }
  // Task 130: the canonical boss roster registers every encounter's fact id so
  // Setup, progress, the Area hub and the Library share one boss authority.
  for (const b of bossRoster as { id: string; name: string; region: string; location: string; group?: string; about?: string | null }[]) {
    if (b.group) {
      // One encounter of a boss fought in several places: its own page, named by
      // place, and the shared boss page it belongs to.
      if (!entities.has(b.group)) addEntity({ id: b.group, kind: 'boss', name: b.name, summary: 'Fought in several places' })
      addEntity({ id: b.id, kind: 'boss', name: `${b.name} (${b.location})`, summary: b.about || b.region })
      continue
    }
    addEntity({ id: b.id, kind: 'boss', name: b.name, summary: b.region })
  }
  for (const b of opBuilds) {
    addEntity({ id: b.id, kind: 'build', name: b.name, summary: b.why }, [b.tag])
  }
  for (const m of merchants) {
    addEntity({ id: `merchant:${slug(m.vendor)}`, kind: 'merchant', name: m.vendor, summary: 'Merchant' })
  }
  for (const n of npcLocations) {
    // Graces are added above, so the grace's name is known here — never print its raw id.
    const grace = entities.get(n.graceId)?.name ?? warpGraces.find((g) => g.id === n.graceId)?.name
    addEntity({ id: `npc:${n.npc}`, kind: 'npc', name: n.name, summary: n.note || (grace ? `Found at ${grace}` : 'Location not recorded') }, n.aliases)
  }

  // --- synthetic damage types ----------------------------------------------
  for (const type of Object.keys(DAMAGE_LABELS)) {
    addEntity({ id: `damage:${type}`, kind: 'mechanic', name: damageLabel(type), summary: 'Damage type' })
  }

  // --- mechanics glossary (Task 106) ---------------------------------------
  // Each authored card is a real entity so any mention of "poise" or "Rune Arc"
  // links to its reference page. Authored catalog entities are added first, so a
  // mechanic name or alias can never shadow a real item/boss/grace.
  for (const m of mechanics) {
    addEntity({ id: m.id, kind: 'mechanic', name: m.title, summary: m.body }, m.aliases)
  }

  // --- Library catalogue registration (Task 122 §C) ------------------------
  // The Library builder hands the graph one row per catalogue entity. Add them
  // after the authored data so a real fact id + name always wins, but before the
  // enrichment index so the index can still upgrade an `item:` row's kind.
  for (const e of supplement.entities ?? []) {
    addEntity(
      { id: e.id, kind: e.kind, name: e.name, icon: e.icon, summary: e.summary ?? '' },
      e.aliases ?? [],
    )
  }

  // --- enrichment index registration (Task 122 §C) -------------------------
  // `public/sourced/entity-index.json` carries one record per canonical entity,
  // including every armor piece the graph previously lacked. Once the index has
  // been installed by `entityEnrich.ts`, register each record as a graph entity
  // so `hasEntity`, search, Related edges and the coverage guard all see it.
  for (const record of allRecords()) {
    addEntity({
      id: record.id,
      kind: record.kind as EntityKind,
      name: record.name,
      icon: record.image,
      summary: record.description || record.location || '',
    })
  }

  // --- async supplements ---------------------------------------------------
  const resolve = (name: string, prefix = 'item'): string =>
    byName.get(normalize(name)) ?? canonicalFactId(`${prefix}:${slug(name)}`, name)

  const ensure = (id: string, kind: EntityKind, name: string, summary: string) => {
    if (!entities.has(id)) addEntity({ id, kind, name, summary })
  }

  for (const a of supplement.acquisitions ?? []) {
    const id = resolve(a.name)
    ensure(id, isUpgradeMaterial(a.name) ? 'material' : 'item', a.name, a.location)
  }

  for (const r of supplement.recipes ?? []) {
    const id = resolve(r.name)
    ensure(id, 'item', r.name, `Crafting recipe (${r.materials.length} materials)`)
  }

  const shopVendors = new Set<string>()
  for (const s of supplement.shops ?? []) shopVendors.add(s.vendor)
  for (const vendor of shopVendors) {
    ensure(`merchant:${slug(vendor)}`, 'merchant', vendor, 'Merchant')
  }

  for (const row of [...(supplement.bossCombat ?? []), ...(supplement.enemyCombat ?? [])]) {
    const id = row.factId ? canonicalFactId(row.factId) : resolve(row.name, 'boss')
    ensure(id, row.factId?.startsWith('enemy:') ? 'enemy' : 'boss', row.name, 'Combat profile')
  }

  // -------------------------------------------------------------------------
  // Edges
  // -------------------------------------------------------------------------

  // Task 160 — a drop / merchant stock string names an *item*, not whatever
  // same-named reference card (a mechanic, a quest line) won the name index.
  // Resolve such strings only against ownable entities, then fall back to the
  // item id the string would canonicalise to.
  const ownedByName = new Map<string, string>()
  for (const [id, entity] of entities) {
    if (!OWNED_EDGE_KINDS.has(entity.kind)) continue
    const n = normalize(entity.name)
    if (n && !ownedByName.has(n)) ownedByName.set(n, id)
  }
  const resolveOwned = (name: string): string | undefined => {
    const direct = ownedByName.get(normalize(name))
    if (direct) return direct
    const candidate = canonicalFactId(`item:${slug(name)}`, name)
    const entity = entities.get(candidate)
    if (entity && OWNED_EDGE_KINDS.has(entity.kind)) return candidate
    return undefined
  }
  const resolvePlace = (name: string): string | undefined => {
    const id = byName.get(normalize(name))
    const entity = id ? entities.get(id) : undefined
    return entity && PLACE_EDGE_KINDS.has(entity.kind) ? id : undefined
  }

  const forward = new Map<string, Edge[]>()
  const push = (from: string, edge: Edge) => {
    const list = forward.get(from)
    if (!list) forward.set(from, [edge])
    else if (!list.some((e) => e.rel === edge.rel && e.to === edge.to)) list.push(edge)
  }
  const canon = (id: string, name?: string): string => {
    const alias = idAlias.get(id)
    if (alias) return alias
    if (entities.has(id)) return id
    if (name) {
      const hit = byName.get(normalize(name))
      if (hit) return hit
    }
    const c = canonicalFactId(id, name)
    const a2 = idAlias.get(c)
    if (a2) return a2
    if (entities.has(c)) return c
    if (name) {
      const hit = byName.get(normalize(name))
      if (hit) return hit
    }
    return c
  }
  const nameOf = (id: string): string => {
    const e = entities.get(canon(id))
    return e?.name ?? (id.replace(/^[a-z]+:/, '').replace(/-/g, ' ') || id)
  }

  // catalog: requires, drops, region
  for (const f of facts) {
    for (const x of f.implies) push(f.id, { rel: 'requires', to: canon(x), label: nameOf(x), source: 'catalog' })
    for (const x of f.drops ?? []) push(f.id, { rel: 'drops', to: canon(x), label: nameOf(x), source: 'catalog' })
    const region = f.region ? resolvePlace(f.region) : undefined
    if (region && region !== f.id) push(f.id, { rel: 'foundIn', to: region, label: f.region, source: 'catalog' })
  }

  // Task 138 §3 — edges the enrichment index already carries, folded into the
  // graph so Related/Where and the coverage guard can traverse them. Only data
  // that exists is wired; nothing is inferred or invented here.
  const locationTargets: { n: string; id: string; name: string }[] = []
  for (const [n, id] of byName) {
    const kind = entities.get(id)?.kind
    if (kind !== 'region' && kind !== 'grace' && kind !== 'dungeon') continue
    if (n.length >= 4) locationTargets.push({ n, id, name: entities.get(id)?.name ?? n })
  }
  for (const record of allRecords()) {
    const from = record.id
    if (record.region) {
      const regionId = byName.get(normalize(record.region))
      if (regionId && regionId !== from && entities.get(regionId)?.kind === 'region') {
        push(from, { rel: 'foundIn', to: canon(regionId), label: record.region, source: 'entity-index' })
      }
    }
    if (record.location) {
      const text = normalize(record.location)
      let best: { id: string; name: string; len: number } | null = null
      for (const target of locationTargets) {
        if (target.id === from || !text.includes(target.n)) continue
        if (!best || target.n.length > best.len) best = { id: target.id, name: target.name, len: target.n.length }
      }
      if (best) push(from, { rel: 'foundIn', to: canon(best.id), label: best.name, source: 'entity-index' })
    }
    for (const drop of record.drops ?? []) {
      const to = resolveOwned(drop)
      if (to && to !== from) push(from, { rel: 'drops', to: canon(to), label: drop, source: 'entity-index' })
    }
  }

  // loot: where it is found
  for (const l of loot) {
    const itemId = idAlias.get(l.id) ?? canon(l.id)
    const region = resolvePlace(l.region)
    if (region && region !== itemId) push(itemId, { rel: 'foundIn', to: region, label: l.region, source: 'loot' })
    if (l.grace) push(itemId, { rel: 'foundIn', to: canon(l.grace), label: `Near ${nameOf(l.grace)}`, source: 'loot' })
  }

  // merchants: sold by
  for (const m of merchants) {
    const merchantId = `merchant:${slug(m.vendor)}`
    for (const stock of m.stock) {
      const itemId = resolveOwned(stock)
      if (itemId) push(itemId, { rel: 'soldBy', to: merchantId, label: m.vendor, source: 'merchants' })
    }
  }
  for (const s of supplement.shops ?? []) {
    const itemId = resolveOwned(s.item)
    if (itemId) push(itemId, { rel: 'soldBy', to: `merchant:${slug(s.vendor)}`, label: s.vendor, source: 'shops' })
  }

  // remembrances: dropped by the boss, traded at Enia
  for (const r of remembrances) {
    if (r.bossFactId) {
      push(canon(r.bossFactId), { rel: 'drops', to: canon(r.id), label: r.name, source: 'remembrances' })
    }
    for (const reward of r.rewards) {
      let to = reward.factId ? canon(reward.factId) : resolveOwned(reward.name)
      // A reward name the shipped index has not registered yet is still an item
      // Enia trades for, so register it rather than dropping the edge.
      if (!to) {
        to = canonicalFactId(`item:${slug(reward.name)}`, reward.name)
        ensure(to, 'item', reward.name, 'Remembrance reward')
      }
      // Task 160 — a reward string that matches no ownable entity ("Land of
      // Shadow" resolves to a region) is a label, not a trade; do not emit a
      // `tradedFor` edge to the wrong kind.
      if (!OWNED_EDGE_KINDS.has(entities.get(to)?.kind ?? 'region')) continue
      push(r.id, { rel: 'tradedFor', to, label: reward.name, source: 'remembrances' })
    }
  }

  // gates: locks
  for (const g of gates) {
    for (const lock of g.locks) {
      push(g.id, { rel: 'locks', to: canon(lock.factId), label: lock.name, source: 'gates' })
    }
  }

  // quest lines: partOfQuest + nextBeat
  for (const line of allLines) {
    const lineId = `line:${line.id}`
    const beats = line.steps.map((step) => (step.factId ? canon(step.factId) : `line:${line.id}:${step.id}`))
    line.steps.forEach((_step, i) => {
      const beat = beats[i]
      push(beat, { rel: 'partOfQuest', to: lineId, label: line.name, source: 'storylines' })
      if (i + 1 < beats.length) {
        push(beat, { rel: 'nextBeat', to: beats[i + 1], label: line.steps[i + 1].do, source: 'storylines' })
      }
    })
  }

  // builds: good for build (and register the kit piece with its real kind)
  const SLOT_KIND: Record<string, EntityKind> = {
    armament: 'weapon',
    shield: 'shield',
    catalyst: 'weapon',
    armor: 'armor',
    talisman: 'talisman',
    ash: 'ash',
  }
  for (const b of opBuilds) {
    for (const slot of b.kit) {
      // Task 160 — a kit slot names an ownable piece; resolve it only against
      // owned kinds so a same-named quest line ("Nagakiba") cannot claim it.
      const to = resolveOwned(slot.name) ?? canonicalFactId(`item:${slug(slot.name)}`, slot.name)
      ensure(to, SLOT_KIND[slot.kind] ?? 'item', slot.name, 'Build item')
      push(b.id, { rel: 'goodForBuild', to: canon(to), label: slot.name, source: 'builds' })
    }
    for (const need of b.need) {
      const to = canon(need)
      const entity = entities.get(to)
      // A build need that is the boss guarding the piece (or a quest step) is a
      // requirement, not loot: keep the honest relationship instead of calling a
      // boss "good for" the build.
      const rel: EdgeRel = entity && OWNED_EDGE_KINDS.has(entity.kind) ? 'goodForBuild' : 'requires'
      push(b.id, { rel, to, label: nameOf(need), source: 'builds' })
    }
  }

  // recipes: crafted from
  for (const r of supplement.recipes ?? []) {
    const recipeId = resolve(r.name)
    for (const m of r.materials) {
      const to = resolve(m.name)
      ensure(to, isUpgradeMaterial(m.name) ? 'material' : 'item', m.name, 'Crafting material')
      push(recipeId, { rel: 'craftedFrom', to, label: m.name, source: 'recipes' })
    }
  }

  // acquisition: found in (region matched by free text)
  for (const a of supplement.acquisitions ?? []) {
    const itemId = resolve(a.name)
    const text = normalize(`${a.location} ${a.near ?? ''}`)
    for (const [name, id] of byName) {
      const entity = entities.get(id)
      if (!entity || entity.kind !== 'region') continue
      if (name.length >= 4 && text.includes(name) && id !== itemId) {
        push(itemId, { rel: 'foundIn', to: id, label: entity.name, source: 'acquisition' })
        break
      }
    }
  }

  // combat: weak to / resists
  for (const row of [...(supplement.bossCombat ?? []), ...(supplement.enemyCombat ?? [])]) {
    const from = row.factId ? canon(row.factId) : resolve(row.name, 'boss')
    for (const [type, value] of Object.entries(row.negation ?? {})) {
      if (typeof value !== 'number' || value === 0) continue
      const to = `damage:${type}`
      push(from, { rel: value < 0 ? 'weakTo' : 'resists', to, label: damageLabel(type), source: 'combat' })
    }
  }

  // upgrade material
  for (const [id, entity] of entities) {
    // Task 160 — only an ownable entity is an upgrade material; the name test
    // alone matched the "Smithing Stone Scarab" enemies and the Whetblades card.
    if (!OWNED_EDGE_KINDS.has(entity.kind)) continue
    if (isUpgradeMaterial(entity.name)) {
      push('mechanic:upgrades', { rel: 'upgradeMaterial', to: id, label: entity.name, source: 'loot' })
    }
  }

  // mechanics: authored related links (Task 106)
  for (const m of mechanics) {
    for (const rel of m.related) {
      const to = canon(rel)
      if (to === m.id) continue
      push(m.id, { rel: 'relatedLore', to, label: nameOf(to), source: 'mechanics' })
    }
  }

  // related lore: mention of another entity in this entity's own text
  const proseIndex = linkIndex()
  for (const entity of entities.values()) {
    const text = entity.summary
    if (!text || text.length < 4) continue
    for (const span of linkify(text, proseIndex, 6)) {
      if (!span.id) continue
      const to = canon(span.id)
      if (to === entity.id) continue
      // A prose match must land on a real entity; the alias plane can carry a
      // slug the graph has no record for (a ghost grace stub).
      if (!entities.has(to)) continue
      push(entity.id, { rel: 'relatedLore', to, label: span.text, source: 'interlink' })
    }
  }

  // derive every reverse edge once
  const adjacency = new Map<string, Edge[]>()
  for (const [from, list] of forward) {
    const own = adjacency.get(from) ?? []
    for (const edge of list) if (!own.some((e) => e.rel === edge.rel && e.to === edge.to)) own.push(edge)
    adjacency.set(from, own)
    for (const edge of list) {
      const invRel = INVERSE[edge.rel as EdgeRel]
      const rev: Edge = { rel: invRel, to: from, label: nameOf(from), source: edge.source }
      const target = adjacency.get(edge.to) ?? []
      if (!target.some((e) => e.rel === invRel && e.to === from)) target.push(rev)
      adjacency.set(edge.to, target)
    }
  }

  return { entities, byName, idAlias, adjacency }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The one id authority. Engine rows, loot rows, and synthesised category ids all
 * resolve to the canonical `kind:slug` the catalog uses, through
 * `canonicalFactId` and the alias plane.
 */
export function canonicalEntityId(id: string, name?: string): string {
  const idx = ensureIndex()
  const direct = canonicalFactId(id)
  const alias = idx.idAlias.get(id) ?? idx.idAlias.get(direct)
  if (alias) return alias
  if (idx.entities.has(direct)) return direct
  if (idx.entities.has(id)) return id
  const byIdName = idx.byName.get(normalize(id))
  if (byIdName) return byIdName
  if (name) {
    const hit = idx.byName.get(normalize(name))
    if (hit) return hit
  }
  const resolved = canonicalFactId(id, name)
  const resolvedAlias = idx.idAlias.get(resolved)
  if (resolvedAlias) return resolvedAlias
  if (idx.entities.has(resolved)) return resolved
  if (name) {
    const hit = idx.byName.get(normalize(name))
    if (hit) return hit
  }
  return resolved
}

/** Every entity, sorted by name. */
export function allEntities(): EntitySummary[] {
  return [...ensureIndex().entities.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * True when the graph actually holds a row for this id, after alias/name
 * resolution. Task 101 uses this to tell a real entity from a hallucinated one.
 */
export function hasEntity(factId: string, name?: string): boolean {
  return ensureIndex().entities.has(canonicalEntityId(factId, name))
}

/** The canonical id when the entity is known, else null. */
export function resolveEntityId(factId: string, name?: string): string | null {
  const id = canonicalEntityId(factId, name)
  return ensureIndex().entities.has(id) ? id : null
}

/** The display name for an id, falling back to a humanised slug. */
export function entityName(id: string): string {
  const idx = ensureIndex()
  const canonical = canonicalEntityId(id)
  return idx.entities.get(canonical)?.name ?? (canonical.replace(/^[a-z]+:/, '').replace(/-/g, ' ') || canonical)
}

/**
 * One resolved entity for any id, with a stub when the data holds no row.
 *
 * Task 119 §3: once the enrichment index has loaded, the enriched record's
 * description/location stand in for a missing/empty summary and its image for a
 * missing icon. It is still synchronous — before the index settles this returns
 * exactly what the graph has, and consumers that must show a skeleton use
 * `useEnrichment` instead.
 */
export function getEntity(factId: string, name?: string): EntitySummary {
  const idx = ensureIndex()
  const id = canonicalEntityId(factId, name)
  const found = idx.entities.get(id)
  const record = getRecord(id)
  if (found) {
    if (!record) return found
    const summary =
      found.summary && found.summary !== 'No data for this entity yet.'
        ? found.summary
        : record.description || record.location || found.summary
    return { ...found, summary, icon: found.icon ?? record.image }
  }
  if (record) {
    return {
      id,
      kind: record.kind as EntityKind,
      name: record.name || name || id,
      icon: record.image,
      summary: record.description || record.location || 'No data for this entity yet.',
    }
  }
  const fallbackName = name ?? (id.replace(/^[a-z]+:/, '').replace(/-/g, ' ') || id)
  return { id, kind: prefixKind(id), name: fallbackName, summary: 'No data for this entity yet.' }
}

/** Every edge of the entity, forward and reverse. */
export function edges(factId: string): Edge[] {
  const idx = ensureIndex()
  const id = canonicalEntityId(factId)
  return idx.adjacency.get(id) ?? []
}

/** Just the edges of one relationship type. */
export function edgesByRel(factId: string, rel: AnyEdgeRel): Edge[] {
  return edges(factId).filter((e) => e.rel === rel)
}

/** A readable name for a bare state flag id: "quest:fia:killed" -> "Fia killed". */
function flagName(id: string): string {
  const words = id.replace(/^[a-z]+:/, '').split(/[:-]+/).filter(Boolean).join(' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : id
}

const OWNED_KINDS = new Set<EntityKind>(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])

function knownCanonical(character: Character): Set<string> {
  return new Set(
    [
      ...character.defeatedBosses,
      ...character.discoveredGraces,
      ...character.collectedItems,
      ...character.completedQuestSteps,
    ].map((id) => canonicalEntityId(id)),
  )
}

/** How the trigger fact proves the derived one, in player terms. */
function inferredReason(fromId: string): string {
  const name = entityName(fromId)
  const kind = byId.get(canonicalEntityId(fromId))?.kind ?? prefixKind(fromId)
  if (kind === 'item') return `you hold ${name}`
  if (kind === 'grace' || kind === 'region') return `you reached ${name}`
  if (kind === 'boss') return `you defeated ${name}`
  if (kind === 'quest') return `${name} is done`
  return `${name} proves it`
}

/**
 * The inference reason for a fact the character did not log directly, or
 * undefined when every winning piece of evidence is a direct read.
 */
function inferredWhy(character: Character, id: string): string | undefined {
  const evidence = character.evidence.find((e) => canonicalEntityId(e.fact) === id && e.source === 'inference')
  if (!evidence) return undefined
  const known = knownCanonical(character)
  for (const chain of chainsFor(id)) {
    if (!chain.implies.some((x) => canonicalEntityId(x) === id)) continue
    if (!known.has(canonicalEntityId(chain.whenFact))) continue
    if (chain.allOf?.some((x) => !known.has(canonicalEntityId(x)))) continue
    if (chain.unless?.some((x) => known.has(canonicalEntityId(x)))) continue
    return inferredReason(chain.whenFact)
  }
  for (const f of facts) {
    if (!known.has(canonicalEntityId(f.id))) continue
    if (f.implies.some((x) => canonicalEntityId(x) === id)) return inferredReason(f.id)
  }
  return evidence.detail?.replace(/^implied by\s*/i, '')
}

/**
 * Where the character stands on an entity: catalog/gate data supplies the
 * prerequisite chain and lockouts, the character supplies ownership.
 */
export function status(factId: string, character: Character): { state: EntityState; why: string } {
  const id = canonicalEntityId(factId)
  const entity = getEntity(id)
  const known = knownCanonical(character)

  if (known.has(id)) {
    const reason = inferredWhy(character, id)
    return {
      state: OWNED_KINDS.has(entity.kind) ? 'owned' : 'done',
      // Task 138 §4 — the strip says why the app believes it, e.g.
      // "Defeated — you hold Remembrance of the Starscourge".
      why: reason ? `Inferred — ${reason}.` : 'Logged on this character.',
    }
  }

  for (const gate of gates) {
    const lock = gate.locks.find((l) => canonicalEntityId(l.factId) === id)
    if (!lock) continue
    const state = gateState(character, gate)
    if (state === 'fired') return { state: 'missed', why: `${gate.name} has passed — ${lock.why}` }
    if (state === 'approaching') return { state: 'locked', why: `Locked soon by ${gate.name} — ${lock.why}` }
  }

  const fact = byId.get(id)
  const missing = (fact?.implies ?? [])
    .map((x) => canonicalEntityId(x))
    .filter((x) => !known.has(x))
  if (missing.length) {
    // Task 103 §5: a not-yet-reached prerequisite is "ahead of you", not
    // "locked" — Locked stays reserved for a gate that forecloses (point of no
    // return) and Missed for a fact permanently lost to a fired gate.
    return { state: 'ahead', why: `— reach ${missing.map((x) => entityName(x)).join(', ')}` }
  }

  if (entity.kind === 'mechanic' || entity.kind === 'merchant' || entity.kind === 'build') {
    return { state: 'unknown', why: 'Not a trackable fact — reference only.' }
  }
  return { state: 'available', why: 'Available now.' }
}
