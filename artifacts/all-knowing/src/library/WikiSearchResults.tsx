import { useEffect, useMemo, useState } from 'react'
import { searchWiki, wikiSnippet, type WikiSearchHit } from '../lib/wikiSearch'
import { EmptyState } from '../ui'

/**
 * Task 133 §3 — a reusable "Wiki" result group from full-text search. Used by
 * the Library browser and Guides' dedicated search box; the omnibox embeds the
 * same `searchWiki` engine directly so its keyboard navigation stays unified.
 * Each row opens the section's entity (or wiki-only page) through `onPick`.
 */
function highlight(text: string, query: string) {
  const words = query
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length >= 3)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!words.length) return text
  const re = new RegExp(`(${words.join('|')})`, 'gi')
  return text.split(re).map((part, index) => (index % 2 === 1 ? <mark key={index}>{part}</mark> : part))
}

export function WikiSearchResults({
  query,
  limit = 6,
  onPick,
  heading = 'Wiki',
}: {
  query: string
  limit?: number
  onPick: (entityId: string) => void
  heading?: string
}) {
  const [hits, setHits] = useState<WikiSearchHit[]>([])
  const [settled, setSettled] = useState(query)

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(query), 150)
    return () => window.clearTimeout(id)
  }, [query])

  useEffect(() => {
    const q = settled.trim()
    if (q.length < 3) {
      setHits([])
      return
    }
    let cancelled = false
    void searchWiki(q, limit)
      .then((found) => { if (!cancelled) setHits(found) })
      .catch(() => { if (!cancelled) setHits([]) })
    return () => { cancelled = true }
  }, [settled, limit])

  const rows = useMemo(
    () => hits.map((hit) => ({ ...hit, snippet: wikiSnippet(hit.markdown, settled) })),
    [hits, settled],
  )

  if (query.trim().length < 3) return null
  if (!rows.length) return <EmptyState line="No wiki sections match yet." />

  return (
    <section className="wiki-results" aria-label={`${heading} results`}>
      <div className="kicker">{heading} · {rows.length}</div>
      {rows.map((hit) => (
        <button
          key={`${hit.pageId}:${hit.heading}`}
          type="button"
          className="wiki-result"
          onClick={() => onPick(hit.entityId)}
        >
          <header>
            <strong>{hit.title}</strong>
            {hit.heading && <span className="note"> · {hit.heading}</span>}
          </header>
          <div className="note">{highlight(hit.snippet, settled)}</div>
        </button>
      ))}
    </section>
  )
}
