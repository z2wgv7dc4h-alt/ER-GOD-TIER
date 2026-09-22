import { useEffect, useMemo, useState } from 'react'
import { markers } from './data/seed'
import { opBuilds } from './knowledge/builds'
import { pvpBuilds, pvpMatchups } from './knowledge/pvp'
import { isCollected, useWorkspace } from './state'
import { applyFacts } from './lib/infer'
import { buildHunt } from './lib/buildHunt'
import { useCoords } from './lib/coords'
import { toggleWatch, watchlistOf } from './lib/leftovers'
import { attackRatingForSlot, loadWeapons } from './lib/ar'
import type { AttackRating, Weapon } from './lib/ar'
import { REGULATION_STAMP } from './lib/regulation'
import { isSoteRun } from './lib/blessings'
import { SOFT_CAPS, softCapLabel } from './lib/softCaps'
import { BUILD_CODE_PREFIX, copyBuildCode, encodeBuildCode, tryDecodeBuildCode } from './lib/buildCode'
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

export function BuildWorkspace() {
  const { character, setCharacter, setModule, setSelectedMarkerId, showLeftovers, toggleLeftovers } = useWorkspace()
  const coords = useCoords()
  const preview = estimateDefense(character)
  const allBuilds = useMemo(() => [...opBuilds, ...pvpBuilds], [])
  const kitId = typeof character.answers.buildKit === 'string' ? character.answers.buildKit : ''
  const selectedBuild = allBuilds.find((b) => b.id === kitId)
  const hunt = useMemo(
    () => (selectedBuild ? buildHunt(character, selectedBuild, coords) : null),
    [character, selectedBuild, coords],
  )
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [arError, setArError] = useState<string | null>(null)
  const [twoHanding, setTwoHanding] = useState(false)
  const { targets: combatTargets, error: combatError } = useCombatTargets()
  const [targetId, setTargetId] = useState('')
  const [enemyQuery, setEnemyQuery] = useState('')
  const [pvpId, setPvpId] = useState('')
  const [buildLabel, setBuildLabel] = useState('')
  const [buildCode, setBuildCode] = useState('')
  const [importCode, setImportCode] = useState('')
  const [buildMsg, setBuildMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
    setCharacter({
      ...character,
      stats: { ...character.stats, [key]: Math.max(1, Math.min(99, value || 1)) },
    })
  }

  async function exportBuild() {
    const code = encodeBuildCode({
      level: character.level,
      stats: character.stats,
      loadout: character.loadout,
      name: buildLabel.trim() || undefined,
    })
    setBuildCode(code)
    const copied = await copyBuildCode(code)
    setBuildMsg({
      ok: true,
      text: copied ? 'Build code copied to clipboard.' : 'Copy blocked — select the code below.',
    })
  }

  function importBuild() {
    const result = tryDecodeBuildCode(importCode)
    if (!result.ok) {
      // Visible error, nothing applied.
      setBuildMsg({ ok: false, text: result.error })
      return
    }
    // Same apply path as the OP/PvP kit chips.
    const { level, stats, loadout, name } = result.build
    setCharacter({ ...character, stats, level, loadout })
    setImportCode('')
    setBuildMsg({
      ok: true,
      text: `Applied ${name ? `“${name}”` : 'build'}: Lv ${level}, ${loadout.length} gear slot${loadout.length === 1 ? '' : 's'}.`,
    })
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="kicker">Kit</div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>Stats drive every other pane</h3>
        <p className="note">Change a number here and the atlas / quest advice still talk about the same person. Attack rating is the real formula from Thomas Clark’s calculator, run on this project’s vendored vanilla 1.17 regulation data (see THIRD_PARTY_NOTICES.md).</p>
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
          1.17 regulation data (Thomas Clark); Vigor/Mind/Endurance use the community
          HP/FP/stamina breakpoints. See <code>src/lib/softCaps.ts</code>.
        </p>

        {selectedBuild && hunt ? (
          <div className="kit-hunt" style={{ marginTop: 14 }}>
            <div className="kicker">Active hunt · {selectedBuild.name}</div>
            {hunt.missing.length === 0 ? (
              <p className="note">Every seeded piece of this kit is already logged on this character.</p>
            ) : (
              <>
                <p className="note">
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
                      setSelectedMarkerId(t.factId)
                      setModule('map')
                    }}
                  >
                    Show on map · {hunt.pinTarget.name}
                  </button>
                )}
                <ul className="list">
                  {hunt.missing.map((p) => (
                    <li key={p.factId} style={{ display: 'block', cursor: 'default' }}>
                      <span>
                        {p.name} <em className="dim">{p.factId}</em>
                      </span>
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
                              setSelectedMarkerId(p.factId)
                              setModule('map')
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
          </div>
        ) : (
          <p className="note" style={{ marginTop: 14 }}>
            <strong>Pick a kit…</strong> Open the Kits drawer for the OP and PvP lists, or load a save.
          </p>
        )}

        <details className="kits-drawer" style={{ marginTop: 16 }}>
          <summary className="chip" style={{ cursor: 'pointer' }}>Kits…</summary>

          <div className="kicker" style={{ marginTop: 18 }}>OP kits</div>
          <div className="opts">
            {opBuilds.map((b) => (
              <button
                key={b.id}
                type="button"
                className="chip"
                onClick={() => setCharacter({ ...character, stats: b.stats, level: b.level, loadout: b.kit, answers: { ...character.answers, buildKit: b.id } })}
              >
                {b.name}
              </button>
            ))}
          </div>
          <p className="note" style={{ marginTop: 8 }}>
            Kits set stats and a shopping list. They do not invent AR. Locations are in the Codex and Gideon.
          </p>

          <div className="kicker" style={{ marginTop: 18 }}>PvP kits · patch 1.17</div>
          <p className="note">
            PvP is its own game: poise, stance and invade-vs-host asymmetry matter more than raw damage,
            and skills/status are scaled separately against players. Kits below are target spreads, not
            extracted numbers — see docs/research/op-builds-pvp-tricks-sources.md.
          </p>
          <div className="opts">
            {pvpBuilds.map((b) => (
              <button
                key={b.id}
                type="button"
                className="chip"
                onClick={() => {
                  setCharacter({ ...character, stats: b.stats, level: b.level, loadout: b.kit, answers: { ...character.answers, buildKit: b.id } })
                  setPvpId(b.id)
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
          {(() => {
            const b = pvpBuilds.find((x) => x.id === pvpId)
            return b ? (
              <p className="note" style={{ marginTop: 8 }}>
                <strong>{b.mode}</strong> · {b.bracket} — {b.why} Beats: {b.beats} Watch out for: {b.losesTo}
              </p>
            ) : null
          })()}

          <div className="kicker" style={{ marginTop: 18 }}>PvP matchups</div>
          <ul className="list" style={{ marginTop: 8 }}>
            {pvpMatchups.map((m) => (
              <li key={m.id} style={{ cursor: 'default', display: 'block' }}>
                <span>{m.threat}</span>
                <p className="note" style={{ margin: '4px 0 0' }}>{m.tell} {m.counters[0]}</p>
              </li>
            ))}
          </ul>

          <div className="gear">
            {character.loadout.length === 0 && <p className="note">Load a save, an OP kit, or the demo character.</p>}
            {character.loadout.map((slot) => (
              <div className="gear-row" key={slot.id}>
                <em>{slot.kind}</em>
                <span>{slot.name}</span>
                <span>{slot.affinity ? `${slot.affinity} +${slot.upgrade ?? 0}` : ''}</span>
              </div>
            ))}
          </div>

          <div className="kicker" style={{ marginTop: 18 }}>Build code</div>
          <p className="note">
            Share just the build — stats, level and gear. Not a packet: it carries no run
            progress, and importing a code never renames your Tarnished.
          </p>
          <div className="opts" style={{ marginTop: 8 }}>
            <input
              className="search"
              style={{ minWidth: 150 }}
              placeholder="Build label (optional)"
              maxLength={40}
              value={buildLabel}
              onChange={(e) => setBuildLabel(e.target.value)}
            />
            <button type="button" className="chip on" onClick={() => void exportBuild()}>
              Export build
            </button>
          </div>
          {buildCode && (
            <input
              className="search"
              style={{ width: '100%', marginTop: 6 }}
              readOnly
              value={buildCode}
              aria-label="Build code"
              onFocus={(e) => e.target.select()}
            />
          )}
          <div className="kicker" style={{ marginTop: 12 }}>Import a build code</div>
          <textarea
            className="search"
            style={{ width: '100%', minHeight: 56, marginTop: 6, resize: 'vertical' }}
            placeholder={`Paste a code starting with ${BUILD_CODE_PREFIX}`}
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
          />
          <div className="opts" style={{ marginTop: 6 }}>
            <button type="button" className="chip on" disabled={!importCode.trim()} onClick={importBuild}>
              Apply build code
            </button>
          </div>
          {buildMsg && (
            <p
              className="note"
              role="status"
              style={{ color: buildMsg.ok ? 'var(--ok)' : 'var(--danger)' }}
            >
              {buildMsg.text}
            </p>
          )}

          <div className="kicker" style={{ marginTop: 18 }}>Attack rating detail</div>
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

          <div className="kicker" style={{ marginTop: 20 }}>Matchup · NpcParam absorb</div>
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
              setSelectedMarkerId(next.id)
              setModule('map')
            }}
          >
            Show on atlas
          </button>

          {weapons && (
            <WeaponCompare
              weapons={weapons}
              stats={character.stats}
              target={target}
              targetName={target?.name}
            />
          )}
        </details>
      </section>

      <section className="panel">
        <div className="kicker">Attack rating · regulation {REGULATION_STAMP}</div>
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
            Regulation data unavailable ({arError}). Showing no attack rating rather than guessing.
          </p>
        )}
        {!weapons && !arError && <p className="note" style={{ marginTop: 12 }}>Loading regulation data…</p>}
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
          Preview: {preview.label}. Poise and equip load are estimates only — the in-repo regulation
          extract has no player poise or equip-load formula, so the attack rating above is the only
          number drawn from real game data.
        </p>
        <p className="note" style={{ marginTop: 18 }}>
          Everything else — the OP and PvP lists, the full AR detail, the matchup, build codes and the
          weapon compare — is behind <strong>Kits…</strong>.
        </p>
      </section>
    </div>
  )
}
