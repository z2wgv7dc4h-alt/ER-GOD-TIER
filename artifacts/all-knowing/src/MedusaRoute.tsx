import { useEffect, useMemo, useState } from 'react'
import { medusaChapters } from './knowledge/medusa'
import { summarize } from './lib/infer'
import { loadMedusaRoute, medusaQuests, type MedusaQuest } from './lib/medusaRoute'
import { useWorkspace } from './state'

/**
 * Task 92 row 1: the Medusa 100% walkthrough is a route/checklist reference, not
 * new progress state. The current chapter is derived from the run's completion
 * fraction exactly the way Gideon's "100% spine" answer derives it; the next
 * steps are that chapter's own `medusaRoute` quests. Rendered on Journey →
 * Quests (full) and as a compact card on Journey → Now.
 */
export function MedusaRoute({
  compact = false,
  collapsedByDefault = false,
}: {
  compact?: boolean
  collapsedByDefault?: boolean
}) {
  const { character, go } = useWorkspace()
  const [steps, setSteps] = useState<MedusaQuest[] | null>(null)
  const [open, setOpen] = useState(false)
  const [bodyOpen, setBodyOpen] = useState(!collapsedByDefault)

  useEffect(() => {
    let cancelled = false
    void loadMedusaRoute()
      .then((doc) => { if (!cancelled) setSteps(medusaQuests(doc)) })
      .catch(() => { /* pack absent: fall back to the chapter list */ })
    return () => { cancelled = true }
  }, [])

  const done = summarize(character)
  const pct = done.catalog ? Math.round((done.known / done.catalog) * 100) : 0
  const index = Math.min(medusaChapters.length - 1, Math.max(0, Math.floor((pct / 100) * medusaChapters.length)))
  const chapter = medusaChapters[index]
  const actIds = useMemo(() => [...new Set(medusaChapters.map((c) => c.actId))], [])
  const actNo = actIds.indexOf(chapter.actId) + 1
  const chapterSteps = useMemo(
    () => (steps ? steps.filter((s) => s.chapterId === chapter.id) : []),
    [steps, chapter.id],
  )
  const upcoming = medusaChapters.slice(index + 1, index + 4)

  return (
    <div className="medusa-route">
      <div className="medusa-head">
        <div className="kicker">
          100% route · {actIds.length} acts · {steps ? `${steps.length} steps` : `${medusaChapters.length} chapters`}
        </div>
        {collapsedByDefault && (
          <button type="button" className="chip see-all" onClick={() => setBodyOpen((v) => !v)}>
            {bodyOpen ? 'Hide' : 'Show route'}
          </button>
        )}
      </div>
      <div className="meter medusa-meter">
        <label>
          <span>Completion</span>
          <span>{done.known}/{done.catalog} · {pct}%</span>
        </label>
        <div className="bar"><span style={{ width: `${pct}%` }} /></div>
      </div>
      {bodyOpen && (
        <>
      <h3 className="medusa-act" style={{ fontFamily: 'var(--font-display)', margin: '6px 0 4px' }}>
        Act {actNo}: {chapter.act}
      </h3>
      <p className="note" style={{ margin: '0 0 6px' }}>
        Current chapter: <strong>{chapter.name}</strong> — {chapter.goal}
      </p>

      <div className="kicker" style={{ marginTop: 12 }}>Next steps</div>
      {chapterSteps.length > 0 ? (
        <ul className="list">
          {chapterSteps.slice(0, compact ? 2 : 5).map((s) => (
            <li key={s.id} style={{ display: 'block', cursor: 'default' }}>
              <span>{s.title}</span>
              {s.goal && <p className="note" style={{ margin: '2px 0 0' }}>{s.goal}</p>}
            </li>
          ))}
        </ul>
      ) : upcoming.length > 0 ? (
        <ul className="list">
          {upcoming.map((c) => (
            <li key={c.id} style={{ display: 'block', cursor: 'default' }}>
              <span>{c.name}</span>
              <p className="note" style={{ margin: '2px 0 0' }}>{c.goal}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">Last chapter — finish the run and choose an ending.</p>
      )}

      <div className="opts" style={{ marginTop: 10 }}>
        <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : `Show all ${medusaChapters.length} chapters`}
        </button>
        {compact && (
          <button type="button" className="chip" onClick={() => go('journey', 'quests')}>Open Quests</button>
        )}
      </div>
      {open && (
        <ol className="medusa-chapters">
          {medusaChapters.map((c, i) => (
            <li key={c.id} className={i === index ? 'now' : undefined}>
              {c.act} · {c.name}
            </li>
          ))}
        </ol>
      )}
        </>
      )}
    </div>
  )
}
