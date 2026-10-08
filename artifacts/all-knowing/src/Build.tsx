import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { markers } from './data/seed'
import { opBuilds } from './knowledge/builds'
import { pvpBuilds, pvpMatchups } from './knowledge/pvp'
import { techTips } from './knowledge/tech'
import { pvpTech } from './knowledge/pvpTech'
import { OpKitPanel, PvpBuildPanel, PvpMatchupPanel, PvpTechPanel } from './build/KitLibraryPanels'
import { LevelUpCalculator, LoadoutPresets, SmithingTracker, StatPlanner } from './build/BuildPowerTools'
import { isCollected, useWorkspace } from './state'
import { CombatWeakness } from './CombatWeakness'
import { DamageCalc } from './combat/DamageCalc'
import { RespecAdvisor } from './RespecAdvisor'
import { UpgradeAdvisor } from './UpgradeAdvisor'
import { applyFacts } from './lib/infer'
import { buildHunt } from './lib/buildHunt'
import { loadMetaBuilds, type MetaBuilds } from './lib/metaBuilds'
import { loadGuides } from './lib/guides'
import { WikiText } from './WikiText'
import { useCoords } from './lib/coords'
import { toggleWatch, watchlistOf } from './lib/leftovers'
import { attackRatingForSlot, loadWeapons } from './lib/ar'
import type { AttackRating, Weapon } from './lib/ar'
import { REGULATION_STAMP } from './lib/regulation'
import { isSoteRun } from './lib/blessings'
import { levelFromStats } from './lib/level'
import { SOFT_CAPS, softCapLabel } from './lib/softCaps'
import { BuildCodeCard } from './BuildCodeCard'
import { Related } from './Related'
import { WeaponCompare } from './WeaponCompare'
import {
  bestDamageType,
  combatTargetFor,
  damageTypeLabels,
  damageTypes,
  effectiveDamage,
  enemyTargetNames,
  negationText,
  resistSummary,
  useCombatTargets,
} from './lib/enemy'
import type { Character, Stats } from './types'

/**
 * Task 71: this used to invent a poise fudge (a class-based constant) and an
 * endurance-based equip load, and show them beside the real Clark attack rating,
 * so they read like regulation data. The in-repo regulation extract only computes
 * attack rating, so the preview is now a labelled estimate with no numbers.
 */
export function estimateDefense(character: Character) {
  const weapon = character.loadout.find((s) => s.kind === 'armament')
  if (!weapon) return { label: 'No armament' }
  const upgrade = weapon.upgrade ?? 0
  return { label: `${weapon.name} +${upgrade} ${weapon.affinity ?? ''}`.trim() }
}

/**
 * The Build lab (Task 91; split further by Task 117): `library/builds` is the
 * character build — stats, soft caps, respec, active hunt and attack rating — and
 * now also owns the OP PvE kits, the damage calculator and the weapon compare.
 * `library/pvp` is the PvP surface: builds, matchups and tech. `BuildKits` is the
 * former Kit library minus the PvP groups, folded into Builds.
 */
export function BuildWorkspace() {
  return <BuildRoom view="builds" />
}

export function BuildKits() {
  return <BuildRoom view="kits" />
}

export function BuildCalculator() {
  return <BuildRoom view="calc" />
}

export function PvpWorkspace() {
  return <BuildRoom view="pvp" />
}

/**
 * Task 164 §9 — the Builds page split into four tabs so the stat editor,
 * planning advisor, kit/compare library and the numeric calculators no longer
 * stack into one ~12-screen page. The planner stays lazy so it remains its own
 * chunk; the other views are already in this module.
 */
type BuildsTab = 'your' | 'planning' | 'kits' | 'calc'

const BUILDS_TABS: { id: BuildsTab; label: string; purpose: string }[] = [
  { id: 'your', label: 'Your build', purpose: 'Your stats, attack rating and the pieces you are still missing.' },
  { id: 'planning', label: 'Planning', purpose: 'Your detected build, stronger gear and respec plans.' },
  { id: 'kits', label: 'Kits/Compare', purpose: 'The OP PvE kits and the weapon compare.' },
  { id: 'calc', label: 'Calculator', purpose: 'Damage, attack rating, stat, level and smithing calculators.' },
]

