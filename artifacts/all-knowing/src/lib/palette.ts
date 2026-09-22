import type { SearchHit } from './search'
import type { KeyLike } from './shortcuts'

/**
 * Keyboard-navigation state for the command palette (Task 49). Pure and
 * independent of React so the movement/wrap rules are unit-tested; the UI layer
 * only wires key events to these.
 *
 * Wrap decision: **wrap** (Down past the last result goes to the first, Up past
 * the first goes to the last), which is standard command-palette behaviour and
 * keeps the navigation usable without a dead-end at either edge.
 */

/** Flatten grouped results in the exact order they render, across groups. */
export function flattenHits(sections: { hits: SearchHit[] }[]): SearchHit[] {
  return sections.flatMap((section) => section.hits)
}

/** Move the active index by `delta`, wrapping at both ends. */
export function moveActive(index: number, delta: number, length: number): number {
  if (length <= 0) return 0
  if (index < 0) return delta > 0 ? 0 : length - 1
  return (((index + delta) % length) + length) % length
}

export type PaletteKey = 'prev' | 'next' | 'select' | 'close'

/**
 * The keys the palette owns, and only while the command search is focused with
 * results open — so arrow keys still move the caret in every other text field and
 * the other `.search` inputs (packet paste, build code, …) are untouched.
 */
export function resolvePaletteKey(
  e: KeyLike,
  ctx: { inputFocused: boolean; resultsOpen: boolean },
): PaletteKey | null {
  if (!ctx.inputFocused || !ctx.resultsOpen) return null
  if (e.key === 'ArrowDown') return 'next'
  if (e.key === 'ArrowUp') return 'prev'
  if (e.key === 'Enter') return 'select'
  if (e.key === 'Escape') return 'close'
  return null
}
