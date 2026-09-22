import type { Character } from '../types'

/**
 * Task 81: the co-op toggle.
 *
 * `answers.coop` is `'yes' | 'no'`, and anything other than an explicit `'yes'`
 * is solo (the default). In co-op the app must not recommend solo summon tools —
 * the Mimic Tear or Torrent — and says so in one line instead. Catalog rows are
 * never deleted; only the advice is filtered.
 */
export function isCoop(character: Character): boolean {
  return character.answers.coop === 'yes'
}

/** Spirit-ash / mount advice that is a solo tool, not a co-op recommendation. */
const COOP_AVOID = /mimic|torrent|spectral steed/i

/** True when any of the given strings names a tool co-op advice should skip. */
export function coopAvoids(character: Character, ...texts: (string | undefined | null)[]): boolean {
  if (!isCoop(character)) return false
  return texts.some((t) => Boolean(t && COOP_AVOID.test(t)))
}

export const COOP_LINE = 'In co-op, do not also summon the NPC.'
