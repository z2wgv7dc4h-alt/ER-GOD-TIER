import { useEffect, useMemo, useState } from 'react'
import { markers } from './data/seed'
import { opBuilds } from './knowledge/builds'
import { isCollected, useWorkspace } from './state'
import { attackRatingForSlot, loadWeapons } from './lib/ar'
import type { AttackRating, Weapon } from './lib/ar'
import { REGULATION_STAMP } from './lib/regulation'
import { Related } from './Related'
import {
  bestDamageType,
  bossCombatFor,
  damageTypeLabels,
  damageTypes,
  effectiveDamage,
  negationText,
  resistSummary,
  useBossCombat,
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
  const { bosses: bossCombat, error: bossError } = useBossCombat()
  const [bossId, setBossId] = useState('')

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

  const nextUndefeatedBoss = markers.find(
    (m) => m.kind === 'boss' && !isCollected(character, m) && bossCombat.some((b) => b.factId === m.id),
  )
  const activeBossId = bossId || nextUndefeatedBoss?.id || bossCombat[0]?.factId || ''
  const boss = bossCombatFor(bossCombat, activeBossId)

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
        <div className="kicker" style={{ marginTop: 20 }}>Boss matchup · NpcParam absorb</div>
        {bossError && (
          <p className="note" style={{ marginTop: 10 }}>
            Boss combat data unavailable ({bossError}). Nothing shown rather than guessed.
          </p>
        )}
        {!bossError && bossCombat.length === 0 && (
          <p className="note" style={{ marginTop: 10 }}>Loading boss combat data…</p>
        )}
        {bossCombat.length > 0 && (
          <>
            <label className="note" htmlFor="boss-matchup" style={{ display: 'block', marginTop: 10 }}>Target</label>
            <select
              id="boss-matchup"
              value={activeBossId}
              onChange={(e) => setBossId(e.target.value)}
              style={{ marginTop: 6, width: '100%' }}
            >
              {bossCombat.map((b) => (
                <option key={b.factId} value={b.factId}>{b.name}</option>
              ))}
            </select>
          </>
        )}
        {boss && (
          <>
            <ul className="list" style={{ marginTop: 10 }}>
              {damageTypes.map((t) => (
                <li key={t} style={{ cursor: 'default' }}>
                  <span>{damageTypeLabels[t]}</span>
                  <span>{negationText(boss.negation[t])}</span>
                </li>
              ))}
            </ul>
            <p className="note" style={{ marginTop: 8 }}>
              Weakest to <strong>{damageTypeLabels[bestDamageType(boss)]}</strong>
              {boss.poise != null ? ` · poise ${boss.poise}` : ''}. Negation is read straight from the
              game's NpcParam; a negative value means the boss takes extra damage.
            </p>
            {ratings.some((r) => r.status === 'ok') && (
              <ul className="list" style={{ marginTop: 8 }}>
                {ratings.map((r, i) =>
                  r.status === 'ok' ? (
                    <li key={`eff-${i}`} style={{ cursor: 'default' }}>
                      <span>{r.weaponName} after negation</span>
                      <span>{Math.floor(effectiveDamage(r.breakdown, boss).total)}</span>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
            <p className="note" style={{ marginTop: 8 }}>Resistances: {resistSummary(boss)}</p>
            <Related id={boss.factId} />
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
