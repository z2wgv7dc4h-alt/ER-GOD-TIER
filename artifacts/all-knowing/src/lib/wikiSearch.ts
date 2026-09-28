/**
 * Task 133 §1/§3 — client-side full-text search over the exported wiki corpus.
 *
 * `scripts/export-wiki-db.py` prebuilds a lightweight inverted index under
 * `public/sourced/wiki/`: a manifest (page metadata + entityId -> page), page
 * chunks and per-bucket term postings. This module loads those lazily (the
 * service worker caches them at runtime) and answers queries with a small,
 * dependency-free BM25-ish scorer. The tokenizer/stemmer mirrors the Python
 * exporter exactly, so a term indexed there is a term found here.
 */

export type WikiPageMeta = {
  title: string
  entityId: string
  kind: string
  url: string
  chunk: string
  sections: number
}

export type WikiManifest = {
  pageCount: number
  chunks: string[]
  pages: Record<string, WikiPageMeta>
  byEntity: Record<string, string | number>
}

export type WikiCorpusSection = { heading: string; markdown: string }
export type WikiCorpusPage = {
  id: number | string
  title: string
  entityId: string
  kind: string
  url: string
  sections: WikiCorpusSection[]
}

export type WikiSearchHit = {
  pageId: string
  entityId: string
  title: string
  kind: string
  heading: string
  markdown: string
  score: number
}

type Posting = [number, number, number]

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have',
  'he', 'her', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'no', 'not',
  'of', 'on', 'or', 'our', 'so', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'to', 'up', 'was', 'we', 'were', 'will', 'with', 'you', 'your',
])

/** Mirror of the Python `stem`; change both together. */
export function stem(token: string): string {
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1)
  if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3)
  if (token.endsWith('ed') && token.length > 4) return token.slice(0, -2)
  return token
}

