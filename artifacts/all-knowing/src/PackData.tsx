import { useEffect, useState } from 'react'
import {
  erclItems,
  ermLocations,
  loadEldenringMap,
  loadErcl,
  matchErcl,
  matchErm,
  type ErclItem,
  type ErmLocation,
} from './lib/packs'
import { loadMedusaRoute, matchMedusa, medusaQuests, type MedusaQuest } from './lib/medusaRoute'

/** Map locations (graces/dungeons/merchants) from the EldenRingMap pack. */
export function EldenringMapSection({ query, preloaded }: { query: string; preloaded?: ErmLocation[] }) {
  const [rows, setRows] = useState<ErmLocation[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadEldenringMap()
      .then((doc) => { if (!cancelled) setRows(ermLocations(doc)) })
      .catch(() => { /* pack absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchErm(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Map locations · EldenRingMap pack</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={`${r.kind}:${r.name}:${r.region}`}>
            <div className="kicker">{r.kind} · {r.region} · {r.world}</div>
            <h3>{r.name}</h3>
          </article>
        ))}
      </div>
    </>
  )
}

/** Item list from the ER Checklist pack (1.16, base + SotE). */
export function ErclSection({ query, preloaded }: { query: string; preloaded?: ErclItem[] }) {
  const [rows, setRows] = useState<ErclItem[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadErcl()
      .then((doc) => { if (!cancelled) setRows(erclItems(doc)) })
      .catch(() => { /* pack absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchErcl(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Checklist · ER Checklist pack</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={`${r.category}:${r.name}`}>
            <div className="kicker">{r.category}</div>
            <h3>{r.name}</h3>
          </article>
        ))}
      </div>
    </>
  )
}

/** Medusa 100% walkthrough steps matching the query. */
export function MedusaSection({ query, preloaded }: { query: string; preloaded?: MedusaQuest[] }) {
  const [rows, setRows] = useState<MedusaQuest[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadMedusaRoute()
      .then((doc) => { if (!cancelled) setRows(medusaQuests(doc)) })
      .catch(() => { /* pack absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchMedusa(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Walkthrough · Medusa 100% route</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={r.id}>
            <div className="kicker">{r.actName} · {r.chapterName} · {r.type}</div>
            <h3>{r.title}</h3>
            <p className="note">{r.summary}</p>
            {r.directions && <p className="note">{r.directions}</p>}
          </article>
        ))}
      </div>
    </>
  )
}
