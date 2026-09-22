import { useEffect, useState } from 'react'
import { DIALOGUE_TABLES, loadGameTextTable, searchGameText } from './lib/gameText'
import { loadDialogueOwners, speakerLabel, type DialogueOwners } from './lib/dialogueOwners'

type Tables = Record<string, Record<string, string>>

/**
 * Verbatim dialogue search. Filters the game's own TalkMsg / EventTextForTalk /
 * GR_Dialogues tables (extracted by scripts/extract-game-text.py) against the
 * command-bar query and shows the matching lines unchanged, each tagged with
 * its table and message id as provenance.
 *
 * When the line is attributed to a speaker (from the ESD-derived owners table),
 * the speaker is shown; an un-attributed line still renders, just without one —
 * nothing is guessed. Token/size note: the tables are ~600 KB, so they are
 * fetched only once the query is long enough to be worth it, then kept.
 *
 * `preloaded` exists for tests / callers that already hold the data.
 */
export function DialogueHits({
  query,
  limit = 20,
  preloaded,
  owners,
}: {
  query: string
  limit?: number
  preloaded?: Tables
  owners?: DialogueOwners
}) {
  const [loaded, setLoaded] = useState<Tables | null>(preloaded ?? null)
  const [ownersLoaded, setOwnersLoaded] = useState<DialogueOwners | null>(owners ?? null)
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
    if (!ownersLoaded) {
      void loadDialogueOwners()
        .then((o) => { if (!cancelled) setOwnersLoaded(o) })
        .catch(() => { /* owners are optional; lines still render without them */ })
    }
    return () => {
      cancelled = true
    }
  }, [q, loaded, ownersLoaded])

  const tables = preloaded ?? loaded
  const own = owners ?? ownersLoaded
  if (q.length < 3 || !tables) return null
  const hits = searchGameText(tables, q, limit)
  if (hits.length === 0) return null

  return (
    <>
      <h3 className="codex-head">Dialogue · verbatim (game text)</h3>
      <div className="codex-grid">
        {hits.map((h) => {
          const speaker = own ? speakerLabel(own, h.id) : undefined
          return (
            <article className="card" key={`${h.table}:${h.id}`}>
              <div className="kicker">{speaker ? `${speaker} · ` : ''}{h.table} · {h.id}</div>
              <p>{h.text}</p>
            </article>
          )
        })}
      </div>
    </>
  )
}
