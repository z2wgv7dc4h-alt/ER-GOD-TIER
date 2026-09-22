/**
 * Full wiki text, ripped from the elden-ring-mcp snapshot DB
 * (`scripts/export-mcp-db.py`): 19k sections of prose across the wiki. The
 * "answer anything" layer beyond the structured tables. Lazy-loaded; searched
 * on demand with a minimum query length.
 */
export type WikiSection = { id: string; page: string; heading: string; text: string }
export type WikiTextDoc = { source: string; sections: WikiSection[] }

let cache: WikiTextDoc | null = null

export async function loadWikiText(): Promise<WikiTextDoc> {
  if (cache) return cache
  const r = await fetch('/sourced/open/wiki-sections.json')
  if (!r.ok) throw new Error('wiki text ' + r.status)
  cache = (await r.json()) as WikiTextDoc
  return cache
}

/** Substring search over page/heading/body, heading+page hits ranked first. */
export function matchWiki(query: string, rows: WikiSection[], limit = 5): WikiSection[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  const scored: { r: WikiSection; s: number }[] = []
  for (const r of rows) {
    let s = 0
    if (r.page.toLowerCase().includes(q)) s += 3
    if (r.heading.toLowerCase().includes(q)) s += 2
    else if (r.text.toLowerCase().includes(q)) s += 1
    if (s > 0) scored.push({ r, s })
  }
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, limit).map((x) => x.r)
}
