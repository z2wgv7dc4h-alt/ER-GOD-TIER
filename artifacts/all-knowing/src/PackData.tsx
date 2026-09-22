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
import { loadBossDrops, matchBossDrops, type FextBoss } from './lib/bosses'
import { guideExcerpts, loadGuides, matchGuides, type GuideExcerpt } from './lib/guides'
import {
  loadNpcPlacements,
  matchNpcPlacements,
  type NpcPlacement,
} from './lib/npcPlacements'

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
      <h3 className="codex-head">Map locations Â· EldenRingMap pack</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={`${r.kind}:${r.name}:${r.region}`}>
            <div className="kicker">{r.kind} Â· {r.region} Â· {r.world}</div>
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
      <h3 className="codex-head">Checklist Â· ER Checklist pack</h3>
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
      <h3 className="codex-head">Walkthrough Â· Medusa 100% route</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={r.id}>
            <div className="kicker">{r.actName} Â· {r.chapterName} Â· {r.type}</div>
            <h3>{r.title}</h3>
            <p className="note">{r.summary}</p>
            {r.directions && <p className="note">{r.directions}</p>}
          </article>
        ))}
      </div>
    </>
  )
}

/** Placed NPCs/enemies from the map MSBs, with map count. */
export function NpcPlacementSection({ query, preloaded }: { query: string; preloaded?: NpcPlacement[] }) {
  const [rows, setRows] = useState<NpcPlacement[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadNpcPlacements()
      .then((doc) => { if (!cancelled) setRows(doc.placements) })
      .catch(() => { /* dataset absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchNpcPlacements(q, data)
  if (hits.length === 0) return null
  const byName = new Map<string, NpcPlacement[]>()
  for (const h of hits) {
    const list = byName.get(h.name) ?? []
    list.push(h)
    byName.set(h.name, list)
  }
  return (
    <>
      <h3 className="codex-head">NPC placements Â· from the map files</h3>
      <div className="codex-grid">
        {[...byName.entries()].map(([name, list]) => (
          <article className="card" key={name}>
            <div className="kicker">{list.length} placement{list.length === 1 ? '' : 's'} Â· map MSB</div>
            <h3>{name}</h3>
            <p className="note">{[...new Set(list.map((p) => p.map))].sort().join(', ')}</p>
          </article>
        ))}
      </div>
    </>
  )
}

/** Boss drops from the Fextralife scrape (base + SotE). */
export function BossDropsSection({ query, preloaded }: { query: string; preloaded?: FextBoss[] }) {
  const [rows, setRows] = useState<FextBoss[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadBossDrops()
      .then((d) => { if (!cancelled) setRows(d.bosses) })
      .catch(() => { /* dataset absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchBossDrops(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Bosses Â· drops (Fextralife)</h3>
      <div className="codex-grid">
        {hits.map((b) => (
          <article className="card" key={b.name}>
            <div className="kicker">{b.locations.join(' / ') || 'boss'}{b.hp ? ` Â· ${b.hp} HP` : ''}</div>
            <h3>{b.name}</h3>
            <p className="note">{b.drops.length ? b.drops.join(' Â· ') : 'no drops listed'}</p>
          </article>
        ))}
      </div>
    </>
  )
}

/** Fextralife guide excerpts matching the query. */
export function GuidesSection({ query, preloaded }: { query: string; preloaded?: GuideExcerpt[] }) {
  const [rows, setRows] = useState<GuideExcerpt[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadGuides()
      .then((d) => { if (!cancelled) setRows(guideExcerpts(d)) })
      .catch(() => { /* dataset absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchGuides(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Guides · Fextralife</h3>
      <div className="codex-grid">
        {hits.map((g, i) => (
          <article className="card" key={g.page + ':' + g.heading + ':' + i}>
            <div className="kicker">{g.page} · {g.heading}</div>
            <p className="note">{g.text.slice(0, 600)}</p>
          </article>
        ))}
      </div>
    </>
  )
}
