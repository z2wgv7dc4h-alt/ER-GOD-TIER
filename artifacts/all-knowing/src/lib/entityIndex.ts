import { useSyncExternalStore } from 'react'

/**
 * Task 119 §2/§3 — the lazy, shared home of the build-time enrichment index.
 *
 * `scripts/build-entity-index.mjs` merges every reference dataset the repo ships
 * into one compact record per canonical fact id (`public/sourced/entity-index.json`).
 * The app fetches that one file once, caches it for the session, and every
 * consumer — `getEntity`, the peek card, `EntityPanel`, `BossFacts`, the Library
 * and Gideon — reads the same records through here.
 *
 * This module is deliberately dependency-free (no entity graph, no data
 * imports) so both `entityGraph.ts` and the async loader can import it without a
 * cycle. Records are keyed by canonical `kind:slug` id; lookups by other ids go
 * through `canonicalEntityId` at the call site.
 */

export type EntityRecordMap = Map<string, EntityRecord>

/** Task 133 §0 — one folded `+N` upgrade level of a base item. */
export type UpgradeLevel = {
  level: number
  name: string
  effect?: string
}

/**
 * Task 133 §0 — one beat of an NPC's merged quest line. Authored `storylines.ts`
 * beats are preferred; a matched wiki step attaches its location/action, and
 * unmatched wiki steps are appended in order.
 */
export type QuestStepEntry = {
  order: number
  title: string
  source: 'authored' | 'wiki'
  location?: string
  text?: string
  breaks?: boolean
  entityId?: string
}

export type EntityRecord = {
  /** Canonical `kind:slug` id. */
  id: string
  /** Graph kind (`boss`, `weapon`, `grace`, …). */
  kind: string
  name: string
  /** Short definition / lore line. */
  description?: string
  /** Acquisition or arena/location text. */
  location?: string
  /** Task 130 — the region an encounter sits in, from the boss roster. */
  region?: string
  /** Task 133 §0 — folded `+1 … +N` levels of an upgradeable item. */
  upgradeLevels?: UpgradeLevel[]
  /** Task 133 §0 — the merged, ordered wiki + authored quest step list. */
  questSteps?: QuestStepEntry[]
  /** Plate coordinates when a dump carries them. */
  map?: { x: number; y: number; map?: string; world?: string }
  /** Local image path when the repo ships one. */
  image?: string
  /** Kind-appropriate numeric fields, already formatted for display. */
  stats?: Record<string, string>
  /** Boss drops. */
  drops?: string[]
  /** Strategy / wiki excerpt. */
  strategy?: string
  /** Selected wiki/Fextralife section excerpts (≤600 chars each). */
  sections?: { heading: string; text: string }[]
  /** Labels of the entity's strongest graph edges. */
  related?: string[]
  /**
   * Task 123 §3 — true when this record is a Library catalogue row, so the
   * coverage guard measures exactly the full catalogue and not extra reference
   * records (e.g. the search-only `magic.json` spells).
   */
  catalogue?: boolean
  /** Contributing datasets, for provenance. */
  sources: string[]
  /** Task 124 §2 — the wiki page a `gapfill` field was read from, when any. */
  sourceUrl?: string
}

let records: Map<string, EntityRecord> | null = null
let meta: EntityIndexMeta = { total: 0, byKind: {}, unmatched: {}, sources: [] }
let version = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export type EntityIndexMeta = {
  total: number
  byKind: Record<string, number>
  unmatched: Record<string, number>
  sources: string[]
}

export function subscribeEntityIndex(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getEntityIndexVersion(): number {
  return version
}

/** True once the index has been fetched (or fetch failed and was marked empty). */
export function entityIndexReady(): boolean {
  return records !== null
}

export function entityIndexMeta(): EntityIndexMeta {
  return meta
}

/** Install the fetched (or test) records. */
export function setEntityIndex(next: Map<string, EntityRecord>, nextMeta?: Partial<EntityIndexMeta>): void {
  records = next
  meta = {
    total: next.size,
    byKind: nextMeta?.byKind ?? countKinds(next),
    unmatched: nextMeta?.unmatched ?? {},
    sources: nextMeta?.sources ?? [],
  }
  version++
  emit()
}

function countKinds(map: EntityRecordMap): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of map.values()) out[r.kind] = (out[r.kind] ?? 0) + 1
  return out
}

/** The enriched record for a canonical id, when the index has loaded. */
export function getRecord(id: string): EntityRecord | undefined {
  return records?.get(id)
}

export function allRecords(): EntityRecord[] {
  return records ? [...records.values()] : []
}

/**
 * Task 132 §4 — substring search over the loaded enrichment index, so Gideon and
 * the command palette can resolve the kinds the authored graph does not carry
 * (wiki NPCs, locations, enemies, the full item plane). Empty before the one
 * fetch settles.
 */
export function searchRecordIds(query: string, kind?: string, limit = 12): EntityRecord[] {
  if (!records) return []
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  const out: EntityRecord[] = []
  for (const record of records.values()) {
    if (kind && record.kind !== kind) continue
    if (record.name.toLowerCase().includes(q)) out.push(record)
  }
  // Task 132 §2 — a name shared by an NPC and an enemy resolves to the NPC.
  out.sort((a, b) => (NAME_PRIORITY[a.kind] ?? 5) - (NAME_PRIORITY[b.kind] ?? 5))
  return out.slice(0, limit)
}

const NAME_PRIORITY: Record<string, number> = { npc: 0, boss: 1, quest: 2, enemy: 3 }

/** Test seam: drop the cached index. */
export function clearEntityIndex(): void {
  records = null
  meta = { total: 0, byKind: {}, unmatched: {}, sources: [] }
  version++
  emit()
}

/**
 * Subscribe to index readiness. `ready` flips true once the one fetch settles,
 * so cards can show a skeleton instead of "No data" while it loads.
 */
export function useEntityIndex(): { ready: boolean; version: number } {
  const v = useSyncExternalStore(subscribeEntityIndex, getEntityIndexVersion, getEntityIndexVersion)
  return { ready: entityIndexReady(), version: v }
}
