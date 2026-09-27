import { useState } from 'react'

/**
 * Task 100 playtest fix (a): every Journey › Now card shows at most three rows
 * and reveals the rest behind one "See all (N)" control. This is the shared cap
 * and button so the cards cannot drift.
 */
export const CARD_ROW_CAP = 3

export function useRowReveal(total: number, initial = CARD_ROW_CAP) {
  const [expanded, setExpanded] = useState(false)
  return {
    expanded,
    toggle: () => setExpanded((v) => !v),
    visible: expanded ? total : Math.min(initial, total),
  }
}

export function SeeAllButton({
  total,
  expanded,
  onToggle,
}: {
  total: number
  expanded: boolean
  onToggle: () => void
}) {
  if (total <= CARD_ROW_CAP) return null
  return (
    <button type="button" className="chip see-all" aria-expanded={expanded} onClick={onToggle}>
      {expanded ? 'Show less' : `See all (${total})`}
    </button>
  )
}
