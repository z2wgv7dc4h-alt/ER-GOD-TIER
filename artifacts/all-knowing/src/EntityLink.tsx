import type { ReactNode } from 'react'
import { entityName } from './lib/entityGraph'
import { useWorkspace } from './state'

/**
 * Task 97 — the one clickable entity name.
 *
 * Every rendered name of a thing routes through this: it opens the universal
 * entity panel as an overlay (`openEntity`) from whatever section the player is
 * in, so there is no dead text and no second detail surface.
 */
export function EntityLink({
  id,
  children,
  className = 'entity-link',
  title,
}: {
  id: string
  children?: ReactNode
  className?: string
  title?: string
}) {
  const { openEntity } = useWorkspace()
  const label = children ?? entityName(id)
  return (
    <button
      type="button"
      className={className}
      title={title ?? `Open ${typeof label === 'string' ? label : entityName(id)}`}
      onClick={() => openEntity(id)}
    >
      {label}
    </button>
  )
}
