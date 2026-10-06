import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { loadWeapons, type Weapon } from '../lib/ar'
import { useCoords } from '../lib/coords'
import { toggleWatch, watchlistOf } from '../lib/leftovers'
import { useWorkspace } from '../state'
import { Term } from '../peek/Term'
import type { Stats } from '../types'
import {
  applyPreset,
  currentSummary,
  deletePreset,
  parsePresets,
  presetSummary,
  savePreset,
  type PresetSummary,
} from './presets'
import { applyTarget, clampStat, customRespec, planStats } from './statPlanner'
import { levelUpPlan } from './runes'
import { smithingTracker } from './smithing'
import { useGearInfo } from './useGearInfo'
import './build.css'

/**
 * Task 110 — the Build lab power tools. Each panel is self-contained and reads
 * the pure engines in `src/build/*`; the shared workspace supplies the
 * character and the Show-on-map plumbing.
 */

function useWeapons(): Weapon[] | null {
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadWeapons()
      .then((rows) => {
        if (!cancelled) setWeapons(rows)
      })
      .catch(() => {
        /* no weapon data: panels show what they can without AR */
      })
    return () => {
      cancelled = true
    }
  }, [])
  return weapons
}

function summaryLine(summary: PresetSummary): string {
  const ar = summary.ar != null ? `${summary.ar} AR` : 'AR —'
  return `${ar} · ${summary.load.pct}% ${summary.load.loadClass} · poise ${summary.poise}`
}

/**
 * Task 110 §1 — named loadout presets. Saved into the vault with the profile and
 * re-applied in one tap; each card shows right-hand AR, equip-load % and class,
 * and poise.
 */
