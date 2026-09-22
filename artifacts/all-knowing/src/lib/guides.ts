/**
 * Fextralife guide-page excerpts (mechanics + guides), scraped by
 * `scripts/scrape-fextralife-guides.mjs`: upgrades, smithing stones, bell
 * bearings, progress route, stats, damage types, buffs, classes, and the
 * category pages. Only headings + body text are stored; each keeps its URL.
 */
export type GuideExcerpt = { page: string; heading: string; text: string; url: string }
export type Guides = {
  source: string
  pages: { slug: string; title: string; url: string; sections: { heading: string; text: string }[] }[]
}

let cache: Guides | null = null

export async function loadGuides(): Promise<Guides> {
  if (cache) return cache
  const r = await fetch('/sourced/open/guides-fextralife.json')
  if (!r.ok) throw new Error('guides ' + r.status)
  cache = (await r.json()) as Guides
  return cache
}

export function guideExcerpts(doc: Guides): GuideExcerpt[] {
  const out: GuideExcerpt[] = []
  for (const p of doc.pages) {
    for (const s of p.sections) out.push({ page: p.title, heading: s.heading, text: s.text, url: p.url })
  }
  return out
}

export function matchGuides(query: string, rows: GuideExcerpt[], limit = 5): GuideExcerpt[] {
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
