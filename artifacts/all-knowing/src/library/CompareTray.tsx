import { compareWeaponAr, type CompareSide } from '../lib/weaponCompare'
import type { AttackRating, Weapon } from '../lib/ar'
import type { Character } from '../types'
import { attributeStats, type LibraryEntity } from './model'

/**
 * Task 95 — the compare tray. Pins live in the browser's state; this component
 * only renders the sticky tray and, when opened, the side-by-side table.
 *
 * Weapon ratings go through the shared `compareWeaponAr` wrapper (Task 48), so
 * there is exactly one AR calculation in the app.
 */

export type CompareTrayProps = {
  entities: LibraryEntity[]
  character: Character
  weapons: Weapon[]
  onRemove: (id: string) => void
  onClear: () => void
  onClose?: () => void
}

function ratingText(rating: AttackRating): string {
  if (rating.status === 'ok') return `${rating.total} AR${rating.affinity ? ` · ${rating.affinity}` : ''}`
  return rating.reason
}

export function CompareTray({ entities, character, weapons, onRemove, onClear, onClose }: CompareTrayProps) {
  if (entities.length === 0) return null
  const stats = character.stats

  const side = (entity: LibraryEntity): CompareSide => ({
    slot: { id: entity.id, name: entity.weaponName ?? entity.name, kind: 'armament', upgrade: 0 },
    twoHanding: false,
  })

  const ratings: (AttackRating | null)[] = []
  if (weapons.length && entities.length) {
    const base = entities[0]
    ratings.push(compareWeaponAr(weapons, stats, side(base), side(base)).a.rating)
    for (let i = 1; i < entities.length; i++) {
      ratings.push(compareWeaponAr(weapons, stats, side(base), side(entities[i])).b.rating)
    }
  } else {
    for (let i = 0; i < entities.length; i++) ratings.push(null)
  }

  return (
    <section className="lib-compare" aria-label="Compare tray">
      <div className="lib-compare-bar">
        <span className="lib-compare-label">Compare · {entities.length}/4</span>
        <div className="lib-compare-pins">
          {entities.map((e) => (
            <span key={e.id} className="chip on lib-compare-pin">
              {e.name}
              <button type="button" className="lib-pin-x" aria-label={`Remove ${e.name}`} onClick={() => onRemove(e.id)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="opts">
          <button type="button" className="chip" onClick={onClear}>
            Clear
          </button>
          {onClose && (
            <button type="button" className="chip" onClick={onClose}>
              Hide
            </button>
          )}
        </div>
      </div>

      <div className="lib-compare-scroll">
        <table className="lib-compare-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Weight</th>
              <th>Requirements</th>
              <th>Scaling</th>
              <th>AR (my stats)</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((e, i) => {
              const attrs = attributeStats(character)
              const reqs = Object.entries(e.requirements ?? {}) as [keyof typeof attrs, number][]
              const scaling = Object.entries(e.scaling ?? {})
              return (
                <tr key={e.id}>
                  <td>
                    {e.icon && <img className="lib-compare-icon" src={e.icon} alt="" loading="lazy" decoding="async" />}
                    {e.name}
                  </td>
                  <td>{e.subtype ?? e.category}</td>
                  <td>{e.weight ?? '—'}</td>
                  <td>
                    {reqs.length
                      ? reqs.map(([k, v]) => `${k.toUpperCase()} ${v}${attrs[k] >= v ? '✓' : '✗'}`).join(' · ')
                      : '—'}
                  </td>
                  <td>{scaling.length ? scaling.map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') : '—'}</td>
                  <td>{ratings[i] ? ratingText(ratings[i] as AttackRating) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
