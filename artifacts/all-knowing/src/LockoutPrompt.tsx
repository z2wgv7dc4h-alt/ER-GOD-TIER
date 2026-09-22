import type { LockWarning } from './lib/lockWarnings'

/**
 * Confirm-before-commit prompt (Task 50) shared by both completion paths —
 * Quests.tsx's mark-done and Gideon's markDone / "I'm done". Names the real
 * consequence from `planRoute`'s lockout data before anything is ticked.
 */
export function LockoutPrompt({
  warnings,
  onConfirm,
  onCancel,
}: {
  warnings: LockWarning[]
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="lockout-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="This can lock a line"
      onClick={onCancel}
    >
      <div className="lockout-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="kicker">This can lock a line</div>
        <p className="note">Marking this done forecloses:</p>
        <ul className="list">
          {warnings.map((w) => (
            <li key={w.lineId}>
              <span>{w.lineName}</span>
              <span className="dim">
                {w.steps.length ? w.steps.map((s) => s.do).join('; ') : w.note ?? 'no reachable beats left'}
              </span>
            </li>
          ))}
        </ul>
        <div className="opts" style={{ marginTop: 12 }}>
          <button type="button" className="chip" onClick={onCancel}>Cancel</button>
          <button type="button" className="chip on" onClick={onConfirm}>Mark done anyway</button>
        </div>
      </div>
    </div>
  )
}
