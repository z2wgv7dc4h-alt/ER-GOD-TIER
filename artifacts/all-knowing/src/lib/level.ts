import type { Stats } from '../types'

/**
 * Task 107 §4 — in Elden Ring a character's level is the sum of the eight stats
 * minus 79, for every starting class. Every class starts at `sum = level + 79`
 * (Wretch Lv1 sums to 80, Vagabond Lv9 sums to 88) and each level adds exactly
 * one point, so the invariant holds for any legal spread.
 */
export const LEVEL_OFFSET = 79

export const STAT_KEYS: (keyof Stats)[] = [
  'vigor',
  'mind',
  'endurance',
  'strength',
  'dexterity',
  'intelligence',
  'faith',
  'arcane',
]

export function statsTotal(stats: Stats): number {
  return STAT_KEYS.reduce((sum, key) => sum + (Number(stats[key]) || 0), 0)
}

/** The level implied by the eight stats. Never below 1 (a blank character). */
export function levelFromStats(stats: Stats): number {
  return Math.max(1, statsTotal(stats) - LEVEL_OFFSET)
}
