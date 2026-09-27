import { describe, expect, it } from 'vitest'
import { emptyStats } from '../data/seed'
import { levelFromStats, statsTotal } from './level'
import type { Stats } from '../types'

function stats(over: Partial<Stats>): Stats {
  return { ...emptyStats, ...over }
}

describe('levelFromStats (Task 107 §4)', () => {
  it('a blank Wretch spread sums to 80 and is Lv 1', () => {
    expect(statsTotal(emptyStats)).toBe(80)
    expect(levelFromStats(emptyStats)).toBe(1)
  })

  it('the eight stat sum minus 79 is the level for any class spread', () => {
    // Vagabond start: Lv 9, sum 88.
    const vagabond = stats({
      vigor: 15,
      mind: 10,
      endurance: 11,
      strength: 14,
      dexterity: 13,
      intelligence: 9,
      faith: 9,
      arcane: 7,
    })
    expect(statsTotal(vagabond)).toBe(88)
    expect(levelFromStats(vagabond)).toBe(9)
  })

  it('a spread summing to 94 is Lv 15, not Lv 1', () => {
    const spread = stats({ vigor: 24 })
    expect(statsTotal(spread)).toBe(94)
    expect(levelFromStats(spread)).toBe(15)
  })

  it('never drops below 1', () => {
    expect(levelFromStats({ ...emptyStats, vigor: 1 })).toBe(1)
  })
})
