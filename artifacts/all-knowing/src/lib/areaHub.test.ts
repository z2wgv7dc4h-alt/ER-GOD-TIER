import { describe, expect, it } from 'vitest'
import { demoCharacter } from '../data/seed'
import type { RegionLevel } from './regionLevels'
import { areaCompletion, levelVerdict, regionMatches } from './areaHub'

const band = (over: Partial<RegionLevel> = {}): RegionLevel => ({
  area: 'Stormveil Castle',
  levelMin: 30,
  levelMax: 40,
  upgradeMin: 3,
  upgradeMax: 4,
  steps: '',
  ...over,
})

describe('regionMatches', () => {
  it('matches on containment with a 4-character floor', () => {
    expect(regionMatches('Stormveil Castle', 'Stormveil')).toBe(true)
    expect(regionMatches('Liurnia', 'Liurnia of the Lakes')).toBe(true)
    expect(regionMatches('Limgrave', 'Caelid')).toBe(false)
    expect(regionMatches('Li', 'Limgrave')).toBe(false)
    expect(regionMatches(null, 'Limgrave')).toBe(false)
  })
})

describe('level-band verdict', () => {
  it('reads under / right / over around the band', () => {
    expect(levelVerdict(29, band())).toBe('under')
    expect(levelVerdict(30, band())).toBe('right')
    expect(levelVerdict(40, band())).toBe('right')
    expect(levelVerdict(41, band())).toBe('over')
  })

  it('is null without a band', () => {
    expect(levelVerdict(30, null)).toBeNull()
  })
})

describe('completion counts for a region', () => {
  it('counts graces, bosses, items and dungeons for Stormveil', () => {
    const c = areaCompletion(demoCharacter, 'Stormveil')
    expect(c.graces).toEqual({ have: 0, total: 3 })
    expect(c.bosses).toEqual({ have: 2, total: 2 })
    expect(c.items).toEqual({ have: 0, total: 3 })
    expect(c.dungeons).toEqual({ have: 0, total: 1 })
    expect(c.done).toBe(2)
    expect(c.total).toBe(9)
  })

  it('has no counts for an unknown area', () => {
    const c = areaCompletion(demoCharacter, 'Nowhere At All')
    expect(c.total).toBe(0)
    expect(c.done).toBe(0)
  })
})
