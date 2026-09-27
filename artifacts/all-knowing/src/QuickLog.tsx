import { useEffect, useMemo, useRef, useState } from 'react'
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
  // Task 113 §1 — the floating + starts tucked away and only comes out once the
  // player has started scrolling, so at rest it can never sit on a readout. The
  // header `⋯` menu keeps a Quick log entry for the no-scroll case.
  const [fabHidden, setFabHidden] = useState(true)
  const toastRef = useRef<HTMLDivElement>(null)

  // Opening seeds the selection (an omnibox "Do" row) and clears the input.
  useEffect(() => {
    if (!open) return
    setText('')
    setPending(null)
    setSelected(seed && seed.length ? [...new Set(seed)] : [])
  }, [open, seed])

  // Task 107 §2: the toast is transient. A section/sub move or opening another
  // surface (the area picker announces itself) clears it, so it never lingers
  // over fresh content.
  useEffect(() => {
    function dismiss() { setToast(null) }
    window.addEventListener('allknowing:dismiss-toast', dismiss)
    return () => window.removeEventListener('allknowing:dismiss-toast', dismiss)
  }, [])
  useEffect(() => { setToast(null) }, [w.section, w.sub])

  // Task 108 §3: while the toast is up, the phone content area reserves its
  // height (plus the gap above the tab bar) so the toast can never sit on top of
  // a control. The measured height keeps it correct whatever the message wraps to.
  useEffect(() => {
    if (!toast) {
      document.body.classList.remove('toast-open')
      document.documentElement.style.removeProperty('--toast-h')
      return
    }
    document.body.classList.add('toast-open')
    const measure = () => {
      const el = toastRef.current
      document.documentElement.style.setProperty('--toast-h', `${Math.ceil(el?.getBoundingClientRect().height ?? 0)}px`)
    }
    measure()
    const raf = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      document.body.classList.remove('toast-open')
      document.documentElement.style.removeProperty('--toast-h')
    }
  }, [toast])

  // Task 113 §1 — the floating + hides while the player scrolls down and
  // returns on scroll up or after a short idle. Scroll events do not bubble, so
  // listen in the capture phase to catch every inner scroller as well as the
  // window.
  useEffect(() => {
    let lastY = 0
    function onScroll(e: Event) {
      const t = e.target as HTMLElement | Document | null
      const el =
        !t || t === document || (t as unknown) === window
          ? ((document.scrollingElement || document.documentElement) as HTMLElement)
          : (t as HTMLElement)
      const y = el?.scrollTop ?? 0
      const dy = y - lastY
      lastY = y
      // Down tucks the + away; up (or reaching the very top) brings it back.
      if (dy < -6 || y <= 8) setFabHidden(false)
      else if (dy > 6) setFabHidden(true)
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [])

  // Moving section/sub is not a scroll: tuck the button away until the player
  // scrolls in the new room.
  useEffect(() => { setFabHidden(true) }, [w.section, w.sub])

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
      <button
        type="button"
        data-tour="log"
        className={fabHidden ? 'quicklog-fab fab-hidden' : 'quicklog-fab'}
        aria-label="Quick log"
        title="Quick log"
        onClick={onOpen}
      >
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
        <div className="quicklog-toast" role="status" ref={toastRef}>
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
