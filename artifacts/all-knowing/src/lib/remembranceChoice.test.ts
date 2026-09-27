import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { remembrances } from '../knowledge/remembrances'
import type { Character } from '../types'
import { rankRemembrance } from './remembranceChoice'

const strength: Character = {
  ...emptyCharacter,
  stats: { ...emptyCharacter.stats, strength: 40, dexterity: 12 },
}

const dexterity: Character = {
  ...emptyCharacter,
  stats: { ...emptyCharacter.stats, dexterity: 40, strength: 12 },
}

describe('remembrance ranking (Task 100 §4)', () => {
  const grafted = remembrances.find((r) => r.id === 'item:remembrance-grafted')!

  it('puts the on-build reward first and never invents a stat line', () => {
    const options = rankRemembrance(strength, grafted, 'strength')
    expect(options[0].name).toBe('Axe of Godrick')
    expect(options[0].why).toContain('Strength')
    expect(options.every((o) => !/\d+\s*(AR|damage)/i.test(o.why))).toBe(true)
  })

  it('marks a reward traded when the character knows it', () => {
    const before = rankRemembrance(strength, grafted, 'strength')
    const target = before[0]
    const traded: Character = { ...strength, collectedItems: [target.factId!] }
    const after = rankRemembrance(traded, grafted, 'strength')
    expect(after.find((o) => o.name === target.name)?.traded).toBe(true)
    expect(after.filter((o) => o.traded)).toHaveLength(1)
  })

  it('ranks differently for a different build', () => {
    const starscourge = remembrances.find((r) => r.id === 'item:remembrance-starscourge')!
    expect(rankRemembrance(dexterity, starscourge, 'dexterity')[0].name).toBe('Lion Greatbow')
    expect(rankRemembrance(strength, starscourge, 'strength')[0].name).toBe('Starscourge Greatsword')
  })
})
