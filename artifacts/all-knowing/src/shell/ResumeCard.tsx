import { EntityLink } from '../EntityLink'
import { useWorkspace } from '../state'

/**
 * Task 100 §1 — the dismissible "Welcome back" card (Usage model moment 1).
 *
 * It is only mounted when the workspace decided a real gap elapsed since the
 * last visit; this component just renders the sentence and the link back to the
 * beat. Dismissing clears it for the session without touching the new snapshot.
 */
export function ResumeCard() {
  const w = useWorkspace()
  const resume = w.resume
  if (!resume) return null

  const where = resume.area ? `in ${resume.area}` : 'back in the Lands Between'
  const heading = resume.goal ? ` heading for ${resume.goal}` : ' picking up the main path'
  const since = resume.added > 0 ? ` Since last time: +${resume.added} fact${resume.added === 1 ? '' : 's'}.` : ''

  return (
    <section className="panel resume-card" aria-label="Welcome back">
      <div className="resume-head">
        <div className="kicker">Welcome back</div>
        <button type="button" className="chip" onClick={w.dismissResume} aria-label="Dismiss welcome back">
          Dismiss
        </button>
      </div>
      <p className="note" style={{ margin: '4px 0 0' }}>
        You were {where}{heading}.
      </p>
      {resume.next && (
        <p className="note" style={{ margin: '4px 0 0' }}>
          Next:{' '}
          {resume.nextFactId ? <EntityLink id={resume.nextFactId}>{resume.next}</EntityLink> : <strong>{resume.next}</strong>}
          {since}
        </p>
      )}
      {!resume.next && since && (
        <p className="note" style={{ margin: '4px 0 0' }}>{since.trim()}</p>
      )}
    </section>
  )
}
