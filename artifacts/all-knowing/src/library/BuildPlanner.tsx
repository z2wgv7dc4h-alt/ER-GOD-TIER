import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { loadWeapons, type Weapon } from '../lib/ar'
import { advise, planRespec, strongerUpgrades } from '../lib/advisor'
import { useArmory } from '../lib/armory'
import { useGearInfo } from '../build/useGearInfo'
import { equipLoad } from '../lib/gearSheet'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { useCoords } from '../lib/coords'
import { toggleWatch, watchlistOf } from '../lib/leftovers'
import { useWorkspace } from '../state'
import { StatsEditor } from '../build/StatsEditor'
import { usePanelGroup } from '../build/PanelGroup'
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

const CUSTOM = '__custom'

const normName = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

/**
 * Task 113 §2 — one collapsible card per section of the Builds page. Native
 * `<details>` keeps the collapsed content out of hit-testing and out of the
 * accessibility tree. Task 197 §3: open on desktop, one-at-a-time on a phone via
 * the shared `PanelGroup` (same behaviour as the Kit groups).
 */
function BuildSection({
  id,
  title,
  defaultOpen = true,
  children,
}: {
  id?: string
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const group = usePanelGroup()
  const isPhone = group?.isPhone ?? false
  const panelId = id ?? title
  const [open, setOpen] = useState(defaultOpen)
  const expanded = isPhone ? group?.openId === panelId : open
  return (
    <details
      className="panel advisor-card build-section"
      open={expanded}
      onToggle={(e) => {
        const next = e.currentTarget.open
        if (isPhone && group) group.setOpenId(next ? panelId : null)
        else setOpen(next)
      }}
    >
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

  // Task 130 §3 — only genuine upgrades: a weapon that is weaker than the kit
  // (negative gain) is never listed as "stronger".
  const stronger = useMemo(() => strongerUpgrades(advice.upgrades), [advice.upgrades])

  function showOnMap(factId?: string) {
    if (!factId) return
    if (!watchlistOf(w.character).includes(factId)) w.setCharacter(toggleWatch(w.character, factId))
    if (!w.showLeftovers) w.toggleLeftovers()
    w.focusOnMap(factId)
  }

  // Task 118 §3 — an upgrade row, shared by the first-open list and the
  // "more upgrades" disclosure so the two never drift. A plain render function
  // (not a nested component) keeps React from remounting the rows each render.
  function upgradeRow(u: (typeof advice.upgrades)[number]) {
    return (
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
    )
  }

  const OPEN_UPGRADES = 3

  return (
    <div className="advisor planner">
      {/* Task 113 §2 — lead with what matters: your detected build and the
          weapons/gear that beat it, then the planning tools. Every section is a
          collapsible card; the first two open by default. */}
      <BuildSection id="detected" title="Your build">
        <h3>{advice.build.label}</h3>
        <p className="note">
          {Math.round(advice.build.confidence * 100)}% confidence · {advice.build.reason}
        </p>
        {/* Task 197 §4 — Plan reuses Your build's stat editor read-only; there is
            no second editable copy of the eight numbers anywhere. */}
        <StatsEditor character={w.character} readOnly />
        <p className="note">
          Edit these numbers in <strong>Your build</strong>.{' '}
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

      <BuildSection id="stronger" title="Stronger for your build">
        {stronger.length === 0 ? (
          <p className="note">
            {weapons ? 'Nothing stronger reachable yet. The Later finds below are worth keeping an eye on.' : 'Loading weapon data…'}
          </p>
        ) : (
          <>
            <ul className="advisor-list">
              {stronger.slice(0, OPEN_UPGRADES).map(upgradeRow)}
            </ul>
            {/* Task 118 §3 — the section stays short: the top picks inline, the
                rest one tap away, so Builds fits in the four-screen budget. */}
            {stronger.length > OPEN_UPGRADES && (
              <details className="advisor-more">
                <summary className="advisor-more-summary">
                  {stronger.length - OPEN_UPGRADES} more on-build upgrade
                  {stronger.length - OPEN_UPGRADES === 1 ? '' : 's'}
                </summary>
                <ul className="advisor-list">
                  {stronger.slice(OPEN_UPGRADES).map(upgradeRow)}
                </ul>
              </details>
            )}
          </>
        )}
      </BuildSection>

      {advice.later.length > 0 && (
        <BuildSection id="later" title="Later finds">
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
        </BuildSection>
      )}

      <BuildSection id="change" title="Change build">
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
            <p className="note">
              A custom spread is edited in <strong>Your build</strong>; the Plan tab only ever
              shows it read-only (see the spread at the top), so there is one place the eight
              numbers can change.
            </p>
          </div>
        )}
      </BuildSection>

      <BuildSection id="gear" title="Gear picks">
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
