import { useEffect, useMemo, useState } from 'react'
import { byId } from '../knowledge/catalog'
import { loadWeapons, type Weapon } from '../lib/ar'
import { advise } from '../lib/advisor'
import { regionMatches } from '../lib/areaHub'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { useCoords } from '../lib/coords'
import { useWorkspace } from '../state'
import '../library/advisor.css'

/**
 * Journey › Now: "Recommended for you" (Task 96). Top 3 to-dos and top 2
 * upgrades from the pure `advise` engine, with a See-all hand-off to the
 * Library › Builds planner. Standalone: not wired into the shell yet.
 */
export function RecommendedCard() {
  const w = useWorkspace()
  const coords = useCoords()
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [areas, setAreas] = useState<RegionLevel[]>([])
  const [near, setNear] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadWeapons()
      .then((rows) => { if (!cancelled) setWeapons(rows) })
      .catch(() => {})
    void loadRegionLevels()
      .then((data) => { if (!cancelled) setAreas(data.areas) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const advice = useMemo(
    () => advise(w.character, { weapons: weapons ?? undefined, areas, coords }),
    [w.character, weapons, areas, coords],
  )

  const inArea = (region?: string) => {
    if (!near) return true
    const area = w.currentArea?.region
    return Boolean(area && regionMatches(region, area))
  }

  const todos = advice.todo.filter((t) => inArea(t.factId ? byId.get(t.factId)?.region : undefined)).slice(0, 3)
  const upgrades = advice.upgrades.filter((u) => inArea(u.region)).slice(0, 2)

  return (
    <section className="panel recommended">
      <div className="kicker">Recommended for you</div>
      <h3>{advice.build.label}</h3>
      <p className="note">{advice.build.reason}</p>
      <button
        type="button"
        className={near ? 'chip on' : 'chip'}
        aria-pressed={near}
        disabled={!w.currentArea}
        onClick={() => setNear((v) => !v)}
      >
        Near me
      </button>

      <div className="recommended-cols">
        <div>
          <div className="kicker">To do next</div>
          {todos.length === 0 ? (
            <p className="note">Nothing open in the data yet.</p>
          ) : (
            <ul>
              {todos.map((t) => (
                <li key={t.id}>
                  <strong>{t.title}</strong>
                  <p className="note" style={{ margin: '2px 0 0' }}>{t.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="kicker">Upgrades</div>
          {upgrades.length === 0 ? (
            <p className="note">{weapons ? 'Nothing beats your current kit on-build.' : 'Loading regulation data…'}</p>
          ) : (
            <ul>
              {upgrades.map((u) => (
                <li key={`${u.weaponName}-${u.upgrade}`}>
                  <strong>{u.name}</strong>
                  <p className="note" style={{ margin: '2px 0 0' }}>
                    {u.ar} AR{u.gainPct ? ` · +${u.gainPct}%` : ''} · {u.meets ? 'requirements met' : u.requirement}
                    {u.obtainableNow ? ' · obtainable now' : u.owned ? ' · owned' : u.region ? ` · ${u.region}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button type="button" className="chip" onClick={() => w.go('library', 'builds')}>
        See all
      </button>
    </section>
  )
}
