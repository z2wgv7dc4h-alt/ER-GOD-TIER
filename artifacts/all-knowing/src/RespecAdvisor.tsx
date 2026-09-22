import { useEffect, useMemo, useState } from 'react'
import { loadWeapons, type Weapon } from './lib/ar'
import { respecAdvice, type RespecAdvice } from './lib/respecAdvice'
import { useWorkspace } from './state'

/**
 * Respec advisor for the Kit room: name a build or a weapon and see exactly
 * where the points should go, from the authored build stats / the weapon's real
 * requirements and scaling. Pure `respecAdvice`; no invented numbers.
 */
export function RespecAdvisor() {
  const { character } = useWorkspace()
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [target, setTarget] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadWeapons().then((w) => { if (!cancelled) setWeapons(w) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const advice: RespecAdvice | null = useMemo(
    () => (weapons && target.trim().length >= 3 ? respecAdvice(weapons, target, character.stats) : null),
    [weapons, target, character.stats],
  )

  return (
    <div className="respec" style={{ marginTop: 14 }}>
      <div className="kicker">Respec advisor</div>
      <p className="note" style={{ margin: '4px 0 6px' }}>
        Moving onto a different weapon or build? Name it and see where the points go. Rennala respecs
        for a Larval Tear.
      </p>
      <input
        className="search"
        placeholder="Type a weapon or kit name…"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        aria-label="Respec target"
      />
      {advice && (
        <div style={{ marginTop: 8 }}>
          <p className="note">{advice.note}</p>
          <div className="opts">
            {advice.deltas.map((d) => (
              <span key={d.attr} className="chip">
                {d.attr} {d.from}
                {'\u2192'}
                {d.to}
              </span>
            ))}
            {advice.kind === 'weapon' && advice.unmet.length > 0 && (
              <span className="chip warn">need {advice.unmet.join(', ')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
