import { useEffect, useState, type CSSProperties } from 'react'
import {
  TOUR_STEPS,
  endTour,
  hasSeenTour,
  subscribeTour,
  tourIsOpen,
  type TourStep,
} from './tourStore'

/**
 * Task 117 §2 / Task 118 §1 — the first-run tour overlay.
 *
 * `TourCoach` is the pure card (so it can be asserted with server rendering);
 * `Tour` owns the show-once state, the step index, the best-effort highlight of
 * its target and Escape-to-skip. Task 118 fixed the card rendering straight over
 * the page: each mark is now an opaque panel over a dim scrim, with a pointer
 * arrow, anchored above the phone tab it describes (or below the desktop section
 * tab). The scrim swallows pointer events, so nothing behind the tour is
 * clickable while it is showing.
 */

const CARD_WIDTH = 320
const ARROW = 10

type Placement = { card: CSSProperties; arrow: CSSProperties; side: 'top' | 'bottom' }

/** Where to hang the card relative to its target: above the tab on phone, below it on desktop. */
function place(rect: DOMRect | null): Placement {
  if (typeof window === 'undefined' || !rect) {
    return {
      card: { left: '50%', bottom: 96, transform: 'translateX(-50%)' },
      arrow: { display: 'none' },
      side: 'bottom',
    }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(CARD_WIDTH, vw - 24)
  const cx = rect.left + rect.width / 2
  const left = Math.min(Math.max(12, cx - width / 2), Math.max(12, vw - width - 12))
  const arrowLeft = Math.min(Math.max(16, cx - left), width - 16)
  if (vw <= 700) {
    return {
      card: { left, bottom: Math.max(12, vh - rect.top + ARROW), width },
      arrow: { left: arrowLeft },
      side: 'bottom',
    }
  }
  return {
    card: { left, top: Math.min(Math.max(12, rect.bottom + ARROW), Math.max(12, vh - 140)), width },
    arrow: { left: arrowLeft },
    side: 'top',
  }
}

export function TourCoach({
  step,
  index,
  total,
  onNext,
  onSkip,
  onBack,
  rect = null,
}: {
  step: TourStep
  index: number
  total: number
  onNext: () => void
  onSkip: () => void
  onBack?: () => void
  rect?: DOMRect | null
}) {
  const last = index + 1 >= total
  const { card, arrow, side } = place(rect)
  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="First-run tour"
      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
    >
      <div className="tour-scrim" aria-hidden />
      <div
        className="tour-coach panel"
        style={{ position: 'fixed', maxWidth: 'calc(100vw - 24px)', padding: 16, ...card }}
      >
        <span className={`tour-arrow ${side}`} style={arrow} aria-hidden />
        <div className="kicker">Step {index + 1} of {total}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0' }}>{step.title}</h3>
        <p className="note" style={{ margin: 0 }}>{step.body}</p>
        <div className="opts" style={{ marginTop: 14 }}>
          {index > 0 && onBack && (
            <button type="button" className="chip" style={{ minHeight: 40 }} onClick={onBack}>
              Back
            </button>
          )}
          <button type="button" className="chip" style={{ minHeight: 40 }} onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="chip on" style={{ minHeight: 40 }} onClick={onNext}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Tour() {
  // First run: auto-open once. Replays come through `startTour()`.
  const [open, setOpen] = useState(() => !hasSeenTour())
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR_STEPS[index]

  useEffect(() => subscribeTour(() => {
    setOpen(tourIsOpen())
    if (tourIsOpen()) setIndex(0)
  }), [])

  useEffect(() => {
    // Several elements can carry the same marker (desktop tab vs phone tab vs the
    // hidden FAB); point at the first one that is actually laid out. Measuring the
    // DOM is the one external system this overlay synchronises with.
    const point = open && step?.target && typeof document !== 'undefined'
      ? ([...document.querySelectorAll(step.target)]
          .map((el) => el.getBoundingClientRect())
          .find((r) => r.width > 0 && r.height > 0) ?? null)
      : null
    // oxlint-disable-next-line react/set-state-in-effect
    setRect(point)
  }, [open, index, step])

  // Task 118 §1: Escape skips the tour, like the Skip button.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        endTour(true)
        setIndex(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || !step) return null

  function next() {
    if (index + 1 >= TOUR_STEPS.length) {
      endTour(true)
      setIndex(0)
      return
    }
    setIndex(index + 1)
  }

  function skip() {
    endTour(true)
    setIndex(0)
  }

  return (
    <TourCoach
      step={step}
      index={index}
      total={TOUR_STEPS.length}
      onNext={next}
      onSkip={skip}
      onBack={() => setIndex((i) => Math.max(0, i - 1))}
      rect={rect}
    />
  )
}
