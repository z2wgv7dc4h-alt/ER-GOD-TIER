import type { Stats } from '../types'

/**
 * Per-stat soft-cap breakpoints, ascending. A value at or past a breakpoint adds
 * one tier, so the mark shows *how far* past you are, not a capped/not boolean.
 *
 * Offensive stats (Str/Dex/Int/Fai/Arc) come from the game's own scaling curves
 * in the regulation data this repo already vendors from
 * ThomasJClark/elden-ring-weapon-calculator (`public/sourced/regulation-vanilla-v1.17.json`,
 * the Task 10 AR source). Its standard weapon `calcCorrectGraph`s (ids 0-2)
 * change slope at attribute values ~20, 60 and 80; the alternate graph (id 4)
 * uses ~20, 50 and 80. We encode the common 20/60/80.
 *
 * Vigor/Mind/Endurance are the HP/FP/stamina curves, which are **not** in the
 * vendored weapon regulation data (they live in player params this repo has not
 * extracted), so those use the long-standing community breakpoints: Vigor 40/60,
 * Mind 40/60, Endurance 30/50. Source: community stat testing, the same class of
 * community numeric source `src/knowledge/tech.ts` quotes.
 */
export type StatKey = keyof Stats

export const SOFT_CAPS: Record<StatKey, number[]> = {
  vigor: [40, 60],
  mind: [40, 60],
  endurance: [30, 50],
  strength: [20, 60, 80],
  dexterity: [20, 60, 80],
  intelligence: [20, 60, 80],
  faith: [20, 60, 80],
  arcane: [20, 60, 80],
}

/** How many breakpoints this value has reached (0 = none). */
export function softCapTier(stat: StatKey, value: number): number {
  return SOFT_CAPS[stat].filter((cap) => value >= cap).length
}

/** The highest breakpoint reached, or undefined. */
export function softCapReached(stat: StatKey, value: number): number | undefined {
  return SOFT_CAPS[stat].filter((cap) => value >= cap).pop()
}

/** Compact inline mark: one dot per breakpoint reached ('' when none). */
export function softCapMark(stat: StatKey, value: number): string {
  const tier = softCapTier(stat, value)
  return tier ? '·'.repeat(tier) : ''
}

/** Short human label for the reached breakpoint, e.g. "past 40". */
export function softCapLabel(stat: StatKey, value: number): string {
  const reached = softCapReached(stat, value)
  return reached === undefined ? '' : `past ${reached}`
}
