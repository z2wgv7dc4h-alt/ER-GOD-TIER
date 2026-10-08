import { useEffect, useMemo, useState } from 'react'
import { WikiText } from './WikiText'
import { PAGE_SIZE, ShowMore } from './ShowMore'
import { useWorkspaceOptional } from './state'
import {
  erclItems,
  loadErcl,
  matchErcl,
  type ErclItem,
} from './lib/packs'
import {
  loadEngineMarkers,
  matchEngineItems,
  type EngineItem,
} from './lib/engineMarkers'
import { loadMedusaRoute, matchMedusa, medusaQuests, type MedusaQuest } from './lib/medusaRoute'
import { loadBossDrops, matchBossDrops, type FextBoss } from './lib/bosses'
import { guideExcerpts, loadGuides, matchGuides, type GuideExcerpt } from './lib/guides'
import { loadMetaBuilds, matchMeta, metaExcerpts, type MetaExcerpt } from './lib/metaBuilds'
import {
  loadNpcPlacements,
  matchNpcPlacements,
  type NpcPlacement,
} from './lib/npcPlacements'

/** Named pickups from the engine's own map data, with nearest grace. */
export function EngineItemSection({ query, preloaded }: { query: string; preloaded?: EngineItem[] }) {
  const [rows, setRows] = useState<EngineItem[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadEngineMarkers()
      .then((d) => { if (!cancelled) setRows(d.items) })
      .catch(() => { /* engine data absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  // The engine dump can repeat an id across maps; keep one row per id so the
  // React key is unique (and the list is not literal duplicates).
  const seenIds = new Set<string>()
  const hits = matchEngineItems(q, data).filter((r) => {
    if (seenIds.has(r.id)) return false
    seenIds.add(r.id)
    return true
  })
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Where to find · engine map</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={r.id}>
            <div className="kicker">{r.cat} · {r.map || '—'}</div>
            <h3>{r.name}</h3>
            {r.near && <p className="note">Nearest grace: {r.near}</p>}
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
            <p className="note"><WikiText text={r.summary} /></p>
            {r.directions && <p className="note"><WikiText text={r.directions} /></p>}
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
      <h3 className="codex-head">NPC placements · from the map files</h3>
      <div className="codex-grid">
        {[...byName.entries()].map(([name, list]) => (
          <article className="card" key={name}>
            <div className="kicker">{list.length} placement{list.length === 1 ? '' : 's'} · map MSB</div>
            <h3>{name}</h3>
            <p className="note">{[...new Set(list.map((p) => p.map))].sort().join(', ')}</p>
          </article>
        ))}
      </div>
    </>
  )
}

/** Boss drops from the Fextralife scrape (base + SotE). */
export function BossDropsSection({ query, preloaded, browse = false }: { query: string; preloaded?: FextBoss[]; browse?: boolean }) {
  const [rows, setRows] = useState<FextBoss[] | null>(preloaded ?? null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const q = query.trim()
  const show = browse || q.length >= 3
  useEffect(() => {
    if (!show || rows) return
    let cancelled = false
    void loadBossDrops()
      .then((d) => { if (!cancelled) setRows(d.bosses) })
      .catch(() => { /* dataset absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [show, rows])
  const data = preloaded ?? rows
  if (!show || !data) return null
  const matched = browse ? data.slice(0, limit) : matchBossDrops(q, data)
  // A boss can have more than one scraped row; collapse them so the name key
  // stays unique instead of rendering the same card twice.
  const seenNames = new Set<string>()
  const hits = matched.filter((b) => {
    if (seenNames.has(b.name)) return false
    seenNames.add(b.name)
    return true
  })
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Bosses · drops (Fextralife)</h3>
      <div className="codex-grid">
        {hits.map((b) => (
          <article className="card" key={b.name}>
            <div className="kicker">{b.locations.join(' / ') || 'boss'}{b.hp ? ` · ${b.hp} HP` : ''}</div>
            <h3>{b.name}</h3>
            <p className="note"><WikiText text={b.drops.length ? b.drops.join(' · ') : 'no drops listed'} /></p>
          </article>
        ))}
      </div>
      {browse && <ShowMore total={data.length} shown={limit} onMore={() => setLimit((n) => n + PAGE_SIZE)} />}
    </>
  )
}

/** Fextralife guide excerpts matching the query. */
export function GuidesSection({ query, preloaded, browse = false }: { query: string; preloaded?: GuideExcerpt[]; browse?: boolean }) {
  const [rows, setRows] = useState<GuideExcerpt[] | null>(preloaded ?? null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const q = query.trim()
  const show = browse || q.length >= 3
  useEffect(() => {
    if (!show || rows) return
    let cancelled = false
    void loadGuides()
      .then((d) => { if (!cancelled) setRows(guideExcerpts(d)) })
      .catch(() => { /* dataset absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [show, rows])
  const data = preloaded ?? rows
  if (!show || !data) return null
  const hits = browse ? data.slice(0, limit) : matchGuides(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Guides · Fextralife</h3>
      <div className="codex-grid">
        {hits.map((g, i) => (
          <article className="card" key={g.page + ':' + g.heading + ':' + i}>
            <div className="kicker">{g.page} · {g.heading}</div>
            <p className="note"><WikiText text={g.text.slice(0, 600)} /></p>
            {g.text.length > 600 && (
              <details className="kit-sources">
                <summary>Open full guide</summary>
                <p className="note"><WikiText text={g.text} /></p>
              </details>
            )}
          </article>
        ))}
      </div>
      {browse && <ShowMore total={data.length} shown={limit} onMore={() => setLimit((n) => n + PAGE_SIZE)} />}
    </>
  )
}

/**
 * Task 165 §10 — "Guides for this …" cross-links. A boss, area or map pin names
 * a query; the matching Fextralife excerpts expand in place (Task 181: the stored
 * text, not an outbound wiki link) and a chip jumps to Library › Guides with the
 * same query. Nothing is invented: only excerpts already in the scraped corpus
 * are listed.
 */
export function GuidesFor({ query, heading, limit = 3 }: { query?: string; heading: string; limit?: number }) {
  const w = useWorkspaceOptional()
  const [rows, setRows] = useState<GuideExcerpt[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadGuides()
      .then((d) => { if (!cancelled) setRows(guideExcerpts(d)) })
      .catch(() => { /* dataset absent: block stays hidden */ })
    return () => { cancelled = true }
  }, [])
  const q = (query ?? '').trim()
  const hits = useMemo(() => (rows && q.length >= 3 ? matchGuides(q, rows, limit) : []), [rows, q, limit])
  if (!rows || !q) return null
  return (
    <div className="lib-panel-block">
      <div className="kicker">{heading}</div>
      {hits.length === 0 ? (
        <p className="note">No matching guide excerpt on file.</p>
      ) : (
        <ul className="area-list">
          {hits.map((g, i) => (
            <li key={`${g.page}:${g.heading}:${i}`}>
              <details className="kit-sources">
                <summary>{g.heading}{g.page ? ` · ${g.page}` : ''}</summary>
                <p className="note"><WikiText text={g.text} /></p>
              </details>
            </li>
          ))}
        </ul>
      )}
      {w && (
        <button
          type="button"
          className="chip"
          onClick={() => { w.setQuery(q); w.go('library', 'guides') }}
        >
          Open Guides
        </button>
      )}
    </div>
  )
}

/** Meta builds + status/strat excerpts (Fextralife). */
export function MetaBuildsSection({ query, preloaded, browse = false }: { query: string; preloaded?: MetaExcerpt[]; browse?: boolean }) {
  const [rows, setRows] = useState<MetaExcerpt[] | null>(preloaded ?? null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const q = query.trim()
  const show = browse || q.length >= 3
  useEffect(() => {
    if (!show || rows) return
    let cancelled = false
    void loadMetaBuilds()
      .then((d) => { if (!cancelled) setRows(metaExcerpts(d)) })
      .catch(() => { /* dataset absent: section stays hidden */ })
    return () => { cancelled = true }
  }, [show, rows])
  const data = preloaded ?? rows
  if (!show || !data) return null
  const hits = browse ? data.slice(0, limit) : matchMeta(q, data)
  if (hits.length === 0) return null
  return (
    <>
      <h3 className="codex-head">Builds &amp; strats · Fextralife</h3>
      <div className="codex-grid">
        {hits.map((g, i) => (
          <article className="card" key={g.page + ':' + g.heading + ':' + i}>
            <div className="kicker">{g.page} · {g.heading}</div>
            <p className="note"><WikiText text={g.text.slice(0, 600)} /></p>
          </article>
        ))}
      </div>
      {browse && <ShowMore total={data.length} shown={limit} onMore={() => setLimit((n) => n + PAGE_SIZE)} />}
    </>
  )
}
