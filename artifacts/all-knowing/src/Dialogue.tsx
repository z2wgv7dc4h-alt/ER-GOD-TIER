import { useEffect, useState } from 'react'
import { DIALOGUE_TABLES, loadGameTextTable, searchGameText } from './lib/gameText'

type Tables = Record<string, Record<string, string>>

/**
 * Verbatim dialogue search. Filters the game's own TalkMsg / EventTextForTalk /
 * GR_Dialogues tables (extracted by scripts/extract-game-text.py) against the
 * command-bar query and shows the matching lines unchanged, each tagged with
 * its table and message id as provenance.
 *
 * The tables are ~600 KB, so they are fetched only once the query is long
 * enough to be worth it, then kept for the session. Attribution to a named
 * speaker is not shown because the game's own param data does not carry one
 * (TalkParam is msgId/voiceId only); lines are quoted as-is, not paraphrased.
 *
 * `preloaded` exists for tests / callers that already hold the tables.
 */
export function DialogueHits({
  query,
  limit = 20,
  preloaded,
}: {
  query: string
  limit?: number
  preloaded?: Tables
}) {
  const [loaded, setLoaded] = useState<Tables | null>(preloaded ?? null)
  const q = query.trim()

  useEffect(() => {
    if (q.length < 3 || loaded) return
    let cancelled = false
    void Promise.all(
      DIALOGUE_TABLES.map((t) => loadGameTextTable(t).catch(() => ({}) as Record<string, string>)),
    ).then((rows) => {
      if (cancelled) return
      setLoaded(Object.fromEntries(DIALOGUE_TABLES.map((t, i) => [t, rows[i]])))
    })
    return () => {
      cancelled = true
    }
  }, [q, loaded])

  const tables = preloaded ?? loaded
  if (q.length < 3 || !tables) return null
  const hits = searchGameText(tables, q, limit)
  if (hits.length === 0) return null

  return (
    <>
      <h3 className="codex-head">Dialogue · verbatim (game text)</h3>
      <div className="codex-grid">
        {hits.map((h) => (
          <article className="card" key={`${h.table}:${h.id}`}>
            <div className="kicker">{h.table} · {h.id}</div>
            <p>{h.text}</p>
          </article>
        ))}
      </div>
    </>
  )
}
