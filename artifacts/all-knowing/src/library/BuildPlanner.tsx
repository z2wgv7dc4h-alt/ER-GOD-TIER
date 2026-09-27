import { useEffect, useMemo, useState } from 'react'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { loadWeapons, type Weapon } from '../lib/ar'
import { advise, planRespec } from '../lib/advisor'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { useCoords } from '../lib/coords'
import { toggleWatch, watchlistOf } from '../lib/leftovers'
import { SOFT_CAPS, softCapLabel, type StatKey } from '../lib/softCaps'
import { useWorkspace } from '../state'
import type { Stats } from '../types'
import { BuildPowerTools } from '../build/BuildPowerTools'
import './advisor.css'

/**
 * Library › Builds planner (Task 96). Standalone: it is NOT wired into the
 * shell yet. It renders the pure `advise` engine — your detected build, the
 * AR-ranked weapons that beat your current kit, gear that suits the archetype,
 * and the Change-build flow (`planRespec` → respec plan + shopping list).
 */

const STAT_KEYS = Object.keys(SOFT_CAPS) as StatKey[]
const STAT_LABELS: Record<StatKey, string> = {
  vigor: 'Vig',
  mind: 'Mind',
  endurance: 'End',
  strength: 'Str',
  dexterity: 'Dex',
  intelligence: 'Int',
  faith: 'Fai',
  arcane: 'Arc',
}

const CUSTOM = '__custom'

