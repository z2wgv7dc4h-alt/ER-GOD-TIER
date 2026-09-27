import { useEffect, useMemo, useState } from 'react'
import { affinityLabel, findWeapon, loadWeapons, type Weapon } from '../lib/ar'
import { damageVs } from '../lib/combat'
import { damageTypeLabels, damageTypeToAttackPower, useBossCombat, useEnemyCombat, type DamageType } from '../lib/enemy'
import { useWorkspace } from '../state'
import { StatusTable } from './StatusTable'
import './combat.css'

const DAMAGE_TYPES: DamageType[] = ['physical', 'magic', 'fire', 'lightning', 'holy']

const AFFINITIES = [
  'Standard',
  'Heavy',
  'Keen',
  'Quality',
  'Fire',
  'Flame Art',
  'Lightning',
  'Sacred',
  'Magic',
  'Cold',
  'Poison',
  'Blood',
  'Occult',
  'Unique',
]

/**
 * Task 105 — the damage calculator. Pick a weapon, upgrade and affinity; pick a
 * boss or field enemy; see the per-damage-type breakdown after negation (and an
 * optional flat defence the row carries). Self-contained and not wired into the
 * shell yet.
 */
export function DamageCalc() {
  const { character } = useWorkspace()
  const { bosses } = useBossCombat()
  const { enemies } = useEnemyCombat()
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [weaponName, setWeaponName] = useState('')
  const [affinity, setAffinity] = useState('')
  const [upgrade, setUpgrade] = useState(0)
  const [targetId, setTargetId] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadWeapons()
      .then((rows) => {
        if (!cancelled) setWeapons(rows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const baseNames = useMemo(
    () => (weapons ? [...new Set(weapons.map((w) => w.weaponName))].sort() : []),
    [weapons],
  )

  // Derive the selected values so no effect has to sync state after load.
  const activeName = weaponName || baseNames[0] || ''
  const activeTarget = targetId || bosses[0]?.factId || ''

  const resolved = useMemo(
    () => (weapons && activeName ? findWeapon(weapons, { id: 'calc', name: activeName, kind: 'armament', affinity: affinity || undefined }) : undefined),
    [weapons, activeName, affinity],
  )

  const result = useMemo(
    () =>
      weapons && activeName && activeTarget
        ? damageVs(activeName, upgrade, affinity || undefined, character.stats, activeTarget, { weapons, bosses, enemies })
        : null,
    [weapons, activeName, affinity, upgrade, character.stats, activeTarget, bosses, enemies],
  )

  const target = useMemo(
    () => bosses.find((b) => b.factId === activeTarget) ?? enemies.find((e) => e.factId === activeTarget),
    [bosses, enemies, activeTarget],
  )

  const maxUpgrade = resolved ? Math.max(0, resolved.attack.length - 1) : 25

  return (
    <div className="combat-damage">
      <p className="note">AR from the vanilla 1.17 weapon data; negation from the game’s NpcParam dump.</p>
      <div className="combat-fields">
        <label>
          <span>Weapon</span>
          <select value={activeName} onChange={(e) => setWeaponName(e.target.value)}>
            {baseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Affinity</span>
          <select value={affinity} onChange={(e) => setAffinity(e.target.value)}>
            {AFFINITIES.map((a) => (
              <option key={a} value={a === 'Standard' ? '' : a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Upgrade +{upgrade}</span>
          <input
            type="range"
            min={0}
            max={maxUpgrade}
            value={Math.min(upgrade, maxUpgrade)}
            onChange={(e) => setUpgrade(Number(e.target.value))}
          />
        </label>
        <label>
          <span>Target</span>
          <select value={activeTarget} onChange={(e) => setTargetId(e.target.value)}>
            <optgroup label="Bosses">
              {bosses.map((b) => (
                <option key={b.factId} value={b.factId}>
                  {b.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Field enemies">
              {enemies.map((e) => (
                <option key={e.factId} value={e.factId}>
                  {e.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      {!weapons ? (
        <p className="note">Loading weapon data…</p>
      ) : !result || result.status !== 'ok' ? (
        <p className="note">{result?.status === 'unknown' ? result.reason : 'Pick a weapon and a target.'}</p>
      ) : (
        <>
          <p className="note">
            {resolved ? `${resolved.name} · ${affinityLabel(resolved.affinityId)} +${result.upgrade}` : result.weaponName} vs{' '}
            <strong>{result.targetName}</strong> · {result.arTotal} AR
            {!result.meets ? ` · ${result.requirement}` : ''}
          </p>
          <table className="combat-damage-table">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Raw</th>
                <th scope="col">After negation</th>
                {result.defenseModelled && <th scope="col">After defence</th>}
              </tr>
            </thead>
            <tbody>
              {DAMAGE_TYPES.map((type) => {
                const key = damageTypeToAttackPower[type]
                const raw = result.ar[key] ?? 0
                if (raw === 0) return null
                return (
                  <tr key={type}>
                    <th scope="row">{damageTypeLabels[type]}</th>
                    <td>{Math.floor(raw)}</td>
                    <td>{Math.floor(result.afterNegation[key] ?? 0)}</td>
                    {result.defenseModelled && <td>{Math.floor(result.afterDefense[key] ?? 0)}</td>}
                  </tr>
                )
              })}
              <tr className="total">
                <th scope="row">Total</th>
                <td>{result.arTotal}</td>
                <td>{Math.floor(result.negationTotal)}</td>
                {result.defenseModelled && <td>{Math.floor(result.defenseTotal)}</td>}
              </tr>
            </tbody>
          </table>
          {!result.defenseModelled && (
            <p className="note">Defence values are not in the extracted NpcParam table, so only negation is applied.</p>
          )}
          {target && <StatusTable target={target} weapon={resolved} upgrade={upgrade} />}
        </>
      )}
    </div>
  )
}
