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
 * Task 117 §2 — the first-run tour overlay.
 *
 * `TourCoach` is the pure card (so it can be asserted with server rendering);
 * `Tour` owns the show-once state, the step index and the best-effort highlight
 * of its target. Styles are inline so the tour needs no shared stylesheet rules.
 */

const CARD_WIDTH = 320

function clampPosition(rect: DOMRect): CSSProperties {
  if (typeof window === 'undefined') return {}
  const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - CARD_WIDTH - 12))
  const below = rect.bottom + 10
  const top = below + 180 > window.innerHeight ? Math.max(12, rect.top - 190) : below
  return { left, top }
}

export function TourCoach({
  step,
  index,
  total,
  onNext,
  onSkip,
  rect = null,
}: {
  step: TourStep
  index: number
  total: number
  onNext: () => void
  onSkip: () => void
  rect?: DOMRect | null
}) {
  const last = index + 1 >= total
  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="false"
      aria-label="First-run tour"
      style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}
    >
      <div
        className="tour-coach panel"
        style={{
          position: 'fixed',
          width: CARD_WIDTH,
          maxWidth: 'calc(100vw - 24px)',
          padding: 16,
          pointerEvents: 'auto',
          ...(rect ? clampPosition(rect) : { left: '50%', bottom: 90, transform: 'translateX(-50%)' }),
        }}
      >
        <div className="kicker">Step {index + 1} of {total}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0' }}>{step.title}</h3>
        <p className="note" style={{ margin: 0 }}>{step.body}</p>
        <div className="opts" style={{ marginTop: 14 }}>
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

  return <TourCoach step={step} index={index} total={TOUR_STEPS.length} onNext={next} onSkip={skip} rect={rect} />
}
