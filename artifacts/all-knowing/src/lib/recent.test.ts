import { describe, expect, it } from 'vitest'
import { RECENT_CAP, pushRecent, recentAfterProfileSwitch } from './recent'
import { defaultUi } from './vault'

describe('recent history (Task 51)', () => {
  it('records selections in order across Codex/Atlas/Related, newest first', () => {
    let r: string[] = []
    r = pushRecent(r, 'grace:elleh') // Atlas pin
    r = pushRecent(r, 'item:fingerslayer') // Codex entry
    r = pushRecent(r, 'boss:godrick') // Related link
    expect(r).toEqual(['boss:godrick', 'item:fingerslayer', 'grace:elleh'])
  })

  it('moves a re-selected fact to the front without duplicating', () => {
    const r = pushRecent(pushRecent(pushRecent([], 'a'), 'b'), 'a')
    expect(r).toEqual(['a', 'b'])
  })

  it('stays bounded at a sane cap, dropping the oldest', () => {
    expect(RECENT_CAP).toBeGreaterThanOrEqual(10)
    expect(RECENT_CAP).toBeLessThanOrEqual(15)
    let r: string[] = []
    for (let i = 0; i < RECENT_CAP + 5; i++) r = pushRecent(r, `x${i}`)
    expect(r).toHaveLength(RECENT_CAP)
    expect(r[0]).toBe(`x${RECENT_CAP + 4}`)
    expect(r).not.toContain('x0')
  })

  it('ignores an empty selection', () => {
    expect(pushRecent(['a'], '')).toEqual(['a'])
  })

  it('clears on profile switch and is never persisted per profile', () => {
    expect(recentAfterProfileSwitch()).toEqual([])
    // If recents ever became part of the persisted per-profile UI, switching
    // profiles could leak them across Tarnished (Task 30 isolation).
    expect(Object.keys(defaultUi())).not.toContain('recentFacts')
  })
})
