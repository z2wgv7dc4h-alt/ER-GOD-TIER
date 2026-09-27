import type { Character } from '../types'

/**
 * Task 100 §1 — the "welcome back" resume trigger (Usage model moment 1).
 *
 * Pure, so the one rule that matters — *when* to show the card — is unit-tested
 * on its own: only after a real gap since the last visit (> 30 min), and only
 * when there is a stored snapshot to compare against. A fresh install (no
 * snapshot) never shows it; a clock that jumps backwards never shows it either.
 */

/** A visit shorter than this is the same session — no card. */
export const RESUME_MIN_GAP_MS = 30 * 60_000

/** What we persist per profile so the next visit can compute "since last time". */
export type ResumeSnapshot = {
  /** Epoch ms of the last recorded visit. */
  lastVisitAt: number
  /** Known-fact count at that visit. */
  factCount: number
}

export type ResumeData = {
  /** Region the player was last in, already formatted ("Liurnia · Raya Lucaria"). */
  area?: string
  /** Display name of the goal the player set, when any. */
  goal?: string
  /** The next beat's label. */
  next?: string
  /** Fact the next beat points at, so the card can link it. */
  nextFactId?: string
  /** Facts gained since the snapshot (never negative). */
  added: number
  /** Current known-fact count. */
  factCount: number
}

/** Known-fact count across the four progress lists. */
export function characterFactCount(character: Character): number {
  return (
    character.defeatedBosses.length +
    character.discoveredGraces.length +
    character.collectedItems.length +
    character.completedQuestSteps.length
  )
}

/** True when a card should be shown: a real, forward gap since the stored visit. */
export function shouldShowResume(
  now: number,
  snapshot: ResumeSnapshot | null | undefined,
  gapMs = RESUME_MIN_GAP_MS,
): boolean {
  if (!snapshot || !snapshot.lastVisitAt) return false
  const elapsed = now - snapshot.lastVisitAt
  return elapsed > gapMs
}

/**
 * The card's content. `context` supplies the display strings (area label, goal
 * name, next beat) the UI already computes; this module only owns the count
 * arithmetic so it stays free of the quest/area graph.
 */
export function buildResume(
  character: Character,
  snapshot: ResumeSnapshot | null | undefined,
  context: { area?: string; goal?: string; next?: string; nextFactId?: string } = {},
): ResumeData {
  const factCount = characterFactCount(character)
  const added = snapshot ? Math.max(0, factCount - snapshot.factCount) : 0
  return { ...context, added, factCount }
}
