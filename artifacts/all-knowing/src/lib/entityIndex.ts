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
  /** Contributing datasets, for provenance. */
  sources: string[]
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
