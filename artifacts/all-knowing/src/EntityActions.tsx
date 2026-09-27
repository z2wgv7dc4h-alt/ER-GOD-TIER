import { applyFacts } from './lib/infer'
import { labelOf } from './lib/links'
import { factState, useWorkspace } from './state'
import { WatchButton } from './watch/WatchButton'

/**
 * Task 92 cross-linking rule: any entity rendered anywhere exposes the same four
 * actions — Show on map · Mark done · Ask Gideon · Open in Library. It reuses the
 * existing workspace contract (`setModule` / `setSelectedMarkerId` /
 * `applyFacts`) rather than introducing a second link system.
 */
export function EntityActions({ id, name }: { id: string; name?: string }) {
  const { character, setCharacter, setModule, setSelectedMarkerId, go } = useWorkspace()
  const label = name || labelOf(id)
  const known = factState(character, id) === 'true'

  return (
    <div className="opts entity-actions" role="group" aria-label={`Actions for ${label}`}>
      <button type="button" className="chip" onClick={() => { setSelectedMarkerId(id); setModule('map') }}>
        Show on map
      </button>
      <button
        type="button"
        className={known ? 'chip on' : 'chip'}
        aria-pressed={known}
        onClick={() => { if (!known) setCharacter(applyFacts(character, [id], 'answer', 'entity action')) }}
      >
        Mark done
      </button>
      <button
        type="button"
        className="chip"
        onClick={() => {
          setCharacter({ ...character, answers: { ...character.answers, gideonAsk: `Tell me about ${label}` } })
          go('gideon')
        }}
      >
        Ask Gideon
      </button>
      <button type="button" className="chip" onClick={() => { setSelectedMarkerId(id); setModule('codex') }}>
        Open in Library
      </button>
      <WatchButton id={id} name={name} />
    </div>
  )
}
