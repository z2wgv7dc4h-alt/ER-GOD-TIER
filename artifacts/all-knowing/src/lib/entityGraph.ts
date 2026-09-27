import { byId, facts, normalize, type Fact } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { loot, type LootKind } from '../knowledge/loot'
import { remembrances } from '../knowledge/remembrances'
import { gates, gateState } from '../knowledge/gates'
import { allLines } from '../knowledge/storylines'
import { dungeons } from '../knowledge/dungeons'
import { opBuilds } from '../knowledge/builds'
import { merchants } from '../knowledge/merchants'
import { npcLocations } from '../knowledge/npcLocations'
import type { Character } from '../types'
import { canonicalFactId } from './aliases'
import { linkIndex, linkify } from './interlink'
import { iconFor } from './sourcePack'

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

export type EntityState = 'done' | 'owned' | 'available' | 'locked' | 'missed' | 'unknown'

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

export type EntityGraphSupplement = {
  bossCombat?: CombatRow[]
  enemyCombat?: CombatRow[]
  recipes?: RecipeRow[]
  acquisitions?: AcquisitionRow[]
  shops?: ShopRow[]
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

function ensureIndex(): Index {
  if (cachedIndex && cachedVersion === version) return cachedIndex
  cachedIndex = buildIndex()
  cachedVersion = version
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

  const addEntity = (entity: EntitySummary, aliases: string[] = [], registerName = true) => {
    const existing = entities.get(entity.id)
    if (!existing) entities.set(entity.id, entity)
    else if (existing.kind === 'item' && entity.kind !== 'item') {
      entities.set(entity.id, { ...existing, kind: entity.kind, summary: existing.summary || entity.summary })
    }
    if (!registerName) return
    for (const raw of [entity.name, ...aliases]) {
      const n = normalize(raw)
      if (n && !byName.has(n)) byName.set(n, entity.id)
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

  // --- dungeons, builds, merchants, NPCs -----------------------------------
  for (const d of dungeons) {
    addEntity({ id: `dungeon:${d.id}`, kind: 'dungeon', name: d.name, summary: d.region })
  }
  for (const b of opBuilds) {
    addEntity({ id: b.id, kind: 'build', name: b.name, summary: b.why }, [b.tag])
  }
  for (const m of merchants) {
    addEntity({ id: `merchant:${slug(m.vendor)}`, kind: 'merchant', name: m.vendor, summary: 'Merchant' })
  }
  for (const n of npcLocations) {
    addEntity({ id: `npc:${n.npc}`, kind: 'npc', name: n.name, summary: n.note || `Found at ${n.graceId}` }, n.aliases)
  }

  // --- synthetic mechanics -------------------------------------------------
  for (const type of Object.keys(DAMAGE_LABELS)) {
    addEntity({ id: `damage:${type}`, kind: 'mechanic', name: damageLabel(type), summary: 'Damage type' })
  }
  addEntity({ id: 'mechanic:upgrades', kind: 'mechanic', name: 'Upgrades & smithing', summary: 'Weapon upgrade materials and smithing mechanics' })

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
    const region = f.region ? byName.get(normalize(f.region)) : undefined
    if (region && region !== f.id) push(f.id, { rel: 'foundIn', to: region, label: f.region, source: 'catalog' })
  }

  // loot: where it is found
  for (const l of loot) {
    const itemId = idAlias.get(l.id) ?? canon(l.id)
    const region = byName.get(normalize(l.region))
    if (region && region !== itemId) push(itemId, { rel: 'foundIn', to: region, label: l.region, source: 'loot' })
    if (l.grace) push(itemId, { rel: 'foundIn', to: canon(l.grace), label: `Near ${nameOf(l.grace)}`, source: 'loot' })
  }

  // merchants: sold by
  for (const m of merchants) {
    const merchantId = `merchant:${slug(m.vendor)}`
    for (const stock of m.stock) {
      const itemId = byName.get(normalize(stock))
      if (itemId) push(itemId, { rel: 'soldBy', to: merchantId, label: m.vendor, source: 'merchants' })
    }
  }
  for (const s of supplement.shops ?? []) {
    const itemId = byName.get(normalize(s.item))
    if (itemId) push(itemId, { rel: 'soldBy', to: `merchant:${slug(s.vendor)}`, label: s.vendor, source: 'shops' })
  }

  // remembrances: traded for
  for (const r of remembrances) {
    for (const reward of r.rewards) {
      const to = reward.factId ? canon(reward.factId) : resolve(reward.name)
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
      const to = resolve(slot.name)
      ensure(to, SLOT_KIND[slot.kind] ?? 'item', slot.name, 'Build item')
      push(b.id, { rel: 'goodForBuild', to, label: slot.name, source: 'builds' })
    }
    for (const need of b.need) {
      push(b.id, { rel: 'goodForBuild', to: canon(need), label: nameOf(need), source: 'builds' })
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
    if (isUpgradeMaterial(entity.name)) {
      push('mechanic:upgrades', { rel: 'upgradeMaterial', to: id, label: entity.name, source: 'loot' })
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

/** The display name for an id, falling back to a humanised slug. */
export function entityName(id: string): string {
  const idx = ensureIndex()
  const canonical = canonicalEntityId(id)
  return idx.entities.get(canonical)?.name ?? (canonical.replace(/^[a-z]+:/, '').replace(/-/g, ' ') || canonical)
}

/** One resolved entity for any id, with a stub when the data holds no row. */
export function getEntity(factId: string, name?: string): EntitySummary {
  const idx = ensureIndex()
  const id = canonicalEntityId(factId, name)
  const found = idx.entities.get(id)
  if (found) return found
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

/**
 * Where the character stands on an entity: catalog/gate data supplies the
 * prerequisite chain and lockouts, the character supplies ownership.
 */
export function status(factId: string, character: Character): { state: EntityState; why: string } {
  const id = canonicalEntityId(factId)
  const entity = getEntity(id)
  const known = knownCanonical(character)

  if (known.has(id)) {
    return {
      state: OWNED_KINDS.has(entity.kind) ? 'owned' : 'done',
      why: 'Logged on this character.',
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
    return { state: 'locked', why: `Needs ${missing.map((x) => entityName(x)).join(', ')} first` }
  }

  if (entity.kind === 'mechanic' || entity.kind === 'merchant' || entity.kind === 'build') {
    return { state: 'unknown', why: 'Not a trackable fact — reference only.' }
  }
  return { state: 'available', why: 'Available now.' }
}
