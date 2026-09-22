import { describe, expect, it } from 'vitest'
import { SOFT_CAPS, softCapLabel, softCapMark, softCapTier } from './softCaps'

describe('soft-cap tiers (Task 44)', () => {
  it('Vigor: 40 then 60', () => {
    expect(SOFT_CAPS.vigor).toEqual([40, 60])
    expect(softCapTier('vigor', 39)).toBe(0)
    expect(softCapTier('vigor', 40)).toBe(1)
    expect(softCapTier('vigor', 59)).toBe(1)
    expect(softCapTier('vigor', 60)).toBe(2)
    expect(softCapMark('vigor', 60)).toBe('··')
    expect(softCapLabel('vigor', 60)).toBe('past 60')
    expect(softCapLabel('vigor', 40)).toBe('past 40')
  })

  it('Mind: 40 then 60', () => {
    expect(softCapTier('mind', 39)).toBe(0)
    expect(softCapTier('mind', 40)).toBe(1)
    expect(softCapTier('mind', 60)).toBe(2)
  })

  it('Endurance: 30 then 50', () => {
    expect(softCapTier('endurance', 29)).toBe(0)
    expect(softCapTier('endurance', 30)).toBe(1)
    expect(softCapTier('endurance', 49)).toBe(1)
    expect(softCapTier('endurance', 50)).toBe(2)
  })

  it('offensive stats: 20 / 60 / 80', () => {
    for (const stat of ['strength', 'dexterity', 'intelligence', 'faith', 'arcane'] as const) {
      expect(SOFT_CAPS[stat]).toEqual([20, 60, 80])
      expect(softCapTier(stat, 19), stat).toBe(0)
      expect(softCapTier(stat, 20), stat).toBe(1)
      expect(softCapTier(stat, 59), stat).toBe(1)
      expect(softCapTier(stat, 60), stat).toBe(2)
      expect(softCapTier(stat, 79), stat).toBe(2)
      expect(softCapTier(stat, 80), stat).toBe(3)
      expect(softCapMark(stat, 99), stat).toBe('···')
    }
  })

  it('shows no mark below the first cap', () => {
    expect(softCapMark('vigor', 1)).toBe('')
    expect(softCapLabel('arcane', 10)).toBe('')
    expect(softCapTier('arcane', 10)).toBe(0)
  })
})
