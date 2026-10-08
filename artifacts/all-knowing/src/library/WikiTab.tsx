import { useEffect, useState } from 'react'
import { canonicalEntityId } from '../lib/entityGraph'
import { WikiMarkdown } from '../WikiMarkdown'
import { wikiPageForEntity, type WikiCorpusPage, type WikiPageMeta } from '../lib/wikiSearch'

/**
 * Task 133 §2 — the Wiki tab: the entity's full wiki page as collapsible
 * sections, with cross-links rendered as EntityLinks. Loaded lazily from the
 * exported corpus; the service worker caches the chunks. Task 181: the sections
 * are the content, so no outbound wiki chip is rendered.
 */
export function WikiTab({ entityId }: { entityId: string }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'missing' } | { status: 'ready'; meta: WikiPageMeta; page: WikiCorpusPage }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    const canonical = canonicalEntityId(entityId)
    void wikiPageForEntity(entityId)
      .then((found) => (found ?? (canonical !== entityId ? wikiPageForEntity(canonical) : null)))
      .then((found) => {
        if (cancelled) return
        setState(found ? { status: 'ready', meta: found.meta, page: found.page } : { status: 'missing' })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'missing' })
      })
    return () => {
      cancelled = true
    }
  }, [entityId])

  if (state.status === 'loading') return <p className="note lib-skeleton-note">Loading wiki page…</p>
  if (state.status === 'missing') return <p className="note">No wiki page for this entry yet.</p>

  const { page } = state
  return (
    <div className="wiki-tab">
      <div className="wiki-tab-head">
        <div className="kicker">{page.kind} · {page.sections.length} sections</div>
      </div>
      {page.sections.length === 0 && <p className="note">This wiki page has no section prose.</p>}
      {page.sections.map((section, index) => (
        <details className="wiki-section" key={`${section.heading}-${index}`} open={index === 0}>
          <summary>
            {section.heading || `Section ${index + 1}`}
            <span className="wiki-section-source" aria-hidden>wiki</span>
          </summary>
          <WikiMarkdown className="wiki-markdown" text={section.markdown} />
        </details>
      ))}
    </div>
  )
}
