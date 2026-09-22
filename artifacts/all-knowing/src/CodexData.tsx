import { useEffect, useState } from 'react'
import { WikiText } from './WikiText'
import { matchRecipes, loadRecipes, type Recipe } from './lib/recipes'
import { loadSecrets, matchSecrets, type WallSecret } from './lib/secrets'
import { loadAcquisition, matchAcquisition, type Acquisition } from './lib/acquisition'
import { findQuest, loadNpcQuests, type NpcQuest } from './lib/npcQuests'
import { loadWikiText, matchWiki, type WikiSection } from './lib/wikiText'

/**
 * Codex surfaces for the ripped packs (recipes, secrets, acquisition, NPC quest
 * steps, wiki prose). Each lazy-loads its dataset and renders nothing until the
 * query matches, mirroring the other Codex sections.
 */

export function RecipesSection({ query, preloaded }: { query: string; preloaded?: Recipe[] }) {
  const [rows, setRows] = useState<Recipe[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadRecipes().then((d) => { if (!cancelled) setRows(d.recipes) }).catch(() => {})
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchRecipes(q, data)
  if (!hits.length) return null
  return (
    <>
      <h3 className="codex-head">Crafting recipes</h3>
      <div className="codex-grid">
        {hits.map((r) => (
          <article className="card" key={r.id}>
            <div className="kicker">Craftable</div>
            <h3>{r.name}</h3>
            <p className="note"><WikiText text={r.materials.map((m) => `${m.name} x${m.qty}`).join(' · ')} /></p>
          </article>
        ))}
      </div>
    </>
  )
}

export function SecretsSection({ query, preloaded }: { query: string; preloaded?: WallSecret[] }) {
  const [rows, setRows] = useState<WallSecret[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadSecrets().then((d) => { if (!cancelled) setRows(d.walls) }).catch(() => {})
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchSecrets(q, data)
  if (!hits.length) return null
  return (
    <>
      <h3 className="codex-head">Secrets · illusory walls</h3>
      <div className="codex-grid">
        {hits.map((w) => (
          <article className="card" key={w.id}>
            <div className="kicker">{w.area}{w.heading ? ` · ${w.heading}` : ''}</div>
            <p className="note"><WikiText text={w.text} /></p>
          </article>
        ))}
      </div>
    </>
  )
}

export function AcquisitionSection({ query, preloaded }: { query: string; preloaded?: Acquisition[] }) {
  const [rows, setRows] = useState<Acquisition[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadAcquisition().then((d) => { if (!cancelled) setRows(d.rows) }).catch(() => {})
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchAcquisition(q, data)
  if (!hits.length) return null
  return (
    <>
      <h3 className="codex-head">How to get it</h3>
      <div className="codex-grid">
        {hits.map((a) => (
          <article className="card" key={a.id}>
            <div className="kicker">
              {a.method}{a.near ? ` · near ${a.near}` : ''}{a.missable ? ' · missable' : ''}
            </div>
            <h3>{a.name}</h3>
            {a.location && <p className="note"><WikiText text={a.location} /></p>}
          </article>
        ))}
      </div>
    </>
  )
}

export function QuestStepsSection({ query, preloaded }: { query: string; preloaded?: NpcQuest[] }) {
  const [rows, setRows] = useState<NpcQuest[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void loadNpcQuests().then((d) => { if (!cancelled) setRows(d.quests) }).catch(() => {})
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hit = findQuest(q, data)
  if (!hit) return null
  return (
    <>
      <h3 className="codex-head">Quest steps · {hit.npc}</h3>
      <div className="codex-grid">
        {hit.steps.slice(0, 10).map((s) => (
          <article className="card" key={s.id}>
            <div className="kicker">
              Step {s.order}{s.location ? ` · ${s.location}` : ''}{s.breaks ? ' · breaks the quest' : ''}
            </div>
            <p className="note"><WikiText text={s.action.slice(0, 500)} /></p>
          </article>
        ))}
      </div>
    </>
  )
}

export function WikiTextSection({ query, preloaded }: { query: string; preloaded?: WikiSection[] }) {
  const [rows, setRows] = useState<WikiSection[] | null>(preloaded ?? null)
  const q = query.trim()
  useEffect(() => {
    // The wiki corpus is ~6 MB; only fetch it for a substantial query.
    if (q.length < 6 || rows) return
    let cancelled = false
    void loadWikiText().then((d) => { if (!cancelled) setRows(d.sections) }).catch(() => {})
    return () => { cancelled = true }
  }, [q, rows])
  const data = preloaded ?? rows
  if (q.length < 6 || !data) return null
  const hits = matchWiki(q, data, 3)
  if (!hits.length) return null
  return (
    <>
      <h3 className="codex-head">Wiki</h3>
      <div className="codex-grid">
        {hits.map((h) => (
          <article className="card" key={h.id}>
            <div className="kicker">{h.page}{h.heading ? ` · ${h.heading}` : ''}</div>
            <p className="note"><WikiText text={h.text.slice(0, 900)} /></p>
          </article>
        ))}
      </div>
    </>
  )
}
