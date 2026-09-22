import { describe, expect, it } from 'vitest'
import { flattenHits, moveActive, resolvePaletteKey } from './palette'
import type { SearchHit } from './search'

const hit = (id: string, group: string): SearchHit => ({
  id,
  name: id,
  detail: '',
  source: 'seed',
  module: 'map',
  group,
})

const sections = [
  { group: 'Bosses', hits: [hit('a', 'Bosses'), hit('b', 'Bosses')] },
  { group: 'Graces', hits: [hit('c', 'Graces'), hit('d', 'Graces')] },
]

describe('flattenHits', () => {
  it('flattens in render order across group boundaries', () => {
    expect(flattenHits(sections).map((h) => h.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('is empty for no sections', () => {
    expect(flattenHits([])).toEqual([])
  })
})

describe('moveActive — wrap', () => {
  it('moves within and across group boundaries', () => {
    expect(moveActive(0, 1, 4)).toBe(1)
    expect(moveActive(1, 1, 4)).toBe(2) // b (last Boss) -> c (first Grace)
    expect(moveActive(2, -1, 4)).toBe(1)
  })

  it('wraps at both ends', () => {
    expect(moveActive(3, 1, 4)).toBe(0)
    expect(moveActive(0, -1, 4)).toBe(3)
  })

  it('handles one result and an empty list', () => {
    expect(moveActive(0, 1, 1)).toBe(0)
    expect(moveActive(0, -1, 1)).toBe(0)
    expect(moveActive(0, 1, 0)).toBe(0)
  })

  it('recovers from a stale/out-of-range index', () => {
    expect(moveActive(-1, 1, 4)).toBe(0)
    expect(moveActive(-1, -1, 4)).toBe(3)
  })
})

describe('resolvePaletteKey', () => {
  const open = { inputFocused: true, resultsOpen: true }

  it('maps the navigation keys while focused with results open', () => {
    expect(resolvePaletteKey({ key: 'ArrowDown' }, open)).toBe('next')
    expect(resolvePaletteKey({ key: 'ArrowUp' }, open)).toBe('prev')
    expect(resolvePaletteKey({ key: 'Enter' }, open)).toBe('select')
    expect(resolvePaletteKey({ key: 'Escape' }, open)).toBe('close')
  })

  it('ignores keys when not focused or when there are no results', () => {
    expect(resolvePaletteKey({ key: 'ArrowDown' }, { inputFocused: false, resultsOpen: true })).toBeNull()
    expect(resolvePaletteKey({ key: 'ArrowDown' }, { inputFocused: true, resultsOpen: false })).toBeNull()
    expect(resolvePaletteKey({ key: 'q' }, open)).toBeNull()
  })
})
