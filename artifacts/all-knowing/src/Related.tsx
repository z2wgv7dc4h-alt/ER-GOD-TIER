import { relatedFor, type RelatedLink } from './lib/related'
import { factState, useWorkspace } from './state'

/**
 * Task 39 — the one shared "related" section.
 *
 * Every room renders this, not its own link list. Each chip is a real
 * navigation: it changes the room and selects the linked fact, using the same
 * `setModule` / `setSelectedMarkerId` contract Gideon acts use. When the data
 * holds no edge for an entity, it says so plainly instead of hiding.
 */
export function Related({ id, title = 'Related' }: { id: string; title?: string }) {
  const { character, setModule, setSelectedMarkerId } = useWorkspace()
  const result = relatedFor(id)

  if (!result.hasAny) {
    return (
      <div className="related">
        <div className="kicker">{title}</div>
        <p className="note">
          No known connections in the data yet — not every entity is wired into the graph.
        </p>
      </div>
    )
  }

  function open(link: RelatedLink) {
    setModule(link.module)
    setSelectedMarkerId(link.factId)
  }

  return (
    <div className="related">
      <div className="kicker">{title}</div>
      {result.groups.map((group) => (
        <div className="related-group" key={group.key}>
          <div className="related-label">{group.title}</div>
          <div className="opts">
            {group.links.map((link) => {
              const known = factState(character, link.factId) === 'true'
              return (
                <button
                  key={`${group.key}:${link.factId}`}
                  type="button"
                  className={known ? 'chip on' : 'chip'}
                  title={link.note || `Open in ${link.module}`}
                  onClick={() => open(link)}
                >
                  {link.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {result.engineRow && (
        <p className="note related-engine">
          Engine row {result.engineRow.engineId} · {result.engineRow.fmgName} ({result.engineRow.source})
        </p>
      )}
    </div>
  )
}
