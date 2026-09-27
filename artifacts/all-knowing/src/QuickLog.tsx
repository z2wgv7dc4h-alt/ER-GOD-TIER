import { useEffect, useMemo, useState } from 'react'
import { EntityLink } from './EntityLink'
import { LockoutPrompt } from './LockoutPrompt'
import {
  fuzzyLogTargets,
  nearMeTargets,
  planQuickLog,
  recentLogTargets,
  type QuickLogPlan,
  type QuickTarget,
} from './lib/quickLog'
import { useWorkspace } from './state'

/**
 * Task 99 — the quick log.
 *
 * One `+` (a floating thumb-reachable button on phone, a header button on
 * desktop) opens a sheet: one input with fuzzy suggestions, plus recent and
 * near-me rows (bosses/graces in the current area not done), multi-select, Log.
 * Committing runs `applyFacts` + inference through `planQuickLog`, warns first
 * with the shared `LockoutPrompt` when a gate would close, and leaves a toast
 * with Undo and "What now?".
 */
export function QuickLog({
  open,
  seed,
  currentArea,
  onOpen,
  onClose,
}: {
  open: boolean
  seed?: string[]
  /** Optional, read defensively: the workspace may not expose it yet. */
  currentArea?: string | null
  onOpen: () => void
  onClose: () => void
}) {
  const w = useWorkspace()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [pending, setPending] = useState<QuickLogPlan | null>(null)
  const [toast, setToast] = useState<QuickLogPlan | null>(null)

  // Opening seeds the selection (an omnibox "Do" row) and clears the input.
  useEffect(() => {
    if (!open) return
    setText('')
    setPending(null)
    setSelected(seed && seed.length ? [...new Set(seed)] : [])
  }, [open, seed])

  const fuzzy = useMemo(() => fuzzyLogTargets(text), [text])
  const recent = useMemo(() => recentLogTargets(w.recentFacts, w.character), [w.recentFacts, w.character])
  const near = useMemo(() => nearMeTargets(currentArea, w.character), [currentArea, w.character])

  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  function commit(plan: QuickLogPlan) {
    w.setCharacter(plan.character)
    setToast(plan)
    setPending(null)
    setSelected([])
    setText('')
    onClose()
  }

  function log() {
    if (!selected.length) return
    const plan = planQuickLog(w.character, selected)
    if (plan.warnings.length) {
      setPending(plan)
      return
    }
    commit(plan)
  }

  function links(targets: QuickTarget[]) {
    return targets.map((t, i) => (
      <span key={t.id}>
        {i > 0 ? ', ' : null}
        <EntityLink id={t.id} />
      </span>
    ))
  }

  function row(t: QuickTarget) {
    const on = selected.includes(t.id)
    return (
      <div className={on ? 'quicklog-row on' : 'quicklog-row'} key={t.id}>
        <input
          type="checkbox"
          checked={on}
          aria-label={`Log ${t.name}`}
          onChange={() => toggle(t.id)}
        />
        <EntityLink id={t.id} />
        <span className="note">{t.region ? `${t.kind} · ${t.region}` : t.kind}</span>
      </div>
    )
  }

  const showFuzzy = text.trim().length >= 2

  return (
    <>
      <button type="button" className="quicklog-fab" aria-label="Quick log" title="Quick log" onClick={onOpen}>
        +
      </button>

      {open && (
        <div className="quicklog-overlay" role="dialog" aria-modal="true" aria-label="Quick log" onClick={onClose}>
          <div className="quicklog-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="kicker">Quick log</div>
            <p className="note">Mark bosses, graces, and items done. Inference says what it unlocked.</p>
            <input
              className="search quicklog-input"
              autoFocus
              placeholder="killed Margit, Church of Elleh, Rold Medallion…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') log() }}
            />

            {selected.length > 0 && (
              <div className="quicklog-selected">
                {selected.map((id) => (
                  <span className="quicklog-chip" key={id}>
                    <EntityLink id={id} />
                    <button type="button" aria-label="Remove" onClick={() => toggle(id)}>×</button>
                  </span>
                ))}
              </div>
            )}

            {showFuzzy && (
              <div className="quicklog-group">
                <div className="kicker">Matches</div>
                {fuzzy.length ? fuzzy.map(row) : <p className="note">No match yet — try the exact name.</p>}
              </div>
            )}

            {near.length > 0 && (
              <div className="quicklog-group">
                <div className="kicker">Near me — not done</div>
                {near.map(row)}
              </div>
            )}

            {recent.length > 0 && (
              <div className="quicklog-group">
                <div className="kicker">Recent</div>
                {recent.map(row)}
              </div>
            )}

            <div className="opts" style={{ marginTop: 12 }}>
              <button type="button" className="chip on" disabled={!selected.length} onClick={log}>
                Log
              </button>
              <button type="button" className="chip" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="quicklog-toast" role="status">
          <p style={{ margin: 0 }}>
            Logged {links(toast.appliedTargets)} ✓
            {toast.inferred.length > 0 && <> — unlocked: {links(toast.inferred)}</>}
            {toast.next.length > 0 && <>; next: {links(toast.next)}</>}
          </p>
          <div className="opts" style={{ marginTop: 8 }}>
            <button type="button" className="chip" onClick={() => { w.undo(); setToast(null) }}>Undo</button>
            <button
              type="button"
              className="chip on"
              onClick={() => { setToast(null); w.go('journey', 'now') }}
            >
              What now?
            </button>
          </div>
        </div>
      )}

      {pending && (
        <LockoutPrompt
          warnings={pending.warnings}
          onCancel={() => setPending(null)}
          onConfirm={() => commit(pending)}
        />
      )}
    </>
  )
}
