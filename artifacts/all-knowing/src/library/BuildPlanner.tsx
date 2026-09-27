import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { loadWeapons, type Weapon } from '../lib/ar'
import { advise, planRespec } from '../lib/advisor'
import { useArmory } from '../lib/armory'
import { useGearInfo } from '../build/useGearInfo'
import { equipLoad } from '../lib/gearSheet'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { useCoords } from '../lib/coords'
import { toggleWatch, watchlistOf } from '../lib/leftovers'
import { SOFT_CAPS, softCapLabel, type StatKey } from '../lib/softCaps'
import { useWorkspace } from '../state'
import type { Stats } from '../types'
import { LevelUpCalculator, LoadoutPresets, SmithingTracker, StatPlanner } from '../build/BuildPowerTools'
import { EntityLink } from '../EntityLink'
import { Term } from '../peek/Term'
import './advisor.css'
import '../build/build.css'

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

const normName = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

/**
 * Task 113 §2 — one collapsible card per section of the Builds page. Native
 * `<details>` keeps the collapsed content out of hit-testing and out of the
 * accessibility tree; the two sections that answer "where am I" open first.
 */
function BuildSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="panel advisor-card build-section" open={defaultOpen}>
      <summary className="build-section-summary">
        <span className="kicker">{title}</span>
        <span className="build-section-chevron" aria-hidden>▾</span>
      </summary>
      <div className="build-section-body">{children}</div>
    </details>
  )
}

export function BuildPlanner() {
  const w = useWorkspace()
  const coords = useCoords()
  const { weapons: armoryWeapons } = useArmory()
  const { gearInfo } = useGearInfo()
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

  const weights = useMemo(() => {
    const map: Record<string, number> = {}
    for (const row of armoryWeapons) {
      const key = normName(row.name)
      const value = Number.parseFloat(row.weight)
      if (key && Number.isFinite(value) && value > 0 && map[key] === undefined) map[key] = value
    }
    return map
  }, [armoryWeapons])

  const load = useMemo(() => {
    const total = w.character.loadout.reduce((sum, slot) => sum + (gearInfo(slot).weight ?? 0), 0)
    return equipLoad(total, w.character.stats.endurance)
  }, [w.character.loadout, w.character.stats.endurance, gearInfo])

  const advice = useMemo(
    () =>
      advise(w.character, {
        weapons: weapons ?? undefined,
        areas,
        coords,
        weights,
        equipLoad: load.max > 0 ? { current: load.total, max: load.max } : undefined,
      }),
    [w.character, weapons, areas, coords, weights, load],
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
      {/* Task 113 §2 — lead with what matters: your detected build and the
          weapons/gear that beat it, then the planning tools. Every section is a
          collapsible card; the first two open by default. */}
      <BuildSection title="Your build" defaultOpen>
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
                {/* Task 114 §7 — the breakpoints are labelled (40 / 60 / 80) like
                    the planner, not anonymous dots. */}
                <div className="advisor-caps" aria-hidden>
                  {SOFT_CAPS[key].map((cap) => (
                    <span key={cap} className={value >= cap ? 'on' : ''}>{cap}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <p className="note">
          <span className="softcap-legend"><i /> <Term id="mechanic:soft-cap-offensive">soft caps</Term></span>
        </p>
        {advice.warnings.length > 0 && (
          <>
            <div className="kicker" style={{ marginTop: 12 }}>Warnings</div>
            <ul className="advisor-list">
              {advice.warnings.map((warning, i) => (
                <li key={`${warning.kind}-${i}`}>
                  <span>{warning.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </BuildSection>

      <BuildSection title="Stronger for your build" defaultOpen>
        {advice.upgrades.length === 0 ? (
          <p className="note">
            {weapons ? 'No reachable on-build weapon beats what you have at these stats.' : 'Loading weapon data…'}
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
                    <Term id="mechanic:attack-rating">Attack</Term> {u.ar}
                    {u.gainPct ? ` · ${u.gainPct > 0 ? '+' : ''}${u.gainPct}% vs ${u.gainVs ?? 'your kit'}` : ''}
                  </span>
                </div>
                <p className="note">{u.scaling} — {u.why}</p>
                <div className="opts">
                  {u.meets ? (
                    <span className="chip on">✓ meets</span>
                  ) : (
                    <span className="chip warn">{u.requirement}</span>
                  )}
                  {u.owned && <span className="chip on">owned</span>}
                  {u.obtainableNow && <span className="chip on">obtainable now</span>}
                  {u.lost && <span className="chip warn">locked out this run</span>}
                  {!u.owned && !u.obtainableNow && !u.lost && u.region && <span className="chip">{u.region}</span>}
                  {u.factId && <EntityLink id={u.factId}>{u.region ?? 'where to get it'}</EntityLink>}
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
        {advice.later.length > 0 && (
          <>
            <div className="kicker" style={{ marginTop: 12 }}>Later</div>
            <p className="note">Reachable only once you get there — or open the Realm of Shadow.</p>
            <ul className="advisor-list">
              {advice.later.map((u) => (
                <li key={`later-${u.weaponName}-${u.upgrade}`}>
                  <div className="advisor-row">
                    <span><strong>{u.name}</strong> +{u.upgrade}</span>
                    <span className="note">Attack {u.ar}</span>
                  </div>
                  <p className="note">
                    {u.dlc ? 'Shadow of the Erdtree — not open yet' : u.region ?? 'No known acquisition'}
                    {u.where ? ` · ${u.where}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </BuildSection>

      <BuildSection title="Change build">
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
      </BuildSection>

      <BuildSection title="Stat planner">
        <StatPlanner />
      </BuildSection>

      <BuildSection title="Level-up calculator">
        <LevelUpCalculator />
      </BuildSection>

      <BuildSection title="Smithing tracker">
        <SmithingTracker />
      </BuildSection>

      <BuildSection title="Loadout presets">
        <LoadoutPresets />
      </BuildSection>

      <BuildSection title="Gear picks">
        <ul className="advisor-list">
          {advice.gear.map((g) => (
            <li key={`${g.kind}-${g.name}`}>
              <div className="advisor-row">
                <span><strong>{g.name}</strong> <em className="dim">{g.kind}</em></span>
                <span className="note">
                  {g.owned
                    ? 'owned'
                    : g.obtainableNow
                      ? `obtainable · ${g.region ?? ''}`
                      : g.lost
                        ? 'locked out'
                        : g.reachable
                          ? g.region ?? ''
                          : `later${g.dlc ? ' · Shadow of the Erdtree' : g.region ? ` · ${g.region}` : ''}`}
                </span>
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
      </BuildSection>
    </div>
  )
}
