import { canonicalEntityId } from './entityGraph'
import {
  clearEntityIndex as clearStore,
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
 *
 * Task 191 §16 — the file is 4.4 MB, so nothing fetches it on app mount. The
 * shell warms it only for a screen whose content is record-backed
 * (`shouldLoadEntityIndex`) and every card that reads a record triggers it from
 * its own hook, so the download happens when the user first needs it.
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

/** Kick off the one fetch when a screen that needs records mounts. */
export function ensureEntityIndex(): void {
  if (!entityIndexReady() && !loading) void loadEntityIndex()
}

/**
 * Task 191 §16 — which shell screens read enriched records as their content.
 * The Tarnished overview/setup/profiles do not, so a cold first load no longer
 * drags the 4.4 MB index in before the user asks for it; their record-reading
 * cards still trigger the fetch through `useEnrichment`. The command palette is
 * handled by the shell because it opens over any screen.
 */
export function shouldLoadEntityIndex(section: string, sub: string | null): boolean {
  if (section === 'me') return sub === 'gear'
  return section === 'journey' || section === 'library' || section === 'gideon'
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

/**
 * Test seam: drop the cached index and let the next `ensureEntityIndex()` /
 * `loadEntityIndex()` fetch again. The in-flight loader is reset too, otherwise
 * a settled promise would keep returning the cleared store.
 */
export function clearEntityIndex(): void {
  loading = null
  clearStore()
}
