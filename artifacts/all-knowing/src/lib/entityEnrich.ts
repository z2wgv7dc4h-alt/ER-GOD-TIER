import { canonicalEntityId } from './entityGraph'
import {
  clearEntityIndex,
  entityIndexReady,
  getRecord,
  setEntityIndex,
  useEntityIndex,
  type EntityRecord,
} from './entityIndex'

/**
 * Task 119 §3 — the runtime reader for the build-time enrichment index.
 *
 * The heavy merge lives in `entityIndexBuild.ts` and runs once at build time
 * (`npm run index:entities`). At runtime all this does is fetch the one JSON
 * file, key it by canonical id and hand records back synchronously. Consumers
 * call `ensureEntityIndex()` (or the `useEnrichment` hook) so a card can show a
 * skeleton instead of "No data" while that fetch is in flight.
 */

export type { EntityRecord }

type IndexDoc = {
  records?: Record<string, EntityRecord>
  byKind?: Record<string, number>
  unmatched?: Record<string, number>
  sources?: string[]
}

const INDEX_URL = '/sourced/entity-index.json'

let loading: Promise<void> | null = null

function install(doc: IndexDoc): void {
  const map = new Map<string, EntityRecord>()
  const raw = doc.records ?? {}
  for (const [id, record] of Object.entries(raw)) map.set(id, record)
  setEntityIndex(map, {
    byKind: doc.byKind,
    unmatched: doc.unmatched,
    sources: doc.sources,
  })
}

/** Fetch and install the index. Idempotent; resolves once it has settled. */
export function loadEntityIndex(): Promise<void> {
  if (entityIndexReady()) return Promise.resolve()
  if (loading) return loading
  loading = fetch(INDEX_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`entity index ${response.status}`)
      return response.json() as Promise<IndexDoc>
    })
    .then((doc) => {
      install(doc)
    })
    .catch(() => {
      // A missing index must never wedge the UI: mark it settled-but-empty so
      // consumers fall back to their synchronous data exactly as before.
      setEntityIndex(new Map())
    })
  return loading
}

/** Kick off the one fetch when the app or a card mounts. */
export function ensureEntityIndex(): void {
  if (!entityIndexReady() && !loading) void loadEntityIndex()
}

/**
 * The enriched record for any entity id (canonical or alias), once loaded.
 * Synchronous: returns `undefined` before the index has settled.
 */
export function enrichmentFor(id: string): EntityRecord | undefined {
  const canonical = canonicalEntityId(id)
  return getRecord(canonical) ?? getRecord(id)
}

/** React hook: the record for `id`, re-rendering when the index loads. */
export function useEnrichment(id: string): EntityRecord | undefined {
  ensureEntityIndex()
  const { ready, version } = useEntityIndex()
  void version
  return ready ? enrichmentFor(id) : undefined
}

export { useEntityIndex }

/** Back-compat test seam shared with the store. */
export { clearEntityIndex }
