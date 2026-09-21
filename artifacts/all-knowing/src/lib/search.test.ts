import { describe, expect, it } from 'vitest'
import { searchSync } from './search'

describe('searchSync', () => {
  it('returns nothing for very short queries', () => {
    expect(searchSync('')).toHaveLength(0)
    expect(searchSync('a')).toHaveLength(0)
  })

  it('matches the seed catalog', () => {
    const hits = searchSync('godrick')
    expect(hits.some((h) => h.source === 'seed' && h.id === 'boss:godrick')).toBe(true)
  })

  it('matches hosted warps', () => {
    const hits = searchSync('elleh')
    expect(hits.some((h) => h.source === 'warp' && h.id === 'grace:elleh')).toBe(true)
  })

  it('matches loot', () => {
    const hits = searchSync('moonveil')
    expect(hits.some((h) => h.source === 'loot' && h.name === 'Moonveil')).toBe(true)
  })

  it('matches merchant stock', () => {
    const hits = searchSync('alteration')
    expect(hits.some((h) => h.source === 'shop')).toBe(true)
  })

  it('matches boss pins', () => {
    const hits = searchSync('tree sentinel')
    expect(hits.some((h) => h.source === 'boss' && h.name === 'Tree Sentinel')).toBe(true)
  })

  it('matches missables', () => {
    const hits = searchSync('missable')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.source === 'missable')).toBe(true)
  })

  it('respects the 16-result cap for broad queries', () => {
    expect(searchSync('the')).toHaveLength(16)
    for (const q of ['lord', 'grace']) {
      expect(searchSync(q).length).toBeLessThanOrEqual(16)
    }
  })
})
