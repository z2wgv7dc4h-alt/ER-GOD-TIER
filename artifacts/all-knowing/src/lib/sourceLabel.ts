import type { Character } from '../types'

/**
 * Task 93 item 4: the truth about where a character came from, so the card
 * never says "live save" when no save is bound. Pure, so it is tested directly.
 */
export function sourceLabel(c: Character): string {
  if (c.source === 'save') return c.fileName ? `Save file · ${c.fileName}` : 'Save file'
  if (c.source === 'reckon') return c.shots.length ? `Screenshot · ${c.shots.length}` : 'Manual entry'
  if (c.source === 'demo') return 'Demo character'
  return 'No save loaded — demo / manual'
}
