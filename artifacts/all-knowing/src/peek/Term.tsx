import { useRef, type ReactNode } from 'react'
import { mechanicById } from '../knowledge/mechanics'
import { glossaryTerm } from '../lib/glossary'
import { useWorkspaceOptional } from '../state'
import { PeekLayer, usePeek } from './PeekCard'

/**
 * Task 115 §2 — `<Term id>` renders a jargon word with a peek tooltip.
 *
 * It is the label-sized sibling of `EntityLink`: hovering (300ms), focusing or
 * long-pressing shows the mechanic's short definition and key numbers from
 * `mechanics.ts`, while a normal tap opens the mechanic's entity page so no term
 * is dead text (docs/USAGE-MODEL.md rule 1). `glossary.autolink` decides which
 * prose words become terms; the entity Stats tab, planners and gear sheet wrap
 * their fixed labels in `Term` directly.
 */
export function Term({
  id,
  children,
  className = '',
}: {
  id: string
  children?: ReactNode
  className?: string
}) {
  const workspace = useWorkspaceOptional()
  const ref = useRef<HTMLSpanElement>(null)
  const { key, handlers, consumeLongPress } = usePeek(id, ref)
  const label = children ?? glossaryTerm(id)?.label ?? mechanicById(id)?.title ?? id

  return (
    <>
      <span
        ref={ref}
        className={`term${className ? ` ${className}` : ''}`}
        role="button"
        tabIndex={0}
        title="Show definition"
        onClick={(e) => {
          e.stopPropagation()
          if (consumeLongPress()) return
          workspace?.openEntity(id)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            workspace?.openEntity(id)
          }
        }}
        {...handlers}
      >
        {label}
      </span>
      <PeekLayer selfKey={key} />
    </>
  )
}
