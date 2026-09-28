import { useEffect, useMemo, useState } from 'react'
import { byId } from '../knowledge/catalog'
import { loadWeapons, type Weapon } from '../lib/ar'
import { advise } from '../lib/advisor'
import { regionMatches } from '../lib/areaHub'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { useCoords } from '../lib/coords'
import type { Character } from '../types'
import { useWorkspace } from '../state'
import { SeeAllButton, useRowReveal } from './rows'
import '../library/advisor.css'

/**
 * Journey › Now: "Recommended for you" (Task 96). Top to-dos and upgrades from
 * the pure `advise` engine, with a See-all hand-off to the Library › Builds
 * planner. Task 100 caps each list at three rows and, when the character has no
 * real stats yet, replaces the fake build read with a "Set up your Tarnished"
 * call to action.
 */

/** True for a character whose stats are the untouched default (all 10s or a demo/empty source). */
export function hasUnsetStats(character: Character): boolean {
  if (character.source === 'empty' || character.source === 'demo') return true
  return Object.values(character.stats).every((v) => v === 10)
}

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

  // Dedupe by rendered key: the advisor can surface the same fact / weapon twice
  // (Task 127 crawl: duplicate React keys `boss:morgott`, `quest:ranni:statue`).
  const todos = (() => {
    const seen = new Set<string>()
    const out: typeof advice.todo = []
    for (const t of advice.todo) {
      if (!inArea(t.factId ? byId.get(t.factId)?.region : undefined)) continue
      if (seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
    }
    return out
  })()
  const upgrades = (() => {
    const seen = new Set<string>()
    const out: typeof advice.upgrades = []
    for (const u of advice.upgrades) {
      if (!inArea(u.region)) continue
      const key = `${u.weaponName}-${u.upgrade}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(u)
    }
    return out
  })()
  const todoReveal = useRowReveal(todos.length)
  const upgradeReveal = useRowReveal(upgrades.length)

  if (hasUnsetStats(w.character)) {
    return (
      <section className="panel recommended recommended-setup">
        <div className="kicker">Recommended for you</div>
        <h3>Set up your Tarnished</h3>
        <p className="note">
          Recommended weapons and to-dos are computed from your stats and gear — there is nothing to
          recommend until we know them. Answer a few questions and the app infers the rest.
        </p>
        <button type="button" className="chip on" onClick={() => w.go('me', 'setup')}>
          Set up your Tarnished
        </button>
      </section>
    )
  }

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
            <ul className="now-rows">
              {todos.slice(0, todoReveal.visible).map((t) => (
                <li key={t.id}>
                  <strong>{t.title}</strong>
                  <p className="note" style={{ margin: '2px 0 0' }}>{t.reason}</p>
                </li>
              ))}
            </ul>
          )}
          <SeeAllButton total={todos.length} expanded={todoReveal.expanded} onToggle={todoReveal.toggle} />
        </div>

        <div>
          <div className="kicker">Upgrades</div>
          {upgrades.length === 0 ? (
            <p className="note">{weapons ? 'Nothing beats your current kit on-build.' : 'Loading regulation data…'}</p>
          ) : (
            <ul className="now-rows">
              {upgrades.slice(0, upgradeReveal.visible).map((u) => (
                <li key={`${u.weaponName}-${u.upgrade}`}>
                  <strong>{u.name}</strong>
                  <p className="note" style={{ margin: '2px 0 0' }}>
                    Attack {u.ar}{u.gainPct ? ` · ${u.gainPct > 0 ? '+' : ''}${u.gainPct}%` : ''} · {u.meets ? '✓ meets' : u.requirement}
                    {u.obtainableNow ? ' · obtainable now' : u.owned ? ' · owned' : u.region ? ` · ${u.region}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <SeeAllButton total={upgrades.length} expanded={upgradeReveal.expanded} onToggle={upgradeReveal.toggle} />
        </div>
      </div>

      <button type="button" className="chip" onClick={() => w.go('library', 'builds')}>
        See all
      </button>
    </section>
  )
}
