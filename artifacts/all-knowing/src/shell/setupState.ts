import type { Character } from '../types'

/**
 * Task 137 §4 — a pure predicate split out of `RecommendedCard` so the eager
 * Journey shell can ask it without importing the AR-backed card.
 */
export function hasUnsetStats(character: Character): boolean {
  if (character.source === 'empty' || character.source === 'demo') return true
  return Object.values(character.stats).every((v) => v === 10)
}
