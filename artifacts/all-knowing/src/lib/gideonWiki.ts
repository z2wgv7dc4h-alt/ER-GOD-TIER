import type { GideonAct } from './gideon'
import { fold, resolveQuestionSubjects } from './gideonGrounded'
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
  // Fetch a wider candidate set than we quote, so a passage that mentions the
  // subject can win over a higher-scoring but unrelated one.
  const hits = await searchWiki(question, Math.max(limit * 4, 12)).catch(() => [])
  if (!hits.length) return null
  // Task 168 §5 — never answer from a passage that does not mention the subject
  // the question is about. When the entity index is loaded (offline path) and the
  // question names a subject, keep only passages that mention that subject or are
  // its own page; if none do, decline rather than quote an unrelated article.
  const subjects = resolveQuestionSubjects(question)
  let candidates = hits
  if (subjects.length) {
    const mentions = (hit: (typeof hits)[number]) => {
      for (const s of subjects) {
        if (hit.entityId === s.id) return true
        const hay = fold(`${hit.title} ${hit.heading} ${hit.markdown}`)
        if (s.names.some((n) => hay.includes(n))) return true
      }
      return false
    }
    const related = hits.filter(mentions)
    if (!related.length) return null
    candidates = related
  }
  const top = candidates[0]
  const excerpts = candidates.slice(0, 2).map((hit) => {
    const cite = hit.entityId.startsWith('wiki:') ? `[[${hit.entityId}|${hit.title}]]` : hit.title
    return `“${wikiExcerpt(hit.markdown)}” — ${cite}${hit.heading ? ` · ${hit.heading}` : ''}`
  })
  const canonical = top.entityId.startsWith('wiki:') ? undefined : top.entityId
  // Task 178 — the passage can answer a question that names more than one
  // subject (a "X vs Y" comparison); link every subject the question named so
  // the caller sees all the entities the answer is about, not just the page.
  const subjectLinks = subjects.map((s) => s.id).filter((id) => !id.startsWith('wiki:'))
  return {
    say: `${excerpts.join('\n')}\nFrom the wiki page “${top.title}”.`,
    module: 'codex',
    factId: canonical,
    links: subjectLinks.length ? subjectLinks : undefined,
    offer: { label: `Open ${top.title}`, prompt: `tell me about ${top.title}`, factId: canonical },
    sources: top.url ? [{ title: `${top.title} — Elden Ring Wiki`, url: top.url }] : undefined,
  }
}
