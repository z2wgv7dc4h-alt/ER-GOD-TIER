import type { Weapon } from '../lib/ar'
import { statusRows } from '../lib/combat'
import type { CombatStats } from '../lib/enemy'
import './combat.css'

/**
 * Task 105 — status resistance vs "hits to proc". Self-contained (own CSS, no
 * shell wiring). `weapon` is the arms the count is computed from; omit it to
 * show resistance alone. Frostbite is reported as "not extracted" because the
 * NpcParam dump carries no frost field.
 */
export function StatusTable({ target, weapon, upgrade = 0 }: { target: CombatStats; weapon?: Weapon; upgrade?: number }) {
  const rows = statusRows(weapon, target, upgrade)
  return (
    <table className="combat-status">
      <thead>
        <tr>
          <th scope="col">Status</th>
          <th scope="col">Resist</th>
          <th scope="col">Hits to proc</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.immune ? 'immune' : ''}>
            <th scope="row">{row.label}</th>
            <td>{row.resist == null ? '—' : row.resist >= 999 ? 'immune' : row.resist}</td>
            <td>
              {row.hitsToProc != null ? row.hitsToProc : '—'}
              <span className="combat-status-note">{row.note}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
