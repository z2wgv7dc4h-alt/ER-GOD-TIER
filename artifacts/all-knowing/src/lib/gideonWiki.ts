import type { GideonAct } from './gideon'
import { searchWiki } from './wikiSearch'

/**
 * Task 133 §4 — the wiki answer path.
 *
 * When the deterministic router has no specific intent match, Gideon answers
 * from the top full-text wiki sections instead of "I don't know": up to two
 * short excerpts, the page cited as a source, and the page's entity linked with
 * `[[id|label]]` so the UI renders it as an EntityLink.
 */

/** Strip the corpus `[[id|label]]` markers and squash whitespace for a quote. */
export function wikiExcerpt(markdown: string, max = 240): string {
  const text = markdown
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const at = cut.lastIndexOf(' ')
  return `${(at > max / 2 ? cut.slice(0, at) : cut).trim()}…`
}

export async function askGideonWiki(question: string, limit = 3): Promise<GideonAct | null> {
  const hits = await searchWiki(question, limit).catch(() => [])
  if (!hits.length) return null
  const top = hits[0]
  const excerpts = hits.slice(0, 2).map((hit) => {
    const cite = hit.entityId.startsWith('wiki:') ? `[[${hit.entityId}|${hit.title}]]` : hit.title
    return `“${wikiExcerpt(hit.markdown)}” — ${cite}${hit.heading ? ` · ${hit.heading}` : ''}`
  })
  const canonical = top.entityId.startsWith('wiki:') ? undefined : top.entityId
  return {
    say: `${excerpts.join('\n')}\nFrom the wiki page “${top.title}”.`,
    module: 'codex',
    factId: canonical,
    offer: { label: `Open ${top.title}`, prompt: `tell me about ${top.title}`, factId: canonical },
    sources: top.url ? [{ title: `${top.title} — Elden Ring Wiki`, url: top.url }] : undefined,
  }
}
