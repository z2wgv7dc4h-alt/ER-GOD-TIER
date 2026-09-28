import type { Character } from '../types'

/**
 * Task 127 §1: the world ribbon's one actionable line, as plain advice.
 *
 * The old ribbon led with a banner count / "N story flags" (which told a player
 * nothing) and mixed world-change narration with the useful "where next" nudge.
 * The narration is gone; the only advice kept is the early-game steer, rendered
 * as one plain row inside the Journey › Now goal card.
 */

function known(c: Character, id: string): boolean {
  if (c.deniedFacts?.includes(id)) return false
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

/**
 * The next area to do for an early character, or null when it adds nothing
 * (already beat Godrick, or no level set). Data-gated on real progress facts.
 */
export function suggestedNextArea(c: Character): string | null {
  if (c.level > 0 && c.level < 30 && !known(c, 'boss:godrick')) {
    return 'Stormveil Castle or the Weeping Peninsula'
  }
  return null
}
