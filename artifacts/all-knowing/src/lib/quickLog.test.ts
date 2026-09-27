import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { fuzzyLogTargets, nearMeTargets, planQuickLog, recentLogTargets } from './quickLog'

/** A character part-way through Millicent's line, where the Elphael fork closes. */
function millicent(): Character {
  return {
    ...emptyCharacter,
    completedQuestSteps: [
      'quest:millicent:needle',
      'quest:millicent:cured',
      'quest:millicent:altus',
      'quest:millicent:godskin',
      'quest:millicent:prosthesis',
    ],
  }
}

describe('quick log (Task 99)', () => {
  it('applies the log and keeps the pre-log character for undo', () => {
    const before = emptyCharacter
    const plan = planQuickLog(before, ['boss:margit'])
    expect(plan.character.defeatedBosses).toContain('boss:margit')
    expect(before.defeatedBosses).not.toContain('boss:margit')
    expect(plan.undo).toBe(before)
    expect(plan.applied).toContain('boss:margit')
    // Undo restores exactly the pre-log character; the fact is gone again.
    expect(plan.undo.defeatedBosses.includes('boss:margit')).toBe(false)
  })

  it('runs inference and reports what it unlocked', () => {
    const plan = planQuickLog(emptyCharacter, ['boss:margit'])
    expect(plan.inferred.length).toBeGreaterThan(0)
    expect(plan.toast).toContain('Logged')
    expect(plan.next.length).toBeGreaterThanOrEqual(0)
  })

  it('flags a gate/lockout that committing would trip', () => {
    const plan = planQuickLog(millicent(), ['quest:millicent:aid'])
    expect(plan.warnings.length).toBeGreaterThan(0)
    expect(plan.warnings.some((w) => w.steps.length > 0 || w.note)).toBe(true)
  })

  it('suggests near-me bosses/graces not yet done', () => {
    const near = nearMeTargets('Limgrave', emptyCharacter)
    expect(near.length).toBeGreaterThan(0)
    expect(near.every((t) => !emptyCharacter.defeatedBosses.includes(t.id))).toBe(true)
    expect(near.some((t) => t.kind === 'grace' || t.kind === 'boss')).toBe(true)
  })

  it('reads currentArea defensively (missing ⇒ no rows)', () => {
    expect(nearMeTargets(undefined, emptyCharacter)).toEqual([])
    expect(nearMeTargets(null, emptyCharacter)).toEqual([])
  })

  it('fuzzy matches loggable names and skips already-known recents', () => {
    expect(fuzzyLogTargets('marg').some((t) => t.id === 'boss:margit')).toBe(true)
    const known = { ...emptyCharacter, defeatedBosses: ['boss:margit'] }
    expect(recentLogTargets(['boss:margit'], known)).toEqual([])
    expect(recentLogTargets(['boss:margit'], emptyCharacter).some((t) => t.id === 'boss:margit')).toBe(true)
  })
})
