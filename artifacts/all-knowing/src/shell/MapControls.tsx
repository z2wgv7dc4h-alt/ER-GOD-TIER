import { layerOrder } from '../lib/nav'
import { useWorkspace } from '../state'

/**
 * Desktop Atlas control surface. Task 91 moved the header around, so the map
 * job/layer chips that used to live in the topbar are rendered here for
 * `journey/map`; CSS hides them under 700px where the Atlas' own phone job bar
 * (Task 69) takes over.
 */
export function MapControls() {
  const w = useWorkspace()
  return (
    <div className="toggles map-controls" role="group" aria-label="Map filters">
      <button className={w.missingOnly ? 'chip on' : 'chip'} onClick={() => w.setMissingOnly(!w.missingOnly)}>
        Missing only
      </button>
      <button className={w.showLeftovers ? 'chip on' : 'chip'} onClick={() => w.toggleLeftovers()}>
        leftovers
      </button>
      <button className={w.showGates ? 'chip on' : 'chip'} onClick={() => w.toggleGates()}>
        locks
      </button>
      <button className={w.follow ? 'chip on' : 'chip'} aria-pressed={w.follow} onClick={() => w.toggleFollow()}>
        follow
      </button>
      <button className={w.showHeat ? 'chip on' : 'chip'} aria-pressed={w.showHeat} onClick={() => w.toggleHeat()}>
        undone heat
      </button>
      <button className={w.showWatch ? 'chip on' : 'chip'} aria-pressed={!!w.showWatch} onClick={() => w.toggleWatch()}>
        Watchlist
      </button>
      {layerOrder.map((id) => (
        <button key={id} className={w.layers[id] ? 'chip on' : 'chip'} onClick={() => w.toggleLayer(id)}>
          {id}
        </button>
      ))}
    </div>
  )
}
