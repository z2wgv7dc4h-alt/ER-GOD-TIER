import { markers } from '../data/seed'
import { byId, facts, normalize, type Fact } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { loot, type Loot } from '../knowledge/loot'
import { allLines } from '../knowledge/storylines'
import { canonicalFactId, generatedAliasBySlug } from './aliases'
import type { ModuleId } from '../types'

/**
 * Task 39 — the cross-link map.
 *
 * This module turns the edges the app already stores into one queryable
 * "what is this entity really connected to" graph. Every edge here comes from
 * existing data; nothing is authored or guessed:
 *
 *  - `catalog.ts`  — `implies` (prerequisite), `drops` (produces), `usedIn`
 *                    (consumed by a quest), plus their reverses.
 *  - `endings.ts` / `storylines.ts` — `factId`/`grants`/`requires`/`lockouts`
 *                    on each authored beat, so a fact can point at the lines
 *                    that grant, gate, or foreclose it.
 *  - `loot.ts`     — an item's acquisition text and nearest grace, matched by
 *                    exact normalised name (no fuzzy guessing).
 *  - `graces.ts` / `data/seed.ts` — whether the entity is a real Atlas pin.
 *  - `aliases.ts`  — the Task 23 engine-row link (engineId ↔ authored slug).
 *
 * `relatedFor` is pure and synchronous so the shared `Related` component and
 * the tests use the exact same graph the UI renders.
 */

export type RelatedGroupKey =
  | 'requires'
  | 'grants'
  | 'droppedBy'
  | 'usedIn'
  | 'consumes'
  | 'leadsTo'
  | 'lines'
  | 'region'
  | 'atlas'
  | 'loot'
  | 'alias'

export type RelatedLink = {
  id: string
  label: string
  /** Room the link opens. */
  module: ModuleId
  /** Fact id to select there (goes through `setSelectedMarkerId`). */
  factId: string
  /** Optional hover text: how this edge is known. */
  note?: string
}

export type RelatedGroup = {
  key: RelatedGroupKey
  title: string
  links: RelatedLink[]
}

export type RelatedEngineRow = {
  engineId: string
  fmgName: string
  source: string
}

export type RelatedResult = {
  id: string
  /** The authored slug this id canonicalises to (may equal `id`). */
  canonical: string
  node?: Fact
  groups: RelatedGroup[]
  /** True when at least one real edge was found. */
  hasAny: boolean
  /** Task 23 alias-plane row, when the id has a game engine id. */
  engineRow?: RelatedEngineRow
}

// ---------------------------------------------------------------------------
// Static indexes, built once.
// ---------------------------------------------------------------------------

const markerById = new Map(markers.map((m) => [m.id, m]))
const warpById = new Map(warpGraces.map((g) => [g.id, g]))
const lootById = new Map(loot.map((l) => [l.id, l]))

/** ids that are a real, selectable pin on the Atlas (seed markers + warps). */
const pinIds = new Set<string>([...markerById.keys(), ...warpById.keys()])

function hasPin(id: string) {
  return pinIds.has(id)
}

/** fact id -> facts that list it in `implies` (downstream of it). */
const leadsToById = new Map<string, string[]>()
/** item id -> bosses/encounters that list it in `drops`. */
const droppedByById = new Map<string, string[]>()
/** quest id -> items that list it in `usedIn`. */
const consumesById = new Map<string, string[]>()

for (const f of facts) {
  for (const dest of f.implies) {
    const list = leadsToById.get(dest) || []
    list.push(f.id)
    leadsToById.set(dest, list)
  }
  for (const drop of f.drops ?? []) {
    const list = droppedByById.get(drop) || []
    list.push(f.id)
    droppedByById.set(drop, list)
  }
  for (const quest of f.usedIn ?? []) {
    const list = consumesById.get(quest) || []
    list.push(f.id)
    consumesById.set(quest, list)
  }
}

