import type { ReactNode } from 'react'
import { useSpoiler } from '../lib/spoilers'

/**
 * Task 112 §2 — the veiled content wrapper.
 *
 * `Spoiler` blurs a name (a tap reveals it); `SpoilerGate` hides a whole block
 * such as a lore tab at spoiler level `none`. Both share `useSpoiler`, so the
 * rule lives in exactly one place.
 */
export function Spoiler({
  factId,
  children,
  label = 'Spoiler',
}: {
  factId: string
  children: ReactNode
  label?: string
}) {
  const { hidden, reveal } = useSpoiler(factId, 'name')
  if (!hidden) return <>{children}</>
  return (
    <button
      type="button"
      className="spoiler-veil"
      onClick={reveal}
      title={`${label} — tap to reveal`}
      aria-label={`Reveal ${label}`}
    >
      <span className="spoiler-blur" aria-hidden>{children}</span>
      <span className="spoiler-tag">tap to reveal</span>
    </button>
  )
}

export function SpoilerGate({
  factId,
  children,
  label = 'Hidden for your progress',
}: {
  factId: string
  children: ReactNode
  label?: string
}) {
  const { hidden, reveal } = useSpoiler(factId, 'lore')
  if (!hidden) return <>{children}</>
  return (
    <div className="spoiler-gate">
      <p className="note">{label}</p>
      <button type="button" className="chip" onClick={reveal}>
        Reveal anyway
      </button>
    </div>
  )
}
