import { useEffect, useMemo, useState } from 'react'
import { markers } from './data/seed'
import { opBuilds } from './knowledge/builds'
import { pvpBuilds, pvpMatchups } from './knowledge/pvp'
import { isCollected, useWorkspace } from './state'
import { attackRatingForSlot, loadWeapons } from './lib/ar'
import type { AttackRating, Weapon } from './lib/ar'
import { REGULATION_STAMP } from './lib/regulation'
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

function estimateDefense(character: Character) {
  const weapon = character.loadout.find((s) => s.kind === 'armament')
  if (!weapon) return { poise: 0, load: 0, label: 'No armament' }
  const upgrade = weapon.upgrade ?? 0
  const poise = 28 + (character.startingClass === 'heavy-knight' ? 49 : 8)
  const load = 48 + character.stats.endurance * 0.8
  return { poise, load, label: `${weapon.name} +${upgrade} ${weapon.affinity ?? ''}`.trim() }
}

export function BuildWorkspace() {
  const { character, setCharacter, setModule, setSelectedMarkerId } = useWorkspace()
  const preview = estimateDefense(character)
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [arError, setArError] = useState<string | null>(null)
  const [twoHanding, setTwoHanding] = useState(false)
  const { targets: combatTargets, error: combatError } = useCombatTargets()
  const [targetId, setTargetId] = useState('')
  const [enemyQuery, setEnemyQuery] = useState('')
  const [pvpId, setPvpId] = useState('')

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

  return (
    <div className="split">
      <section className="panel">
        <div className="kicker">Character sheet</div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>Stats drive every other pane</h3>
        <p className="note">Change a number here and the atlas / quest advice still talk about the same person. Attack rating is the real formula from Thomas Clark’s calculator, run on this project’s vendored vanilla 1.17 regulation data (see THIRD_PARTY_NOTICES.md).</p>
        <div className="stat-grid">
          {(Object.keys(character.stats) as (keyof Stats)[]).map((key) => (
            <div className="stat" key={key}>
              <label htmlFor={key}>{key}</label>
              <input
                id={key}
                type="number"
                min={1}
                max={99}
                value={character.stats[key]}
                onChange={(e) => patchStat(key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <div className="kicker" style={{ marginTop: 18 }}>OP kits</div>
        <div className="opts">
          {opBuilds.map((b) => (
            <button
              key={b.id}
              type="button"
              className="chip"
              onClick={() => setCharacter({ ...character, stats: b.stats, level: b.level, loadout: b.kit })}
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
                setCharacter({ ...character, stats: b.stats, level: b.level, loadout: b.kit })
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
          </>
        )}
        <div className="meters" style={{ marginTop: 18 }}>
          <div className="meter">
            <label><span>Poise (sketch)</span><span>{preview.poise}</span></label>
            <div className="bar"><span style={{ width: `${Math.min(100, preview.poise)}%` }} /></div>
          </div>
          <div className="meter">
            <label><span>Equip load budget</span><span>{preview.load.toFixed(1)}</span></label>
            <div className="bar"><span style={{ width: `${Math.min(100, preview.load)}%` }} /></div>
          </div>
        </div>
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
      </section>
    </div>
  )
}