/** Region facts by their display region string, so an entity can link its region. */
const regionByLabel = new Map<string, Fact>()
for (const f of facts) {
  if (f.kind !== 'region') continue
  regionByLabel.set(normalize(f.region), f)
  regionByLabel.set(normalize(f.name), f)
}

/** Item facts by exact normalised name, to match loot rows without guessing. */
const itemByNorm = new Map<string, Fact>()
for (const f of facts) {
  if (f.kind !== 'item') continue
  itemByNorm.set(normalize(f.name), f)
}

/** Loot rows by exact normalised name. */
const lootByNorm = new Map<string, Loot[]>()
for (const l of loot) {
  const key = normalize(l.name)
  const list = lootByNorm.get(key) || []
  list.push(l)
  lootByNorm.set(key, list)
}

type LineRef = {
  lineId: string
  lineName: string
  stepId: string
  do: string
  role: 'grants' | 'requires' | 'lockout'
  factId?: string
}

const lineRefsById = new Map<string, LineRef[]>()

function addLineRef(factId: string | undefined, ref: LineRef) {
  if (!factId) return
  const list = lineRefsById.get(factId) || []
  if (!list.some((r) => r.lineId === ref.lineId && r.stepId === ref.stepId && r.role === ref.role)) {
    list.push(ref)
  }
  lineRefsById.set(factId, list)
}

