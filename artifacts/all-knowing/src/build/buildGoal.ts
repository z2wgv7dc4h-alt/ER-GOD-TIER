import type { Character } from '../types'

/**
 * Task 197 §2 — "Follow this build" sets the build as the character's goal
 * without touching stats or gear (all builds share the existing `answers.buildKit`
 * slot, which the build hunt already reads). Pure, so callers stay in control.
 */
export function followBuild(character: Character, buildId: string): Character {
  return { ...character, answers: { ...character.answers, buildKit: buildId } }
}

/** The id of the build the character is following, or '' when none. */
export function goalBuildId(character: Character): string {
  return typeof character.answers.buildKit === 'string' ? character.answers.buildKit : ''
}

export function isFollowing(character: Character, buildId: string): boolean {
  return goalBuildId(character) === buildId
}