const BuildPlannerLazy = lazy(() => import('./library/BuildPlanner').then((m) => ({ default: m.BuildPlanner })))

export function BuildsPage() {
  const [tab, setTab] = useState<BuildsTab>('your')
  const current = BUILDS_TABS.find((t) => t.id === tab)
  return (
    <div className="builds-page">
      <div className="subtabs builds-tabs" role="tablist" aria-label="Builds views">
        {BUILDS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current && <p className="note builds-tabs-purpose">{current.purpose}</p>}
      {tab === 'your' && <BuildWorkspace />}
      {tab === 'planning' && (
        <Suspense fallback={<p className="note">Loading planner…</p>}>
          <BuildPlannerLazy />
        </Suspense>
      )}
      {tab === 'kits' && <BuildKits />}
      {tab === 'calc' && <BuildCalculator />}
    </div>
  )
}

/**
 * Task 107 §9 / Task 118 §3 — a collapsible card. The Builds and PvP pages are a
 * wall of distinct tools, so each becomes a card that is collapsed unless the
 * spec names it as a first-paint answer ("Your build" / "Stronger for your
 * build"). Children stay mounted (tests read them) but a collapsed card is
 * hidden, so it neither paints nor lengthens the page.
 */
function KitGroup({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={open ? 'kit-group-panel open' : 'kit-group-panel'}>
      <button
        type="button"
        className="kit-group-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="kicker">
          {title}
          {count != null ? ` · ${count}` : ''}
        </span>
        <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      <div className="kit-group-body" hidden={!open}>{children}</div>
    </section>
  )
}

/**
 * Task 164 §8 — the scraped Fextralife build/status pages, which were loaded by
 * `metaBuilds.ts` but rendered nowhere. Task 181: the body is on disk, so it is
 * rendered in-app (headings + stored prose) rather than linking out to the wiki.
 */
function MetaBuildsCard() {
  const [doc, setDoc] = useState<MetaBuilds | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadMetaBuilds()
      .then((d) => { if (!cancelled) setDoc(d) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)) })
    return () => { cancelled = true }
  }, [])
  if (error) {
    return <p className="note" style={{ marginTop: 8 }}>Fextralife meta unavailable ({error}). Nothing shown rather than guessed.</p>
  }
  if (!doc) return <p className="note" style={{ marginTop: 8 }}>Loading Fextralife meta builds…</p>
  const pages = doc.pages.filter((p) => p.sections.length > 0)
  return (
    <>
      <p className="note" style={{ marginTop: 8 }}>
        Stored Fextralife build and status pages, read here. Source: Fextralife (scraped offline).
      </p>
      <ul className="list" style={{ marginTop: 8 }}>
        {pages.map((p) => (
          <li key={p.slug} style={{ display: 'block', cursor: 'default' }}>
            <div className="kicker" style={{ marginTop: 6 }}>{p.title}</div>
            {p.sections.map((s, i) => (
              <details className="kit-sources" key={`${s.heading}-${i}`}>
                <summary>{s.heading || `Section ${i + 1}`}</summary>
                <p className="note"><WikiText text={s.text} /></p>
              </details>
            ))}
          </li>
        ))}
      </ul>
    </>
  )
}

type StoredPage = { title: string; sections: { heading: string; text: string }[] }

/**
 * Task 181 §5 — the old PvP "Sources" block linked out to four Fextralife pages
 * whose prose is already in the offline scrape. This looks the topics up in the
 * stored guides/builds corpora and renders the matching page body in place. A
 * topic with no on-disk page simply renders nothing (reported, not linked).
 */