export function BuildPlanner() {
  const w = useWorkspace()
  const coords = useCoords()
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [areas, setAreas] = useState<RegionLevel[]>([])
  const [targetId, setTargetId] = useState('')
  const [custom, setCustom] = useState<Stats>(() => ({ ...w.character.stats }))

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

  const plan = useMemo(
    () => (targetId && targetId !== CUSTOM ? planRespec(w.character, targetId, { weapons: weapons ?? undefined, coords }) : null),
    [w.character, targetId, weapons, coords],
  )

  const customDeltas = useMemo(
    () =>
      (Object.keys(w.character.stats) as StatKey[])
        .map((key) => ({ key, from: w.character.stats[key], to: custom[key] }))
        .filter((d) => d.from !== d.to),
    [w.character.stats, custom],
  )

  function showOnMap(factId?: string) {
    if (!factId) return
    if (!watchlistOf(w.character).includes(factId)) w.setCharacter(toggleWatch(w.character, factId))
    if (!w.showLeftovers) w.toggleLeftovers()
    w.setSelectedMarkerId(factId)
    w.setModule('map')
  }

  return (
    <div className="advisor planner">
      {/* Task 110 — the build power tools: presets, stat planner, level-up
          calculator and smithing tracker, above the advisor cards. */}
      <BuildPowerTools />

      <section className="panel advisor-card">
        <div className="kicker">Your build</div>
        <h3>{advice.build.label}</h3>
        <p className="note">
          {Math.round(advice.build.confidence * 100)}% confidence · {advice.build.reason}
        </p>
        <div className="advisor-stats">
          {STAT_KEYS.map((key) => {
            const value = w.character.stats[key]
            const label = softCapLabel(key, value)
            return (
              <div className="advisor-stat" key={key}>
                <div className="advisor-stat-head">
                  <span>{STAT_LABELS[key]}</span>
                  <span className="note">{value}{label ? ` · ${label}` : ''}</span>
                </div>
                <div className="advisor-bar" aria-hidden>
                  <i style={{ width: `${Math.min(100, (value / 99) * 100)}%` }} />
                </div>
                <div className="advisor-caps" aria-hidden>
                  {SOFT_CAPS[key].map((cap) => (
                    <i key={cap} className={value >= cap ? 'on' : ''} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {advice.warnings.length > 0 && (
        <section className="panel advisor-card">
          <div className="kicker">Warnings</div>
          <ul className="advisor-list">
            {advice.warnings.map((warning, i) => (
              <li key={`${warning.kind}-${i}`}>
                <span>{warning.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel advisor-card">
        <div className="kicker">Stronger for your build</div>
        {advice.upgrades.length === 0 ? (
          <p className="note">
            {weapons ? 'No on-build weapon beats what you have at these stats.' : 'Loading weapon data…'}
          </p>
        ) : (
          <ul className="advisor-list">
            {advice.upgrades.map((u) => (
              <li key={`${u.weaponName}-${u.affinity}-${u.upgrade}`}>
                <div className="advisor-row">
                  <span>
                    <strong>{u.name}</strong> {u.affinity !== 'Unique' ? `· ${u.affinity}` : ''} +{u.upgrade}
                  </span>
                  <span className="note">
                    {u.ar} AR used{u.gainPct ? ` · +${u.gainPct}% vs equipped` : ''}
                  </span>
                </div>
                <div className="opts">
                  <span className={u.meets ? 'chip' : 'chip warn'}>{u.meets ? 'requirements met' : u.requirement}</span>
                  {u.owned && <span className="chip on">owned</span>}
                  {u.obtainableNow && <span className="chip on">obtainable now</span>}
                  {u.lost && <span className="chip warn">locked out this run</span>}
                  {!u.owned && !u.obtainableNow && !u.lost && u.region && <span className="chip">{u.region}</span>}
                  {u.factId && (
                    <button type="button" className="chip" onClick={() => showOnMap(u.factId)}>
                      Show on map
                    </button>
                  )}
                </div>
                {u.where && <p className="note">{u.where}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel advisor-card">
        <div className="kicker">Gear picks</div>
        <ul className="advisor-list">
          {advice.gear.map((g) => (
            <li key={`${g.kind}-${g.name}`}>
              <div className="advisor-row">
                <span><strong>{g.name}</strong> <em className="dim">{g.kind}</em></span>
                <span className="note">{g.owned ? 'owned' : g.obtainableNow ? `obtainable · ${g.region ?? ''}` : g.lost ? 'locked out' : g.region ?? ''}</span>
              </div>
              <p className="note">{g.why}{g.where ? ` ${g.where}` : ''}</p>
              {g.factId && (
                <div className="opts">
                  <button type="button" className="chip" onClick={() => showOnMap(g.factId)}>Show on map</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel advisor-card">
        <div className="kicker">Change build</div>
        <p className="note">Pick a target. The plan shows the stat spread and a shopping list; nothing is applied.</p>
        <select
          className="search"
          aria-label="Target build"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Choose a build…</option>
          <optgroup label="OP kits">
            {opBuilds.map((b) => (
              <option key={b.id} value={b.id}>{b.name} · Lv {b.level}</option>
            ))}
          </optgroup>
          <optgroup label="PvP builds">
            {pvpBuilds.map((b) => (
              <option key={b.id} value={b.id}>{b.name} · Lv {b.level}</option>
            ))}
          </optgroup>
          <option value={CUSTOM}>Custom stats…</option>
        </select>

        {plan && (
          <div className="advisor-plan">
            <h4>{plan.targetName} · Lv {plan.levelTarget}</h4>
            <p className="note">
              {plan.levelsNeeded > 0 ? `${plan.levelsNeeded} levels to gain. ` : ''}
              {plan.larvalTears > 0 ? `${plan.larvalTears} Larval Tear. ` : ''}
              {plan.rennalaNote}
            </p>
            {plan.stats.length > 0 && (
              <div className="opts">
                {plan.stats.map((s) => (
                  <span key={s.key} className="chip">
                    {s.attr} {s.from} {'\u2192'} {s.to}
                  </span>
                ))}
              </div>
            )}
            {plan.missing.length > 0 ? (
              <>
                <div className="kicker">Shopping list</div>
                <ul className="advisor-list">
                  {plan.missing.map((m) => (
                    <li key={m.factId}>
                      <div className="advisor-row">
                        <span>{m.name} <em className="dim">{m.source}</em></span>
                        {m.pin && (
                          <button type="button" className="chip" onClick={() => showOnMap(m.factId)}>
                            Show on map
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="note">Every seeded piece of this kit is already logged.</p>
            )}
          </div>
        )}

        {targetId === CUSTOM && (
          <div className="advisor-plan">
            <h4>Custom stats</h4>
            <p className="note">Set a target spread and see the delta. Rennala respecs for one Larval Tear.</p>
            <div className="advisor-stats">
              {STAT_KEYS.map((key) => (
                <label className="advisor-stat" key={key}>
                  <span>{STAT_LABELS[key]}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={custom[key]}
                    onChange={(e) =>
                      setCustom((prev) => ({ ...prev, [key]: Math.max(1, Math.min(99, Number(e.target.value) || 1)) }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="opts">
              {customDeltas.length === 0 ? (
                <span className="chip">No change</span>
              ) : (
                customDeltas.map((d) => (
                  <span key={d.key} className="chip">
                    {STAT_LABELS[d.key]} {d.from} {'\u2192'} {d.to}
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
