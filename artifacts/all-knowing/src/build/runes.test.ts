import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import {
  affordableLevels,
  allocationPriority,
  runeCostToNext,
  suggestAllocation,
  totalRunesForLevels,
  levelUpPlan,
} from './runes'

describe('rune costs (Task 110 §3)', () => {
  it('matches the published table for the fixed low levels', () => {
    expect(runeCostToNext(1)).toBe(673)
    expect(runeCostToNext(2)).toBe(689)
    expect(runeCostToNext(11)).toBe(847)
  })

  it('follows the cubic from level 12 onward', () => {
    expect(runeCostToNext(12)).toBe(1038)
    expect(runeCostToNext(13)).toBe(1238)
    expect(runeCostToNext(99)).toBe(60265)
  })

  it('never decreases as the level rises', () => {
    for (let level = 1; level < 200; level++) {
      expect(runeCostToNext(level + 1)).toBeGreaterThan(runeCostToNext(level))
    }
  })

  it('totals and spends a rune balance greedily', () => {
    expect(totalRunesForLevels(1, 0)).toBe(0)
    expect(totalRunesForLevels(1, 2)).toBe(673 + 689)
    expect(affordableLevels(1, 673)).toBe(1)
    expect(affordableLevels(1, 672)).toBe(0)
    expect(affordableLevels(1, 673 + 689)).toBe(2)
  })

  it('always spells out the exact cost it can afford', () => {
    const plan = levelUpPlan(emptyCharacter, 10_000)
    expect(plan.cost).toBe(totalRunesForLevels(emptyCharacter.level, plan.affordable))
    expect(plan.cost).toBeLessThanOrEqual(10_000)
    expect(plan.targetLevel).toBe(emptyCharacter.level + plan.affordable)
  })
})

describe('level-up allocation advice (Task 110 §3)', () => {
  it('puts points into the build priority without wasting any', () => {
    const plan = levelUpPlan(emptyCharacter, 100_000)
    const spent = plan.allocations.reduce((sum, a) => sum + a.points, 0)
    expect(spent).toBe(plan.affordable)
    expect(plan.affordable).toBeGreaterThan(0)
  })

  it('prioritises Vigor to its soft cap for a fragile character', () => {
    const priority = allocationPriority(emptyCharacter)
    expect(priority[0].key).toBe('vigor')
    const first = suggestAllocation(emptyCharacter, 1)[0]
    expect(first.key).toBe('vigor')
  })

  it('feeds the archetype damage stat once survivability is settled', () => {
    const strong = { ...emptyCharacter, stats: { ...emptyCharacter.stats, vigor: 40, strength: 30 } }
    const priority = allocationPriority(strong)
    expect(priority[0].key).toBe('strength')
  })
})
