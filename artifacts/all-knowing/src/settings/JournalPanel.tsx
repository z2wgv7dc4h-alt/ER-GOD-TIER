import { useMemo, useState } from 'react'
import { useWorkspace } from '../state'
import {
  buildJournal,
  exportJournalMarkdown,
  journalSources,
  type JournalFilter,
} from './journal'

function downloadText(fileName: string, text: string) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* non-browser / blocked */ }
}

/**
 * Task 112 §4 — Tarnished › Overview journal. A newest-first timeline of logged
 * facts with their source and date, a source filter, and a Markdown export.
 */
export function Journal() {
  const { character } = useWorkspace()
  const sources = useMemo(() => journalSources(character), [character])
  const [filter, setFilter] = useState<JournalFilter>('all')
  const entries = useMemo(() => buildJournal(character, filter), [character, filter])

  return (
    <section className="panel journal">
      <div className="kicker">Journal · {entries.length}</div>
      <p className="note">Every logged fact, newest first, with where it came from.</p>
      <div className="opts journal-filters">
        <button
          type="button"
          className={filter === 'all' ? 'chip on' : 'chip'}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {sources.map((source) => (
          <button
            key={source}
            type="button"
            className={filter === source ? 'chip on' : 'chip'}
            aria-pressed={filter === source}
            onClick={() => setFilter(source)}
          >
            {source}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          disabled={!entries.length}
          onClick={() => downloadText(`journal-${character.name || 'tarnished'}.md`, exportJournalMarkdown(entries, { name: character.name }))}
        >
          Export Markdown
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="note">Nothing logged yet. The journal fills as you mark and pick things up.</p>
      ) : (
        <ol className="journal-timeline">
          {entries.slice(0, 200).map((e) => (
            <li key={e.id} className="journal-row">
              <time dateTime={new Date(e.at).toISOString()}>
                {new Date(e.at).toLocaleDateString()}
              </time>
              <span>{e.claim === 'true' ? e.label : `not found: ${e.label}`}</span>
              <span className="note">{e.source}{e.detail ? ` · ${e.detail}` : ''}</span>
            </li>
          ))}
        </ol>
      )}
      {entries.length > 200 && <p className="note">+{entries.length - 200} older entries — export for all.</p>}
    </section>
  )
}