export function LoadoutPresets() {
  const { character, setCharacter } = useWorkspace()
  const { gearInfo } = useGearInfo()
  const weapons = useWeapons()
  const [name, setName] = useState('')

  const presets = useMemo(() => parsePresets(character), [character])
  const current = useMemo(() => currentSummary(character, weapons, gearInfo), [character, weapons, gearInfo])

  function save() {
    if (!character.loadout.length) return
    setCharacter(savePreset(character, name, character.loadout))
    setName('')
  }

  return (
    <>
      <p className="note">
        Save the current weapons, armor, talismans and spells as a named loadout, then switch back in one tap.
      </p>
      <div className="advisor-row">
        <span>
          <strong>Current</strong> · {current.rightHand ?? 'no weapon equipped'}
        </span>
        <span className="note">{summaryLine(current)}</span>
      </div>
      <div className="opts">
        <input
          className="search"
          placeholder="Preset name"
          aria-label="Preset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="chip on" disabled={!character.loadout.length} onClick={save}>
          Save current
        </button>
      </div>
      {presets.length === 0 ? (
        <p className="note">No presets saved yet. Equip a loadout and save it above.</p>
      ) : (
        <ul className="advisor-list">
          {presets.map((preset) => {
            const summary = presetSummary(preset, character.stats, weapons, gearInfo)
            return (
              <li key={preset.id}>
                <div className="advisor-row">
                  <span>
                    <strong>{preset.name}</strong> · {summary.rightHand ?? 'no weapon'}
                  </span>
                  <span className="note">{summaryLine(summary)}</span>
                </div>
                <div className="opts">
                  <button type="button" className="chip on" onClick={() => setCharacter(applyPreset(character, preset.id))}>
                    Switch
                  </button>
                  <button type="button" className="chip" onClick={() => setCharacter(deletePreset(character, preset.id))}>
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/**
 * Task 110 §2 — the stat planner. Sliders move the eight stats from their
 * current values up to +N levels; the readouts (HP, FP, stamina, equip load,
 * the equipped weapon's AR) and the soft-cap markers update live. "Apply as
 * target" opens the respec plan the advisor would use.
 */
export function StatPlanner() {
  const { character, setCharacter } = useWorkspace()
  const { gearInfo } = useGearInfo()
  const weapons = useWeapons()
  const [target, setTarget] = useState<Stats>(() => ({ ...character.stats }))
  const [budget, setBudget] = useState(20)
  const [planOpen, setPlanOpen] = useState(false)

  useEffect(() => {
    setTarget({ ...character.stats })
  }, [character.stats])

  const weight = useMemo(
    () => character.loadout.reduce((sum, slot) => sum + (gearInfo(slot).weight ?? 0), 0),
    [character.loadout, gearInfo],
  )
  const plan = useMemo(() => planStats(character, target, weapons, weight), [character, target, weapons, weight])
  const respec = useMemo(() => customRespec(character, target), [character, target])

  function setStat(key: keyof Stats, value: number) {
    setTarget((prev) => ({ ...prev, [key]: clampStat(value) }))
  }

  return (
    <>
      <p className="note">
        Drag a stat up to plan the next levels.         HP, FP, stamina, equip load and attack rating update as you go.
        <span className="softcap-legend"><i /> <Term id="mechanic:soft-cap-offensive">soft caps</Term></span>
      </p>
      <div className="opts">
        {[10, 20, 50].map((n) => (
          <button key={n} type="button" className={budget === n ? 'chip on' : 'chip'} onClick={() => setBudget(n)}>
            +{n} levels
          </button>
        ))}
        <button type="button" className="chip" onClick={() => { setTarget({ ...character.stats }); setPlanOpen(false) }}>
          Reset
        </button>
        <button type="button" className={planOpen ? 'chip on' : 'chip'} onClick={() => setPlanOpen((v) => !v)}>
          Apply as target
        </button>
      </div>

      <div className="build-stats">
        {plan.rows.map((row) => {
          const max = Math.min(99, row.current + budget)
          const span = Math.max(1, max - row.current)
          const fill = Math.round(((row.planned - row.current) / span) * 100)
          const caps = row.caps.filter((cap) => cap >= row.current && cap <= max)
          return (
            <div className="build-stat" key={row.key}>
              <div className="build-stat-head">
                <label htmlFor={`plan-${row.key}`}>{row.label}</label>
                <span className="note">
                  {row.current} → {row.planned}
                  {row.reached > 0 ? ' · past soft cap' : ''}
                </span>
              </div>
              <div className="build-range-wrap">
                <input
                  id={`plan-${row.key}`}
                  className="build-range"
                  type="range"
                  min={row.current}
                  max={max}
                  value={row.planned}
                  aria-label={`${row.label} planned value`}
                  style={{ '--fill': `${fill}%` } as CSSProperties}
                  onChange={(e) => setStat(row.key, Number(e.target.value))}
                />
                {/* Task 113 §4 — the soft-cap breakpoints as labelled ticks on
                    the track, not anonymous dots. */}
                {caps.length > 0 && (
                  <div className="build-ticks" aria-hidden>
                    {caps.map((cap) => {
                      const pct = Math.max(8, Math.min(92, Math.round(((cap - row.current) / span) * 100)))
                      return (
                        <span key={cap} className={row.planned >= cap ? 'tick on' : 'tick'} style={{ left: `${pct}%` }}>
                          {cap}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ul className="advisor-list">
        <li>
          <div className="advisor-row"><span>HP</span><span>{plan.hp}</span></div>
        </li>
        <li>
          <div className="advisor-row"><span><Term id="mechanic:soft-cap-mind">FP</Term></span><span>{plan.fp}</span></div>
        </li>
        <li>
          <div className="advisor-row"><span><Term id="mechanic:stamina">Stamina</Term></span><span>{plan.stamina}</span></div>
        </li>
        <li>
          <div className="advisor-row">
            <span><Term id="mechanic:equip-load">Equip load</Term></span>
            <span>{plan.equipLoadPct}% · {plan.loadClass}</span>
          </div>
        </li>
        <li>
          <div className="advisor-row">
            <span><Term id="mechanic:attack-rating">Attack rating</Term></span>
            <span>{plan.ar != null ? `${plan.ar} ${plan.arWeapon ?? ''}` : 'equip a weapon'}</span>
          </div>
        </li>
      </ul>

      {planOpen && (
        <div className="build-plan">
          <p className="note">
            Target level {plan.level} ({plan.levelDelta >= 0 ? `+${plan.levelDelta}` : plan.levelDelta}).{' '}
            {respec.larvalTears > 0 ? 'One Larval Tear. ' : 'No change. '}
            {respec.rennalaNote}
          </p>
          {respec.changes.length > 0 && (
            <div className="opts">
              {respec.changes.map((c) => (
                <span key={c.key} className="chip">
                  {c.label} {c.from} → {c.to}
                </span>
              ))}
            </div>
          )}
          <div className="opts">
            <button
              type="button"
              className="chip on"
              disabled={respec.changes.length === 0}
              onClick={() => setCharacter(applyTarget(character, target))}
            >
              Apply spread
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Task 110 §3 — type in your runes; see how many levels that buys and where the
 * advisor would spend them.
 */
export function LevelUpCalculator() {
  const { character } = useWorkspace()
  const [runes, setRunes] = useState('')
  const value = Math.max(0, Math.floor(Number(runes) || 0))
  const plan = useMemo(() => levelUpPlan(character, value), [character, value])

  return (
    <>
      <p className="note">Enter the runes you are holding to see the levels they buy.</p>
      <div className="opts">
        <input
          className="search"
          type="number"
          min={0}
          step={100}
          placeholder="Current runes"
          aria-label="Current runes"
          value={runes}
          onChange={(e) => setRunes(e.target.value)}
        />
      </div>
      {value > 0 ? (
        <>
          <p className="note">
            {plan.affordable > 0
              ? `${plan.affordable} level${plan.affordable === 1 ? '' : 's'} affordable → level ${plan.targetLevel}. ${plan.cost} runes spent, ${plan.leftover} left.`
              : `Not enough for a level yet — the next costs ${plan.cost || 'more'}.`}
          </p>
          {plan.allocations.length > 0 && (
            <ul className="advisor-list">
              {plan.allocations.map((a) => (
                <li key={a.key}>
                  <div className="advisor-row">
                    <span><strong>{a.label}</strong> +{a.points} ({a.from} → {a.to})</span>
                    <span className="note">{a.why}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="note">Runes are read as a plain number; no account data is touched.</p>
      )}
    </>
  )
}

const SMITH_TARGETS = [5, 10, 15, 20, 25]

/**
 * Task 110 §4 — the smithing tracker. For every owned armament, the stones it
 * needs to reach +N, split by Smithing / Somber track, with the sellers and loot
 * rows the repo already knows and a Show-on-map action when a source has a pin.
 */
export function SmithingTracker() {
  const { character, setCharacter, focusOnMap, showLeftovers, toggleLeftovers } = useWorkspace()
  const weapons = useWeapons()
  const coords = useCoords()
  const [target, setTarget] = useState(25)

  const rows = useMemo(
    () => smithingTracker(character, weapons, { target, coords }),
    [character, weapons, target, coords],
  )

  function showOnMap(factId: string) {
    if (!watchlistOf(character).includes(factId)) setCharacter(toggleWatch(character, factId))
    if (!showLeftovers) toggleLeftovers()
    focusOnMap(factId)
  }

  return (
    <>
      <p className="note">
        Stones each owned weapon still needs. Regular weapons use Smithing Stones to +25; somber weapons use Somber
        Stones to +10.
      </p>
      <div className="opts" role="group" aria-label="Upgrade target">
        {SMITH_TARGETS.map((n) => (
          <button key={n} type="button" className={target === n ? 'chip on' : 'chip'} onClick={() => setTarget(n)}>
            +{n}
          </button>
        ))}
      </div>
      {weapons == null ? (
        <p className="note">Loading weapon data…</p>
      ) : rows.length === 0 ? (
        <p className="note">No owned armaments to track yet. Equip a weapon or read an inventory page.</p>
      ) : (
        <ul className="advisor-list">
          {rows.map((row) => (
            <li key={row.slotId}>
              <div className="advisor-row">
                <span>
                  <strong>{row.name}</strong> +{row.current} → +{row.target}
                </span>
                <span className="chip">{row.kind === 'somber' ? 'Somber' : 'Smithing'} · max +{row.max}</span>
              </div>
              {row.complete ? (
                <p className="note">Already at +{row.current}.</p>
              ) : (
                <ul className="list">
                  {row.needs.map((need) => (
                    <li key={need.name} style={{ display: 'block', cursor: 'default' }}>
                      <div className="advisor-row">
                        <span>{need.name}</span>
                        <span className="note">
                          need {need.count}
                          {need.have != null ? ` · have ${need.have}` : ''}
                        </span>
                      </div>
                      {need.sellers.length > 0 && <p className="note">Sold by {need.sellers.slice(0, 3).join(', ')}.</p>}
                      {need.farm && <p className="note">{need.farm}</p>}
                      {need.pin && (
                        <div className="opts">
                          <button type="button" className="chip" onClick={() => showOnMap(need.pin!.id)}>
                            Show on map
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/**
 * Every Task 110 build power tool, wrapped in its own panel. Kept as a
 * standalone composition for callers that want the tools outside the
 * collapsible Library › Builds page (the page renders the individual exports
 * inside `BuildSection` cards, see `library/BuildPlanner.tsx`).
 */
export function BuildPowerTools() {
  return (
    <div className="build-tools">
      <section className="panel advisor-card build-panel">
        <div className="kicker">Loadout presets</div>
        <LoadoutPresets />
      </section>
      <section className="panel advisor-card build-panel">
        <div className="kicker">Stat planner</div>
        <StatPlanner />
      </section>
      <section className="panel advisor-card build-panel">
        <div className="kicker">Level-up calculator</div>
        <LevelUpCalculator />
      </section>
      <section className="panel advisor-card build-panel">
        <div className="kicker">Smithing tracker</div>
        <SmithingTracker />
      </section>
    </div>
  )
}
