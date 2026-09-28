import { areaLabel, isAreaStale } from '../lib/areaContext'
import { useWorkspace } from '../state'

/** Task 98 — "Still in <area>?" for an area older than 45 minutes of app use. */
export function AreaPrompt({ className = 'panel area-prompt' }: { className?: string }) {
  const w = useWorkspace()
  if (!isAreaStale(w.currentArea)) return null
  const label = areaLabel(w.currentArea)
  return (
    <section className={className}>
      <div className="kicker">Still in {label}?</div>
      <div className="opts">
        <button
          type="button"
          className="chip on"
          onClick={() => w.setCurrentArea(w.currentArea ? { ...w.currentArea, at: Date.now() } : null)}
        >
          Yes
        </button>
        <button type="button" className="chip" onClick={() => w.go('journey', 'area')}>
          Moved →
        </button>
      </div>
    </section>
  )
}
