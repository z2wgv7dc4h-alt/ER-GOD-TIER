import { useWorkspace } from '../state'
import { isWatched, toggleWatch } from './watchlist'

/** Task 112 §3 — the star on every entity page. */
export function WatchButton({ id, name }: { id: string; name?: string }) {
  const { character, setCharacter } = useWorkspace()
  const watched = isWatched(character, id)
  return (
    <button
      type="button"
      className={watched ? 'chip on' : 'chip'}
      aria-pressed={watched}
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={() => setCharacter(toggleWatch(character, id, name))}
    >
      {watched ? '★ Watching' : '☆ Watch'}
    </button>
  )
}
