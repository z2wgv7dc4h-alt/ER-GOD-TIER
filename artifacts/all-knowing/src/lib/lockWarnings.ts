import { planRoute } from '../knowledge/endings'
import { allLines } from '../knowledge/storylines'
import type { Character } from '../types'
import { canonicalFactId } from './aliases'
import { applyFacts } from './infer'

/**
 * Confirm-before-tick lockout warnings (Task 50).
 *
 * Before a step is marked done, we want to show what that would foreclose — but
 * only when it actually matters to *this* character. The real lockout data lives
 * on each `PlanStep.lockouts` and is consumed by `planRoute`; this module does not
 * re-walk the DAG. It simulates the tick with the same `applyFacts` the comple-
 * tion path uses, then re-runs `planRoute` per line and diffs the `foreclosed`
 * sets. Only lines the character has already started (≥1 step done) or is
 * currently chasing (the Gideon goal) are reported, so a theoretical lockout in
 * an untouched line is never surfaced.
 */
export type LockWarningStep = { id: string; do: string }

export type LockWarning = {
  lineId: string
  lineName: string
  /** Steps this action would newly foreclose in that line. */
  steps: LockWarningStep[]
  /** Prose lockout for a seed Quests step that has no DAG edge. */
  note?: string
  /** True when the line already had at least one step done. */
  started: boolean
}

/**
 * Warnings for one or more ids about to be marked done, deduped per line so the
 * same line is named once with all the steps it would lose.
 */
export function lockoutWarningsFor(character: Character, ids: string[]): LockWarning[] {
  const merged = new Map<string, LockWarning>()
  for (const id of ids) {
    for (const warning of lockoutWarnings(character, id)) {
      const prev = merged.get(warning.lineId)
      if (!prev) {
        merged.set(warning.lineId, { ...warning, steps: [...warning.steps] })
        continue
      }
      for (const step of warning.steps) {
        if (!prev.steps.some((s) => s.id === step.id)) prev.steps.push(step)
      }
      prev.note = prev.note ?? warning.note
    }
  }
  return [...merged.values()]
}

export function lockoutWarnings(character: Character, id: string): LockWarning[] {
  const fact = canonicalFactId(id)
  // Same inference + planner the real tick uses; pure, so nothing is committed.
  const after = applyFacts(character, [fact], 'answer', 'lockout preview')
  const goal =
    typeof character.answers.gideonGoal === 'string' ? character.answers.gideonGoal : undefined
  const out = new Map<string, LockWarning>()

  for (const line of allLines) {
    const before = planRoute(character, line)
    const started = before.done.length > 0
    if (!started && line.id !== goal) continue
    const next = planRoute(after, line)
    const beforeFore = new Set(before.foreclosed.map((s) => s.id))
    const newly = next.foreclosed.filter((s) => !beforeFore.has(s.id))
    const becameLocked = Boolean(next.locked) && !before.locked
    if (!newly.length && !becameLocked) continue
    out.set(line.id, {
      lineId: line.id,
      lineName: line.name,
      steps: newly.map((s) => ({ id: s.id, do: s.do })),
      note: becameLocked && !newly.length ? next.locked ?? undefined : undefined,
      started,
    })
  }
  return [...out.values()]
}
