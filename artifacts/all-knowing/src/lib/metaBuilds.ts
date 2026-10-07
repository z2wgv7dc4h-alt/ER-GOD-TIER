/**
 * Fextralife "meta" pages scraped by `scripts/scrape-fextralife-builds.mjs`:
 * the Builds hub + per-stat build lists, New Player Help, Progress Route, and the
 * status-effect pages (bleed/frost/madness/…) that the broken builds exploit,
 * plus Buffs. Headings + body text; each page keeps its URL and build links.
 */
export type MetaExcerpt = { page: string; heading: string; text: string; url: string }
export type MetaBuilds = {
  source: string
  pages: {
    slug: string
    title: string
    url: string
    sections: { heading: string; text: string }[]
    links: { slug: string; name: string }[]
  }[]
}

let cache: MetaBuilds | null = null

export async function loadMetaBuilds(): Promise<MetaBuilds> {
  if (cache) return cache
  const r = await fetch('/sourced/open/builds-fextralife.json')
  if (!r.ok) throw new Error('meta builds ' + r.status)
  cache = (await r.json()) as MetaBuilds
  return cache
}

export function metaExcerpts(doc: MetaBuilds): MetaExcerpt[] {
  const out: MetaExcerpt[] = []
  for (const p of doc.pages) {
    for (const s of p.sections) out.push({ page: p.title, heading: s.heading, text: s.text, url: p.url })
  }
  return out
}

/** One display row per Fextralife page: its title, link and section headings. */
export type MetaPageView = {
  slug: string
  title: string
  url: string
  headings: string[]
  linkCount: number
}

/**
 * Task 164 §8 — the shape the "Meta (Fextralife)" card renders. Pure, so the
 * card never has to know the scrape's page/section nesting.
 */
export function metaPageViews(doc: MetaBuilds): MetaPageView[] {
  return doc.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    url: p.url,
    headings: p.sections.map((s) => s.heading).filter(Boolean),
    linkCount: p.links.length,
  }))
}

export function matchMeta(query: string, rows: MetaExcerpt[], limit = 4): MetaExcerpt[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  const words = q.split(/\s+/).filter((w) => w.length >= 3)
  const scored = rows
    .map((r) => {
      const heading = r.heading.toLowerCase()
      const body = (r.heading + ' ' + r.text).toLowerCase()
      let score = 0
      for (const w of words) {
        if (heading.includes(w)) score += 3
        else if (body.includes(w)) score += 1
      }
      return { r, score }
    })
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.r)
}
