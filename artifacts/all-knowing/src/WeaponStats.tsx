import { useEffect, useState } from 'react'
import { matchWeaponStats, weaponStatRows, type WeaponStatRow } from './lib/weaponStats'

/**
 * Weapon numeric params in the Codex: base attack, requirements and scaling
 * letters, from the vanilla 1.17 regulation data the AR calculator already
 * uses. Loaded on demand once the query is long enough.
 */
export function WeaponStatsSection({
  query,
  preloaded,
}: {
  query: string
  preloaded?: WeaponStatRow[]
}) {
  const [rows, setRows] = useState<WeaponStatRow[] | null>(preloaded ?? null)
  const q = query.trim()

  useEffect(() => {
    if (q.length < 3 || rows) return
    let cancelled = false
    void weaponStatRows()
      .then((r) => { if (!cancelled) setRows(r) })
      .catch(() => { /* no regulation data: section stays hidden */ })
    return () => {
      cancelled = true
    }
  }, [q, rows])

  const data = preloaded ?? rows
  if (q.length < 3 || !data) return null
  const hits = matchWeaponStats(q, data)
  if (hits.length === 0) return null

  return (
    <>
      <h3 className="codex-head">Weapons · requirements &amp; scaling (vanilla 1.17)</h3>
      <div className="codex-grid">
        {hits.map((w) => (
          <article className="card" key={w.weaponName}>
            <div className="kicker">
              {w.attack.map((a) => `${a.label} ${a.value}`).join(' · ') || 'no base attack'}
            </div>
            <h3>{w.name}</h3>
            <p className="note">
              Requires {w.requirements.map((r) => `${r.attr} ${r.value}`).join(', ') || 'none'}
              {' · '}
              Scaling {w.scaling.map((s) => `${s.attr} ${s.letter}`).join(', ') || 'none'}
            </p>
          </article>
        ))}
      </div>
    </>
  )
}
