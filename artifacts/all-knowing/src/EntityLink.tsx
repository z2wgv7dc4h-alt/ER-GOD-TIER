import type { ReactNode } from 'react'
import { entityName } from './lib/entityGraph'
import { useSpoiler } from './lib/spoilers'
import { useWorkspace } from './state'

/**
 * Task 97 — the one clickable entity name.
 *
 * Every rendered name of a thing routes through this: it opens the universal
 * entity panel as an overlay (`openEntity`) from whatever section the player is
 * in, so there is no dead text and no second detail surface.
 *
 * Task 112 §2 — because every name routes here, this is also the single place a
 * spoiler level applies to names: an unreached boss / NPC fate / ending renders
 * blurred and the first tap reveals it instead of opening the panel.
 */
export function EntityLink({
  id,
  children,
  className = 'entity-link',
  title,
  onClick,
}: {
  id: string
  children?: ReactNode
  className?: string
  title?: string
  /** Extra handler run after the entity panel opens (e.g. clear the omnibox). */
  onClick?: () => void
}) {
  const { openEntity } = useWorkspace()
  const { hidden, reveal } = useSpoiler(id)
  const label = children ?? entityName(id)
  if (hidden) {
    return (
      <button
        type="button"
        className={`${className} spoiler-veil`}
        title="Spoiler — tap to reveal"
        aria-label="Spoiler name — tap to reveal"
        onClick={reveal}
      >
        <span className="spoiler-blur" aria-hidden>{label}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      className={className}
      title={title ?? `Open ${typeof label === 'string' ? label : entityName(id)}`}
      onClick={() => {
        openEntity(id)
        onClick?.()
      }}
    >
      {label}
    </button>
  )
}