/** Mirror of the Python `tokenize`; change both together. */
export function tokenize(text: string): string[] {
  const folded = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const out: string[] = []
  for (const raw of folded.match(/[a-z0-9']+/g) ?? []) {
    const token = raw.replace(/'/g, '')
    if (token.length < 2 || STOPWORDS.has(token)) continue
    out.push(stem(token))
  }
  return out
}

export function bucketFor(term: string): string {
  return term && /[a-z0-9]/.test(term[0]) ? term[0] : '_'
}

// ---------------------------------------------------------------------------
// Loading (lazy, cached)
// ---------------------------------------------------------------------------

const BASE = '/sourced/wiki'
let manifest: WikiManifest | null = null
let manifestPromise: Promise<WikiManifest | null> | null = null
const chunkCache = new Map<string, Promise<Record<string, WikiCorpusPage>>>()
const bucketCache = new Map<string, Promise<Record<string, Posting[]>>>()
let searchMetaPromise: Promise<{ docs: number; buckets: Record<string, string>; terms?: Record<string, Posting[]> } | null> | null = null

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export function loadWikiManifest(): Promise<WikiManifest | null> {
  if (manifest) return Promise.resolve(manifest)
  if (!manifestPromise) {
    manifestPromise = fetchJson<WikiManifest>(`${BASE}/manifest.json`).then((doc) => {
      manifest = doc
      return doc
    })
  }
  return manifestPromise
}

/** The manifest already fetched, when any (for synchronous render paths). */
export function wikiManifestSync(): WikiManifest | null {
  return manifest
}

export function loadWikiChunk(name: string): Promise<Record<string, WikiCorpusPage>> {
  const cached = chunkCache.get(name)
  if (cached) return cached
  const promise = fetchJson<{ pages?: WikiCorpusPage[] }>(`${BASE}/${name}`).then((doc) => {
    const out: Record<string, WikiCorpusPage> = {}
    for (const page of doc?.pages ?? []) out[String(page.id)] = page
    return out
  })
  chunkCache.set(name, promise)
  return promise
}

export type WikiPageRow = WikiPageMeta & { id: string }

/** All wiki pages of a kind (or every page), sorted by title. For browse-by-category. */
export async function listWikiPages(kind?: string): Promise<WikiPageRow[]> {
  const doc = await loadWikiManifest()
  if (!doc) return []
  const rows: WikiPageRow[] = []
  for (const [id, meta] of Object.entries(doc.pages)) {
    if (kind && meta.kind !== kind) continue
    rows.push({ id, ...meta })
  }
  rows.sort((a, b) => a.title.localeCompare(b.title))
  return rows
}

/** The page a canonical entity id links to, when the wiki has one. */
export async function wikiPageForEntity(entityId: string): Promise<{ meta: WikiPageMeta; page: WikiCorpusPage } | null> {
  const doc = await loadWikiManifest()
  const pageId = doc?.byEntity?.[entityId]
  if (!pageId) return null
  return wikiPage(pageId)
}

/** Load a page (by manifest page id) from its chunk. */
export async function wikiPage(pageId: string | number): Promise<{ meta: WikiPageMeta; page: WikiCorpusPage } | null> {
  const doc = await loadWikiManifest()
  const meta = doc?.pages?.[String(pageId)]
  if (!meta) return null
  const chunk = await loadWikiChunk(meta.chunk)
  const page = chunk[String(pageId)]
  if (!page) return null
  return { meta, page }
}

/** A wiki-only page by `wiki:<slug>` entity id, or any entity id. */
export async function loadWikiPageByEntity(entityId: string): Promise<{ meta: WikiPageMeta; page: WikiCorpusPage } | null> {
  return wikiPageForEntity(entityId)
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function loadSearchMeta(): Promise<{ docs: number; buckets: Record<string, string>; terms?: Record<string, Posting[]> } | null> {
  if (!searchMetaPromise) {
    searchMetaPromise = fetchJson<{ docs?: number; buckets?: Record<string, string>; single?: boolean; terms?: Record<string, Posting[]> }>(
      `${BASE}/search-index.json`,
    ).then((doc) => {
      if (!doc) return null
      if (doc.single) return { docs: doc.docs ?? 0, buckets: {}, terms: doc.terms ?? {} }
      return { docs: doc.docs ?? 0, buckets: doc.buckets ?? {} }
    })
  }
  return searchMetaPromise
}

async function loadBucket(name: string): Promise<Record<string, Posting[]>> {
  const cached = bucketCache.get(name)
  if (cached) return cached
  const promise = fetchJson<Record<string, Posting[]>>(`${BASE}/${name}`).then((doc) => doc ?? {})
  bucketCache.set(name, promise)
  return promise
}

/** Pure scorer over prebuilt postings; exported for unit tests. */
export function rankPostings(
  terms: string[],
  docs: number,
  postings: Map<string, Posting[]>,
): { pageId: string; ord: number; score: number }[] {
  if (!terms.length || docs <= 0) return []
  const scores = new Map<string, { pageId: string; ord: number; score: number }>()
  const unique = [...new Set(terms)]
  for (const term of unique) {
    const list = postings.get(term)
    if (!list?.length) continue
    const idf = Math.log(1 + docs / list.length)
    for (const [pageId, ord, tf] of list) {
      const key = `${pageId}:${ord}`
      const entry = scores.get(key) ?? { pageId: String(pageId), ord, score: 0 }
      entry.score += idf * (1 + Math.log(tf))
      scores.set(key, entry)
    }
  }
  return [...scores.values()].sort((a, b) => b.score - a.score)
}

const PHRASE_BONUS = 6

/** Search the corpus; loads only the buckets the query touches. */
export async function searchWiki(query: string, limit = 8): Promise<WikiSearchHit[]> {
  const terms = tokenize(query)
  if (!terms.length) return []
  const [doc, meta] = await Promise.all([loadWikiManifest(), loadSearchMeta()])
  if (!doc || !meta) return []

  const postings = new Map<string, Posting[]>()
  if (meta.terms) {
    for (const term of new Set(terms)) {
      const list = meta.terms[term]
      if (list) postings.set(term, list)
    }
  } else {
    const names = new Set<string>()
    for (const term of new Set(terms)) {
      const name = meta.buckets[bucketFor(term)]
      if (name) names.add(name)
    }
    const loaded = await Promise.all([...names].map(async (name) => [name, await loadBucket(name)] as const))
    for (const [, bucket] of loaded) {
      for (const term of new Set(terms)) {
        const list = bucket[term]
        if (list) postings.set(term, list)
      }
    }
  }

  const ranked = rankPostings(terms, meta.docs, postings)
  if (!ranked.length) return []
  // Resolve the top candidates to sections; a phrase/title hit gets a boost.
  const candidates = ranked.slice(0, Math.max(limit * 4, 24))
  const phrase = query.trim().toLowerCase()
  const pageCache = new Map<string, WikiCorpusPage | undefined>()
  const hits: WikiSearchHit[] = []
  for (const candidate of candidates) {
    const pageMeta = doc.pages[candidate.pageId]
    if (!pageMeta) continue
    let page = pageCache.get(candidate.pageId)
    if (!page) {
      const chunk = await loadWikiChunk(pageMeta.chunk)
      page = chunk[candidate.pageId]
      pageCache.set(candidate.pageId, page)
    }
    const section = page?.sections?.[candidate.ord]
    if (!section) continue
    let score = candidate.score
    const haystack = `${pageMeta.title}\n${section.heading}\n${section.markdown}`.toLowerCase()
    if (phrase.length >= 6 && haystack.includes(phrase)) score += PHRASE_BONUS
    if (tokenize(pageMeta.title).some((term) => terms.includes(term))) score += 0.5
    hits.push({
      pageId: candidate.pageId,
      entityId: pageMeta.entityId,
      title: pageMeta.title,
      kind: pageMeta.kind,
      heading: section.heading,
      markdown: section.markdown,
      score,
    })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit)
}

/** Test seam: drop every cached fetch. */
export function clearWikiCache(): void {
  manifest = null
  manifestPromise = null
  searchMetaPromise = null
  chunkCache.clear()
  bucketCache.clear()
}

/**
 * A short plain-text snippet around the first query term, for a result row.
 * The UI highlights the terms in the returned text itself.
 */
export function wikiSnippet(markdown: string, query: string, length = 180): string {
  const text = markdown.replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim()
  if (text.length <= length) return text
  const terms = tokenize(query)
  const lower = text.toLowerCase()
  let at = -1
  for (const term of terms) {
    const index = lower.indexOf(term)
    if (index >= 0 && (at < 0 || index < at)) at = index
  }
  if (at < 0) return `${text.slice(0, length)}…`
  const start = Math.max(0, at - Math.floor(length / 3))
  return `${start > 0 ? '…' : ''}${text.slice(start, start + length)}…`
}
