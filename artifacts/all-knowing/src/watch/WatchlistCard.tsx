import { useMemo } from 'react'
import { EntityLink } from '../EntityLink'
import { useCoords } from '../lib/coords'
import { useWorkspace } from '../state'
import { toggleWatch, watchIds, watchPins } from './watchlist'

/**
 * Task 112 §3 — Journey › Now watchlist card. Every starred entity, with a map
 * jump when a pin exists and an unstar affordance. Hidden when the list is empty.
 */
export function WatchlistCard() {
  const w = useWorkspace()
  const coords = useCoords()
  const ids = watchIds(w.character)
  const pinById = useMemo(
    () => new Map(watchPins(w.character, coords).map((p) => [p.id, p])),
    [w.character, coords],
  )
  if (!ids.length) return null
  return (
    <section className="panel watchlist-card">
      <div className="kicker">Watchlist · {ids.length}</div>
      <p className="note">Starred from any entity page. They never change your run on their own.</p>
      <ul className="now-rows watchlist-rows">
        {ids.map((id) => {
          const pin = pinById.get(id)
          return (
            <li key={id} className="watchlist-row">
              <EntityLink id={id} />
              {pin && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => w.focusOnMap(pin.id)}
                >
                  Show on map
                </button>
              )}
              <button
                type="button"
                className="chip"
                title="Stop watching"
                aria-label="Stop watching"
                onClick={() => w.setCharacter(toggleWatch(w.character, id))}
              >
                ☆
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
