import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { isWatched, toggleWatch, watchIds, watchPins } from './watchlist'

const base: Character = { ...emptyCharacter }

describe('watchlist (Task 112 §3)', () => {
  it('stars and unstars an entity', () => {
    const on = toggleWatch(base, 'boss:margit')
    expect(isWatched(on, 'boss:margit')).toBe(true)
    expect(watchIds(on)).toHaveLength(1)
    const off = toggleWatch(on, 'boss:margit')
    expect(isWatched(off, 'boss:margit')).toBe(false)
    expect(watchIds(off)).toHaveLength(0)
  })

  it('does not mutate the input character', () => {
    toggleWatch(base, 'boss:margit')
    expect(watchIds(base)).toHaveLength(0)
  })

  it('survives a malformed answers.watch', () => {
    const broken: Character = { ...base, answers: { watch: [1, 'boss:margit', ''] as unknown as string[] } }
    expect(watchIds(broken)).toEqual(['boss:margit'])
  })

  it('maps starred entities with a known position to pins', () => {
    const on = toggleWatch(base, 'boss:margit')
    const pins = watchPins(on, [])
    expect(pins).toHaveLength(1)
    expect(pins[0].region).toBe('Stormveil')
    expect(typeof pins[0].x).toBe('number')
  })

  it('ignores unstarred and unlocated entities', () => {
    const on = toggleWatch(base, 'mech-nowhere:xyz')
    expect(watchPins(on, [])).toEqual([])
  })
})
