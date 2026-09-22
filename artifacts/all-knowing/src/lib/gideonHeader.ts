import { planRoute } from '../knowledge/endings'
import { approachingGates } from '../knowledge/gates'
import { allLines } from '../knowledge/storylines'
import type { Character } from '../types'
import { idleSuggestions } from './suggestions'

/**
 * Task 72: one compact, always-visible Gideon context line.
 *
 * Pure presentation — it reuses `planRoute`, `idleSuggestions` and
 * `approachingGates` (the same data Gideon's router reads) and never calls the
 * LLM or `askGideonRouter`. The UI pins the result above the log so the goal,
 * the current beat and any gate stay in view while the chat scrolls.
 */
export type GideonHeader = {
  /** Display name of the goal set in `answers.gideonGoal` (line / ending / blitz). */
  goal?: string
  /** Current reachable beat: `planRoute`'s current `do`, else the first idle suggestion. */
  beat?: string
  /** Name of the world-state gate one beat away, when any. */
  gate?: string
  /** Fact the beat/suggestion points at, for Show it / pinning. */
  factId?: string
  /** The existing router "Show it" affordance, reused verbatim. */
  offer?: { label: string; prompt: string }
}

/**
 * Mirrors the router's standing offer (`GideonAct.offer` on a line plan). Kept
 * byte-identical so clicking it takes the same `run()` path as the chat offer.
 */
export const SHOW_IT_OFFER: { label: string; prompt: string } = {
  label: 'Show it',
  prompt: 'yes show me on the map and give instructions',
}

function goalName(id: string): string {
  return allLines.find((l) => l.id === id)?.name ?? id
}

export function gideonHeader(character: Character): GideonHeader {
  const goalId =
    typeof character.answers.gideonGoal === 'string' && character.answers.gideonGoal
      ? character.answers.gideonGoal
      : undefined

  const header: GideonHeader = {}

  if (goalId) {
    header.goal = goalName(goalId)
    const line = allLines.find((l) => l.id === goalId)
    const plan = line ? planRoute(character, line) : null
    if (plan?.current) {
      header.beat = plan.current.do
      header.factId = plan.current.factId
      header.offer = { ...SHOW_IT_OFFER }
    }
  }

  // No goal, or the goal has no reachable beat left: fall back to the best real
  // next action for this character (same source the idle chips use).
  if (!header.beat) {
    const first = idleSuggestions(character, 1)[0]
    if (first) {
      header.beat = first.label
      header.factId = first.factId
    }
  }

  const gate = approachingGates(character)[0]
  if (gate) header.gate = gate.name

  return header
}