function StoredSources({ topics }: { topics: { label: string; match: RegExp }[] }) {
  const [pages, setPages] = useState<StoredPage[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void Promise.all([loadMetaBuilds(), loadGuides()])
      .then(([builds, guides]) => {
        if (cancelled) return
        setPages([
          ...builds.pages.map((p) => ({ title: p.title, sections: p.sections })),
          ...guides.pages.map((p) => ({ title: p.title, sections: p.sections })),
        ])
      })
      .catch(() => { if (!cancelled) setPages([]) })
    return () => { cancelled = true }
  }, [])
  if (!pages) return <p className="note">Loading stored source pages…</p>
  const rows = topics
    .map((t) => ({ label: t.label, page: pages.find((p) => t.match.test(p.title)) }))
    .filter((r): r is { label: string; page: StoredPage } => Boolean(r.page))
  if (rows.length === 0) return <p className="note">No stored source page for these topics.</p>
  return (
    <>
      {rows.map((r) => (
        <details className="kit-sources" key={r.label}>
          <summary>{r.label}</summary>
          {r.page.sections.map((s, i) => (
            <div key={`${s.heading}-${i}`}>
              {s.heading && <div className="kicker">{s.heading}</div>}
              <p className="note"><WikiText text={s.text} /></p>
            </div>
          ))}
        </details>
      ))}
    </>
  )
}

