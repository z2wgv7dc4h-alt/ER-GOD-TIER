import { useMemo, useState } from 'react'
import { affinityLabel, damageTypeLabels, type Weapon } from './lib/ar'
import type { CombatStats } from './lib/enemy'
import { compareWeaponAr } from './lib/weaponCompare'
import type { LoadoutSlot, Stats } from './types'

type SideState = { base: string; affinityId: number; upgrade: number; twoHanding: boolean }

function affinityOptions(weapons: Weapon[], base: string) {
  const seen = new Map<number, string>()
  for (const w of weapons) {
    if (w.weaponName === base) seen.set(w.affinityId, affinityLabel(w.affinityId))
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }))
}

function defaultAffinityId(weapons: Weapon[], base: string) {
  const options = affinityOptions(weapons, base)
  return (options.find((o) => o.id === 0) ?? options[0])?.id ?? 0
}

function maxUpgrade(weapons: Weapon[], base: string, affinityId: number) {
  const weapon = weapons.find((w) => w.weaponName === base && w.affinityId === affinityId)
  return weapon ? weapon.attack.length - 1 : 0
}

function initSide(weapons: Weapon[], base: string): SideState {
  return { base, affinityId: defaultAffinityId(weapons, base), upgrade: 0, twoHanding: false }
}

/**
 * Additive side-by-side weapon comparison for the Build lab (Task 48). It does not
 * replace the single-weapon flow; it calls the same `attackRatingForSlot` engine
 * through `compareWeaponAr`, so both sides are real AR. Each side keeps its own
 * two-handing flag, and both update live as the character's stats change (the
 * component re-derives from the `stats` prop). Effective damage vs the selected
 * target is shown when a target exists.
 */
export function WeaponCompare({
  weapons,
  stats,
  target,
  targetName,
}: {
  weapons: Weapon[]
  stats: Stats
  target?: CombatStats | null
  targetName?: string
}) {
  const bases = useMemo(
    () => [...new Set(weapons.map((w) => w.weaponName))].sort((a, b) => a.localeCompare(b)),
    [weapons],
  )
  const [sides, setSides] = useState(() => ({
    a: initSide(weapons, bases[0] ?? ''),
    b: initSide(weapons, bases[1] ?? bases[0] ?? ''),
  }))

  function patch(side: 'a' | 'b', next: Partial<SideState>) {
    setSides((s) => ({ ...s, [side]: { ...s[side], ...next } }))
  }

  const result = useMemo(() => {
    const toSlot = (id: string, s: SideState): LoadoutSlot => ({
      id,
      name: s.base,
      kind: 'armament',
      affinity: affinityLabel(s.affinityId),
      upgrade: s.upgrade,
    })
    return compareWeaponAr(
      weapons,
      stats,
      { slot: toSlot('cmp-a', sides.a), twoHanding: sides.a.twoHanding },
      { slot: toSlot('cmp-b', sides.b), twoHanding: sides.b.twoHanding },
      target ?? null,
    )
  }, [weapons, stats, sides, target])

  if (!bases.length) return null

  function renderSide(side: 'a' | 'b') {
    const s = sides[side]
    const r = result[side]
    const options = affinityOptions(weapons, s.base)
    const max = maxUpgrade(weapons, s.base, s.affinityId)
    const win = result.winner === side
    return (
      <div className={win ? 'weapon-side win' : 'weapon-side'} key={side}>
        <div className="kicker">
          {side.toUpperCase()}
          {win ? ' · wins' : ''}
        </div>
        <select
          value={s.base}
          aria-label={`Weapon ${side.toUpperCase()}`}
          onChange={(e) =>
            patch(side, {
              base: e.target.value,
              affinityId: defaultAffinityId(weapons, e.target.value),
              upgrade: 0,
            })
          }
        >
          {bases.map((base) => (
            <option key={base} value={base}>{base}</option>
          ))}
        </select>
        <div className="opts" style={{ marginTop: 6 }}>
          <select
            value={s.affinityId}
            aria-label={`Affinity ${side.toUpperCase()}`}
            onChange={(e) => {
              const affinityId = Number(e.target.value)
              patch(side, {
                affinityId,
                upgrade: Math.min(s.upgrade, maxUpgrade(weapons, s.base, affinityId)),
              })
            }}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <label className="note" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            +<input
              type="number"
              min={0}
              max={max}
              value={s.upgrade}
              style={{ width: 56 }}
              aria-label={`Upgrade ${side.toUpperCase()}`}
              onChange={(e) =>
                patch(side, { upgrade: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })
              }
            />
          </label>
        </div>
        <label className="note" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={s.twoHanding}
            aria-label={`Two-handing ${side.toUpperCase()}`}
            onChange={(e) => patch(side, { twoHanding: e.target.checked })}
          />
          Two-handing
        </label>

        {r.rating.status === 'ok' ? (
          <ul className="list" style={{ marginTop: 8 }}>
            {Object.entries(r.rating.breakdown).map(([type, value]) => (
              <li key={type} style={{ cursor: 'default' }}>
                <span>{damageTypeLabels[Number(type)] ?? `type ${type}`}</span>
                <span>{Math.round(value as number)}</span>
              </li>
            ))}
            <li style={{ cursor: 'default' }}>
              <span><strong>Total AR</strong></span>
              <span><strong>{r.rating.total}</strong></span>
            </li>
          </ul>
        ) : (
          <p className="note" style={{ marginTop: 8 }}>{r.rating.reason}</p>
        )}

        {r.effective && (
          <p className="note" style={{ marginTop: 6 }}>
            Effective vs {targetName || 'target'}: <strong>{Math.floor(r.effective.total)}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className="kicker">Compare two weapons</div>
      <p className="note">
        Real AR from the same calculator as the loadout above. Two-handing is per side.
        {target ? ` Effective damage shown vs ${targetName || 'the selected target'}.` : ''}
      </p>
      <div className="weapon-compare">
        {renderSide('a')}
        {renderSide('b')}
      </div>
      <p className="note" style={{ marginTop: 8 }} role="status">
        {result.winner === 'tie'
          ? 'Dead heat on the current stats/target.'
          : `${result.winner.toUpperCase()} wins on the current stats/target.`}
      </p>
    </div>
  )
}
