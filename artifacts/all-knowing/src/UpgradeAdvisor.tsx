import { useEffect, useMemo, useState } from 'react'
import { loadWeapons, type Weapon } from './lib/ar'
import { earlyWeaponRanking, weaponAdvice, type WeaponAdvice } from './lib/upgradeAdvice'
import { useWorkspace } from './state'

/**
 * Task 92 row 5: the deterministic upgrade advice that used to only reach the
 * player through Gideon's router, surfaced as a panel in Library → Builds. It
 * calls the same `weaponAdvice` / `earlyWeaponRanking` helpers; no new maths.
 */
export function UpgradeAdvisor() {
  const { character } = useWorkspace()
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [target, setTarget] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadWeapons().then((w) => { if (!cancelled) setWeapons(w) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const advice: WeaponAdvice | null = useMemo(
    () => (weapons && target.trim().length >= 3 ? weaponAdvice(weapons, target, character.stats) : null),
    [weapons, target, character.stats],
  )
  const early = useMemo(
    () => (weapons ? earlyWeaponRanking(weapons, character.stats, 5) : []),
    [weapons, character.stats],
  )

  return (
    <div className="upgrade-advisor" style={{ marginTop: 14 }}>
      <div className="kicker">Upgrade advice</div>
      <p className="note" style={{ margin: '4px 0 6px' }}>
        Name a weapon to see what its next smithing level buys on your current stats. Numbers come
        from the same AR engine as the panel above.
      </p>
      <input
        className="search"
        placeholder="Type a weapon name…"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        aria-label="Upgrade target"
      />
      {advice && (
        <div style={{ marginTop: 8 }}>
          <p className="note">
            <strong>{advice.name}</strong> +0 → +{advice.upgradeMax}: <strong>{advice.arNow}</strong> →{' '}
            <strong>{advice.arMax}</strong> AR (two-handing now {advice.twoHandedArNow}).{' '}
            {advice.meets ? 'Requirements met.' : `Needs ${advice.insufficient.join(', ')}.`}
            {advice.primary ? ` Scales with ${advice.primary.toUpperCase()}.` : ''}
          </p>
          <div className="opts">
            {advice.scaling.map((s) => (
              <span key={s.attr} className="chip">
                {s.attr} {s.from}→{s.to}
              </span>
            ))}
          </div>
        </div>
      )}
      {!advice && early.length > 0 && (
        <p className="note" style={{ marginTop: 8 }}>
          Best weapons your stats can already wield:{' '}
          {early.map((e) => `${e.name} (${e.ar})`).join(', ')}.
        </p>
      )}
    </div>
  )
}