function BuildRoom({ view }: { view: 'builds' | 'kits' | 'calc' | 'pvp' }) {
  const { character, setCharacter, focusOnMap, showLeftovers, toggleLeftovers, go } = useWorkspace()
  const coords = useCoords()
  const preview = estimateDefense(character)
  const allBuilds = useMemo(() => [...opBuilds, ...pvpBuilds], [])
  const kitId = typeof character.answers.buildKit === 'string' ? character.answers.buildKit : ''
  // Task 92 row 5: the build hunt is a panel, not something buried behind a kit
  // pick — a default build is always hunted so the list is on first paint.
  const selectedBuild = allBuilds.find((b) => b.id === kitId) ?? allBuilds[0]
  const hunt = useMemo(
    () => (selectedBuild ? buildHunt(character, selectedBuild, coords) : null),
    [character, selectedBuild, coords],
  )
  const chooseBuild = (id: string) =>
    setCharacter({ ...character, answers: { ...character.answers, buildKit: id } })
  const showOnMap = (factId: string) => {
    if (!watchlistOf(character).includes(factId)) setCharacter(toggleWatch(character, factId))
    if (!showLeftovers) toggleLeftovers()
    focusOnMap(factId)
  }
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [arError, setArError] = useState<string | null>(null)
  const [twoHanding, setTwoHanding] = useState(false)
  const { targets: combatTargets, error: combatError } = useCombatTargets()
  const [targetId, setTargetId] = useState('')
  const [enemyQuery, setEnemyQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadWeapons()
      .then((rows) => { if (!cancelled) setWeapons(rows) })
      .catch((err: unknown) => {
        if (!cancelled) setArError(err instanceof Error ? err.message : String(err))
      })
    return () => { cancelled = true }
  }, [])

  const ratings = useMemo<AttackRating[]>(() => {
    if (!weapons) return []
    return character.loadout
      .filter((slot) => slot.kind === 'armament')
      .map((slot) => attackRatingForSlot(weapons, slot, character.stats, twoHanding))
  }, [weapons, character.loadout, character.stats, twoHanding])

  const bossTargets = combatTargets.filter((t) => t.kind === 'boss')
  const enemyTargets = combatTargets.filter((t) => t.kind === 'enemy')
  const enemyNames = enemyTargetNames(enemyTargets)
  const nextUndefeatedBoss = markers.find(
    (m) => m.kind === 'boss' && !isCollected(character, m) && combatTargets.some((b) => b.factId === m.id),
  )
  const activeTargetId = targetId || nextUndefeatedBoss?.id || combatTargets[0]?.factId || ''
  const target = combatTargetFor(combatTargets, activeTargetId)

  function pickEnemyByName(name: string) {
    setEnemyQuery(name)
    const match = enemyTargets.find((t) => t.name === name) || enemyTargets.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (match) setTargetId(match.factId)
  }

  function patchStat(key: keyof Stats, value: number) {
    // Task 107 §4: stats drive the level, so editing a stat moves it too.
    const stats = { ...character.stats, [key]: Math.max(1, Math.min(99, value || 1)) }
    setCharacter({ ...character, stats, level: levelFromStats(stats) })
  }

  if (view === 'pvp') {
    return (
      <div className="split">
        <section className="panel">
          <div className="kicker">PvP · patch 1.17</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>
            Invade &amp; duel builds · Matchups · Tech
          </h3>
          <p className="note">Invasion and duel builds, matchup counters and PvP tech.</p>

          <KitGroup title="PvP builds · patch 1.17" count={pvpBuilds.length} defaultOpen>
            <p className="note">
              Invade and duel builds for RL30–150, filterable by mode and level (default: your level).
            </p>
            <div style={{ marginTop: 8 }}>
              <p className="note">Sources read from the stored offline corpus (Fextralife):</p>
              <StoredSources
                topics={[
                  { label: 'PvP Builds', match: /PvP Builds/i },
                  { label: 'Status scaling', match: /Status Effects/i },
                ]}
              />
            </div>
            <PvpBuildPanel
              character={character}
              setCharacter={setCharacter}
              coords={coords}
              onShowOnMap={showOnMap}
            />
          </KitGroup>

          <KitGroup title="PvP matchups" count={pvpMatchups.length}>
            <PvpMatchupPanel />
          </KitGroup>

          <KitGroup title="PvP tech" count={pvpTech.length}>
            <p className="note">
              Backstabs, parry windows by tool class, roll-catching, invasion items and gank tactics. Each
              row is a how-to; balance-sensitive values are quoted from the wiki and dated.
            </p>
            <PvpTechPanel />
          </KitGroup>

          <KitGroup title="Tech & cheese · broken tricks" count={techTips.length}>
            <ul className="list" style={{ marginTop: 8 }}>
              {techTips.map((t) => (
                <li key={t.id} style={{ cursor: 'default', display: 'block' }}>
                  <span>{t.name}</span>
                  <p className="note" style={{ margin: '4px 0 0' }}>{t.what} {t.why} <em>{t.how}</em></p>
                </li>
              ))}
            </ul>
          </KitGroup>

          <KitGroup title="Meta (Fextralife)">
            <MetaBuildsCard />
          </KitGroup>
        </section>
      </div>
    )
  }

  if (view === 'kits' || view === 'calc') {
    const calcView = view === 'calc'
    return (
      <div className="split">
        <section className="panel">
          <div className="kicker">{calcView ? 'Build calculator · patch 1.17' : 'PvE kit library'}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>
            {calcView
              ? 'Damage · Attack rating · Stat & smithing calculators'
              : 'OP kits · Weapon compare'}
          </h3>
          <p className="note">
            {calcView
              ? 'Run real numbers: per-type damage against an NpcParam target, attack rating from the vendored 1.17 data, and the stat/level/smithing planners.'
              : 'Plan your character, find stronger gear, and browse OP PvE kits.'}
          </p>

          {!calcView && (
          <>
          <KitGroup title="OP kits" count={opBuilds.length}>
            <OpKitPanel
              character={character}
              setCharacter={setCharacter}
              coords={coords}
              onShowOnMap={showOnMap}
            />
            <p className="note" style={{ marginTop: 8 }}>
              Kits set stats and a shopping list; each level plan projects the kit to Lv 40/60/100/150.
            </p>
          </KitGroup>

          <KitGroup title="Owned gear" count={character.loadout.length}>
            <div className="gear" style={{ marginTop: 8 }}>
              {character.loadout.length === 0 && <p className="note">Load a save, an OP kit, or the demo character.</p>}
              {character.loadout.map((slot) => (
                <div className="gear-row" key={slot.id}>
                  <em>{slot.kind}</em>
                  <span>{slot.name}</span>
                  <span>{slot.affinity ? `${slot.affinity} +${slot.upgrade ?? 0}` : ''}</span>
                </div>
              ))}
            </div>
          </KitGroup>

          <KitGroup title="Build code">
            <BuildCodeCard />
          </KitGroup>

          <KitGroup title="Weapon compare">
            {weapons ? (
              <WeaponCompare
                weapons={weapons}
                stats={character.stats}
                target={target}
                targetName={target?.name}
              />
            ) : (
              <p className="note" style={{ marginTop: 8 }}>Loading weapon data…</p>
            )}
          </KitGroup>
          </>
          )}

          {calcView && (
          <>
          <KitGroup title="Damage calculator">
            {/* Task 107 §10: the Task 105 engine — pick a weapon, upgrade and
                affinity, then a boss or field enemy, and read the per-type
                damage and the status-proc table. */}
            <DamageCalc />
          </KitGroup>

          <KitGroup title="Attack rating detail" count={ratings.length}>
            {ratings.length > 0 && (
              <ul className="list" style={{ marginTop: 10 }}>
                {ratings.map((r, i) => (
                  <li key={`ar-${i}`} style={{ cursor: 'default' }}>
                    <span>{r.weaponName}{r.status === 'ok' ? ` +${r.upgradeLevel} · ${r.affinity}` : ''}</span>
                    <span>{r.status === 'ok' ? `${r.total} AR` : 'unknown'}</span>
                  </li>
                ))}
              </ul>
            )}
            {ratings.map((r, i) =>
              r.status === 'unknown' ? (
                <p className="note" key={`why-${i}`}>
                  {r.weaponName}: {r.reason}. Left blank rather than guessed.
                </p>
              ) : r.ineffectiveAttributes.length > 0 ? (
                <p className="note" key={`why-${i}`}>
                  {r.weaponName}: below requirement for {r.ineffectiveAttributes.join(', ')} — damage is penalised, not scaled.
                </p>
              ) : null,
            )}
          </KitGroup>

          <KitGroup title="Matchup · NpcParam absorb">
            <CombatWeakness target={target} name={target?.name} />
            {combatError && (
              <p className="note" style={{ marginTop: 10 }}>
                Combat data unavailable ({combatError}). Nothing shown rather than guessed.
              </p>
            )}
            {!combatError && combatTargets.length === 0 && (
              <p className="note" style={{ marginTop: 10 }}>Loading combat data…</p>
            )}
            {combatTargets.length > 0 && (
              <>
                <label className="note" htmlFor="boss-matchup" style={{ display: 'block', marginTop: 10 }}>Boss target</label>
                <select
                  id="boss-matchup"
                  value={activeTargetId}
                  onChange={(e) => { setTargetId(e.target.value); setEnemyQuery('') }}
                  style={{ marginTop: 6, width: '100%' }}
                >
                  {bossTargets.map((b) => (
                    <option key={b.factId} value={b.factId}>{b.name}</option>
                  ))}
                </select>
                {enemyTargets.length > 0 && (
                  <>
                    <label className="note" htmlFor="enemy-matchup" style={{ display: 'block', marginTop: 10 }}>
                      Field enemy ({enemyTargets.length} placed, non-boss)
                    </label>
                    <input
                      id="enemy-matchup"
                      list="enemy-matchup-list"
                      placeholder="e.g. Giant Crab"
                      value={enemyQuery}
                      onChange={(e) => pickEnemyByName(e.target.value)}
                      style={{ marginTop: 6, width: '100%' }}
                    />
                    <datalist id="enemy-matchup-list">
                      {enemyNames.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </>
                )}
              </>
            )}
            {target && (
              <>
                <ul className="list" style={{ marginTop: 10 }}>
                  {damageTypes.map((t) => (
                    <li key={t} style={{ cursor: 'default' }}>
                      <span>{damageTypeLabels[t]}</span>
                      <span>{negationText(target.negation[t])}</span>
                    </li>
                  ))}
                </ul>
                <p className="note" style={{ marginTop: 8 }}>
                  {target.kind === 'enemy' ? 'Field enemy' : 'Boss'} · weakest to <strong>{damageTypeLabels[bestDamageType(target)]}</strong>
                  {target.poise != null ? ` · poise ${target.poise}` : ''}
                  {target.model ? ` · model ${target.model}` : ''}
                  {target.placements ? ` · ${target.placements} placements in ${target.maps?.length ?? 0} maps` : ''}. Negation is read
                  straight from the game's NpcParam; a negative value means it takes extra damage.
                </p>
                {ratings.some((r) => r.status === 'ok') && (
                  <ul className="list" style={{ marginTop: 8 }}>
                    {ratings.map((r, i) =>
                      r.status === 'ok' ? (
                        <li key={`eff-${i}`} style={{ cursor: 'default' }}>
                          <span>{r.weaponName} after negation</span>
                          <span>{Math.floor(effectiveDamage(r.breakdown, target).total)}</span>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
                <p className="note" style={{ marginTop: 8 }}>Resistances: {resistSummary(target)}</p>
                <Related id={target.factId} />
              </>
            )}

            <p className="note" style={{ marginTop: 18 }}>
              Next boss still standing:{' '}
              {markers.find((m) => m.kind === 'boss' && !isCollected(character, m))?.name ?? 'None in seed data.'}
            </p>
            <button
              className="ghost gold"
              type="button"
              style={{ marginTop: 12 }}
              onClick={() => {
                const next = markers.find((m) => m.kind === 'boss' && !isCollected(character, m))
                if (!next) return
                focusOnMap(next.id)
              }}
            >
              Show on atlas
            </button>
          </KitGroup>

          <KitGroup title="Stat planner">
            <StatPlanner />
          </KitGroup>

          <KitGroup title="Level-up calculator">
            <LevelUpCalculator />
          </KitGroup>

          <KitGroup title="Smithing tracker">
            <SmithingTracker />
          </KitGroup>

          <KitGroup title="Loadout presets">
            <LoadoutPresets />
          </KitGroup>
          </>
          )}
        </section>
      </div>
    )
  }

  return (
    <KitGroup title="Build lab · stats & attack rating">
    <div className="split">
      <section className="panel">
        <div className="kicker">Build lab</div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>Stats drive every other pane</h3>
        <p className="note">Change a number here and the atlas / quest advice still talk about the same person. Attack rating is the real formula from Thomas Clark’s calculator, run on this project’s vendored vanilla 1.17 game data (see THIRD_PARTY_NOTICES.md).</p>
        <div className="stat-grid">
          {(Object.keys(character.stats) as (keyof Stats)[]).map((key) => {
            const value = character.stats[key]
            const label = softCapLabel(key, value)
            return (
              <div className="stat" key={key}>
                <div className="stat-head">
                  <label htmlFor={key}>{key}</label>
                  <span
                    className={label ? 'soft-cap hit' : 'soft-cap'}
                    title={label ? `Soft cap reached: ${label}` : 'Below the first soft cap'}
                  >
                    {SOFT_CAPS[key].map((cap) => (
                      <i key={cap} className={value >= cap ? 'on' : ''} aria-hidden />
                    ))}
                  </span>
                </div>
                <input
                  id={key}
                  type="number"
                  min={1}
                  max={99}
                  value={value}
                  onChange={(e) => patchStat(key, Number(e.target.value))}
                />
              </div>
            )
          })}
        </div>
        <p className="note" style={{ marginTop: -8 }}>
          Dots are the real soft-cap tiers (filled when reached). Offensive-stat
          breakpoints are the game's own scaling-curve stages in this project's vendored
          1.17 game data (Thomas Clark); Vigor/Mind/Endurance use the community
          HP/FP/stamina breakpoints. See <code>src/lib/softCaps.ts</code>.
        </p>

        <RespecAdvisor />

        <UpgradeAdvisor />

        <div className="kit-hunt" style={{ marginTop: 14 }}>
          <div className="kicker">Build hunt</div>
          <label className="note" htmlFor="build-hunt-select" style={{ display: 'block', marginTop: 6 }}>
            Pick a kit to hunt the missing pieces for:
          </label>
          <select
            id="build-hunt-select"
            value={selectedBuild?.id ?? ''}
            onChange={(e) => chooseBuild(e.target.value)}
            style={{ width: '100%', marginTop: 6 }}
          >
            {allBuilds.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {hunt && selectedBuild && (
            <>
              {hunt.missing.length === 0 ? (
                <p className="note" style={{ marginTop: 8 }}>
                  Every seeded piece of {selectedBuild.name} is already logged on this character.
                </p>
              ) : (
                <>
                  <p className="note" style={{ marginTop: 8 }}>
                    {hunt.missing.length} missing · {hunt.pins.length} with a pin. Picking a kit only sets
                    stats and loadout — nothing here is marked until you say so.
                  </p>
                  {hunt.pinTarget && (
                    <button
                      type="button"
                      className="chip on"
                      style={{ marginTop: 6 }}
                      onClick={() => {
                        const t = hunt.pinTarget!
                        if (!watchlistOf(character).includes(t.factId)) setCharacter(toggleWatch(character, t.factId))
                        if (!showLeftovers) toggleLeftovers()
                        focusOnMap(t.factId)
                      }}
                    >
                      Show on map · {hunt.pinTarget.name}
                    </button>
                  )}
                  <ul className="list">
                    {hunt.missing.map((p) => (
                      <li key={p.factId} style={{ display: 'block', cursor: 'default' }}>
                        <span>{p.name}</span>
                        <div className="opts" style={{ marginTop: 4 }}>
                          <button
                            type="button"
                            className="chip"
                            onClick={() => setCharacter(applyFacts(character, [p.factId], 'answer', 'build hunt mark'))}
                          >
                            Mark
                          </button>
                          {p.pin && (
                            <button
                              type="button"
                              className="chip"
                              onClick={() => {
                                if (!watchlistOf(character).includes(p.factId)) {
                                  setCharacter(toggleWatch(character, p.factId))
                                }
                                if (!showLeftovers) toggleLeftovers()
                                focusOnMap(p.factId)
                              }}
                            >
                              Show on map
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {hunt.unresolved.length > 0 && (
                <p className="note">
                  No row yet for {hunt.unresolved.length} id{hunt.unresolved.length === 1 ? '' : 's'} (
                  {hunt.unresolved.map((u) => u.id).join(', ')}), listed not dropped.
                </p>
              )}
            </>
          )}
          <p className="note" style={{ marginTop: 10 }}>
            The OP PvE kits, weapon compare and damage calculator are below; the PvP lists live in{' '}
            <button type="button" className="chip" onClick={() => go('library', 'pvp')}>Library → PvP</button>.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="kicker">Attack rating · patch {REGULATION_STAMP}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>{preview.label}</h3>
        <label className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input
            type="checkbox"
            checked={twoHanding}
            onChange={(e) => setTwoHanding(e.target.checked)}
          />
          Two-handing (×1.5 Str)
        </label>
        {arError && (
          <p className="note" style={{ marginTop: 12 }}>
            Weapon data unavailable ({arError}). Showing no attack rating rather than guessing.
          </p>
        )}
        {!weapons && !arError && <p className="note" style={{ marginTop: 12 }}>Loading weapon data…</p>}
        {weapons && ratings.length === 0 && (
          <p className="note" style={{ marginTop: 12 }}>No armament equipped. Equip a kit or load a save.</p>
        )}
        {ratings.length > 0 && (() => {
          const primary = ratings.find((r) => r.status === 'ok') ?? ratings[0]
          return (
            <p className="ar-hero" style={{ marginTop: 14 }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>
                {primary.status === 'ok' ? `${primary.total} AR` : 'AR unknown'}
              </strong>
              <span className="note" style={{ display: 'block', marginTop: 4 }}>
                {primary.weaponName}
                {primary.status === 'ok' ? ` +${primary.upgradeLevel} · ${primary.affinity}` : ''}
              </span>
            </p>
          )
        })()}
        {isSoteRun(character) && (
          <p className="note" style={{ marginTop: 8 }}>
            AR is base-game; Scadutree Blessing not applied.
          </p>
        )}
        <p className="note" style={{ marginTop: 18 }}>
          Preview: {preview.label}. Poise and equip load are estimates only — the in-repo game
          data has no player poise or equip-load formula, so the attack rating above is the only
          number drawn from real game data.
        </p>
        <p className="note" style={{ marginTop: 18 }}>
          The OP kits, full AR detail, matchup, build codes and weapon compare are below on this
          page; PvP builds and tech live in <strong>Library → PvP</strong>.
        </p>
      </section>
    </div>
    </KitGroup>
  )
}