for (const line of allLines) {
  for (const step of line.steps) {
    const base = { lineId: line.id, lineName: line.name, stepId: step.id, do: step.do, factId: step.factId }
    if (step.factId) addLineRef(step.factId, { ...base, role: 'grants' })
    for (const g of step.grants) addLineRef(g, { ...base, role: 'grants' })
    for (const r of step.requires) addLineRef(r, { ...base, role: 'requires' })
    for (const l of step.lockouts) addLineRef(l, { ...base, role: 'lockout' })
  }
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

function labelFor(id: string): string {
  const f = byId.get(id)
  if (f) return f.name
  const l = lootById.get(id)
  if (l) return l.name
  const g = warpById.get(id)
  if (g) return g.name
  const m = markerById.get(id)
  if (m) return m.name
  return id.replace(/^[a-z]+:/, '').replace(/-/g, ' ') || id
}

/**
 * Where a link should open. Quests and pinned entities have a real room;
 * everything else opens the Codex detail, which always has a panel for it.
 */
export function targetModule(id: string): ModuleId {
  const kind = byId.get(id)?.kind
  const prefix = id.split(':')[0]
  if (kind === 'quest' || prefix === 'quest' || prefix === 'line') return 'quests'
  if (hasPin(id)) return 'map'
  return 'codex'
}

function factLink(id: string, note?: string): RelatedLink {
  return { id, label: labelFor(id), module: targetModule(id), factId: id, note }
}

function uniqueLinks(links: RelatedLink[]): RelatedLink[] {
  const seen = new Set<string>()
  const out: RelatedLink[] = []
  for (const l of links) {
    if (seen.has(l.factId)) continue
    seen.add(l.factId)
    out.push(l)
  }
  return out
}

function truncate(text: string, max = 72) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// ---------------------------------------------------------------------------
// The graph query
// ---------------------------------------------------------------------------

/**
 * Every real connection an entity has, grouped by relationship. `id` may be an
 * authored slug (`item:fingerslayer`), an engine id (`bossflag:530100`), a loot
 * row (`loot:rivers`), or a seed-only id (`alexander-1`); each is resolved
 * through the same data before any edges are read.
 */
export function relatedFor(id: string): RelatedResult {
  const canonical = canonicalFactId(id)
  const node = byId.get(id) ?? byId.get(canonical)
  const groups: RelatedGroup[] = []

  const push = (key: RelatedGroupKey, title: string, links: RelatedLink[]) => {
    const unique = uniqueLinks(links)
    if (unique.length) groups.push({ key, title, links: unique })
  }

  // --- catalog edges -------------------------------------------------------
  if (node) {
    push('requires', 'Requires', node.implies.map((x) => factLink(x)))
    push('grants', 'Usually grants', (node.drops ?? []).map((x) => factLink(x)))
    push('usedIn', 'Used in', (node.usedIn ?? []).map((x) => factLink(x, 'Consumed by this quest')))
  }

  const droppedBy = droppedByById.get(canonical) ?? droppedByById.get(id) ?? []
  push('droppedBy', 'Dropped by', droppedBy.map((x) => factLink(x)))

  const consumes = consumesById.get(canonical) ?? consumesById.get(id) ?? []
  push('consumes', 'Consumes', consumes.map((x) => factLink(x)))

  const leadsTo = leadsToById.get(canonical) ?? leadsToById.get(id) ?? []
  push('leadsTo', 'Leads to', leadsTo.map((x) => factLink(x, 'This must be true first')))

  // --- authored quest-line beats ------------------------------------------
  // Deduped by beat, not by fact: one fact can be a different beat in several
  // lines (e.g. an item is both granted and later required by one route).
  const refs = lineRefsById.get(canonical) ?? lineRefsById.get(id) ?? []
  const roleNote: Record<LineRef['role'], string> = {
    grants: 'This beat grants it',
    requires: 'This beat requires it',
    lockout: 'This beat forecloses it',
  }
  const seenBeats = new Set<string>()
  const lineLinks: RelatedLink[] = []
  for (const r of refs) {
    const beatId = `${r.lineId}:${r.stepId}:${r.role}`
    if (seenBeats.has(beatId)) continue
    seenBeats.add(beatId)
    lineLinks.push({
      id: beatId,
      label: `${r.lineName} — ${truncate(r.do)}`,
      module: 'quests',
      factId: r.factId || canonical,
      note: roleNote[r.role],
    })
  }
  if (lineLinks.length) groups.push({ key: 'lines', title: 'Quest lines', links: lineLinks })

  // --- region entity -------------------------------------------------------
  const regionLabel = node?.region
  if (regionLabel) {
    const region = regionByLabel.get(normalize(regionLabel))
    if (region && region.id !== canonical) {
      push('region', 'Region', [factLink(region.id)])
    }
  }

  // --- Atlas pin -----------------------------------------------------------
  if (hasPin(id)) {
    push('atlas', 'Atlas', [{ id, label: labelFor(id), module: 'map', factId: id, note: 'Open this pin on the Atlas' }])
  }

  // --- loot (exact name match only) ---------------------------------------
  const lootLinks: RelatedLink[] = []
  if (lootById.has(id)) {
    const row = lootById.get(id) as Loot
    const item = itemByNorm.get(normalize(row.name))
    if (item) lootLinks.push({ ...factLink(item.id), note: `Same item as ${row.name}` })
    if (row.grace) lootLinks.push({ id: row.grace, label: `Found near ${labelFor(row.grace)}`, module: 'map', factId: row.grace, note: row.how })
  } else if (node?.kind === 'item') {
    for (const row of lootByNorm.get(normalize(node.name)) ?? []) {
      if (row.grace) {
        lootLinks.push({ id: row.grace, label: `Found near ${labelFor(row.grace)}`, module: 'map', factId: row.grace, note: row.how })
      } else {
        lootLinks.push({ id: row.id, label: row.how, module: 'codex', factId: row.id, note: row.how })
      }
    }
  }
  push('loot', 'Acquisition', lootLinks)

  // --- alias plane (Task 23) ----------------------------------------------
  const row = generatedAliasBySlug(id)
  const engineRow = row && row.engineId !== row.slug
    ? { engineId: row.engineId, fmgName: row.fmgName, source: row.source }
    : undefined
  if (canonical !== id) {
    push('alias', 'Engine row', [factLink(canonical, `Canonical fact for ${id}`)])
  }

  return {
    id,
    canonical,
    node,
    groups,
    hasAny: groups.length > 0,
    engineRow,
  }
}

/** Flat list of every linked fact id, for quick membership checks. */
export function relatedIds(id: string): string[] {
  return relatedFor(id).groups.flatMap((g) => g.links.map((l) => l.factId))
}
