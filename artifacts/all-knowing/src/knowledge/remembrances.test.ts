import { describe, expect, it } from 'vitest'
import { findRemembrance, remembrances } from './remembrances'

describe('remembrance table', () => {
  it('has unique ids and at least two rewards each', () => {
    const ids = new Set<string>()
    for (const r of remembrances) {
      expect(ids.has(r.id)).toBe(false)
      ids.add(r.id)
      expect(r.rewards.length).toBeGreaterThanOrEqual(2)
      expect(r.bossName.length).toBeGreaterThan(0)
    }
  })

  it('covers the base game and Shadow of the Erdtree', () => {
    expect(remembrances.some((r) => r.campaign === 'base')).toBe(true)
    expect(remembrances.some((r) => r.campaign === 'sote')).toBe(true)
    expect(remembrances.length).toBeGreaterThanOrEqual(20)
  })

  it('resolves the Radahn remembrance and its real rewards', () => {
    const r = findRemembrance('what does the radahn remembrance give')
    expect(r?.id).toBe('item:remembrance-starscourge')
    expect(r?.rewards.map((x) => x.name)).toEqual(['Starscourge Greatsword', 'Lion Greatbow'])
    expect(r?.bossFactId).toBe('boss:radahn')
  })

  it('resolves a Shadow of the Erdtree remembrance by boss name', () => {
    const r = findRemembrance('what does the messmer remembrance give')
    expect(r?.bossFactId).toBe('boss:messmer')
    expect(r?.rewards.map((x) => x.name)).toContain('Spear of the Impaler')
  })

  it('does not match an unrelated question', () => {
    expect(findRemembrance('where is the next grace')).toBeUndefined()
  })
})
