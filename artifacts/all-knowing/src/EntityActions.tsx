import { useEnrichment } from './lib/entityEnrich'
import { edges } from './lib/entityGraph'
import { applyFacts } from './lib/infer'
import { labelOf } from './lib/links'
import { factState, useWorkspace } from './state'
import { WatchButton } from './watch/WatchButton'

/** Relationships that mean "this entity has a source the map can show". */
const SOURCE_RELS = new Set(['soldBy', 'droppedBy', 'foundIn', 'craftedFrom', 'tradedFor', 'sells', 'drops'])

/**
 * Task 92 cross-linking rule: any entity rendered anywhere exposes the same four
 * actions — Show on map · Mark done · Ask Gideon · Open in Library. It reuses the
 * existing workspace contract (`setModule` / `setSelectedMarkerId` /
 * `applyFacts`) rather than introducing a second link system.
 *
 * Task 156: "Show on map" is hidden only when there is truly nothing to show —
 * no acquisition text, no map row and no source edge — and the acquisition text
 * stands in its place.
 */
export function EntityActions({ id, name }: { id: string; name?: string }) {
  const { character, setCharacter, setModule, setSelectedMarkerId, focusOnMap, go } = useWorkspace()
  const label = name || labelOf(id)
  const known = factState(character, id) === 'true'
  const record = useEnrichment(id)
  const hasSource = Boolean(record?.location || record?.map || edges(id).some((e) => SOURCE_RELS.has(e.rel)))

  return (
    <div className="opts entity-actions" role="group" aria-label={`Actions for ${label}`}>
      {hasSource ? (
        <button type="button" className="chip" onClick={() => focusOnMap(id)}>
          Show on map
        </button>
      ) : (
        <span className="note">{record?.location || 'No location in the data yet.'}</span>
      )}
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
