import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { GuideItem } from './guide'
import { achievementProgress, achievementSets } from './achievements'

/** The real guide catalog off disk — same source the Codex loads. */
const catalog = JSON.parse(
  readFileSync(new URL('../../public/sourced/guide/catalog.json', import.meta.url), 'utf8'),
) as GuideItem[]

describe('achievement sets', () => {
  it('matches the guide catalog totals for all three sets', () => {
    const progress = achievementProgress(catalog, [])
    const byId = Object.fromEntries(progress.map((p) => [p.id, p]))
    expect(byId['cookbook'].total).toBe(106)
    expect(byId['bell-bearing'].total).toBe(65)
    expect(byId['whetblade'].total).toBe(5)
    expect(achievementSets.map((s) => s.total)).toEqual([106, 65, 5])
    // Every declared total is the real row count, not a guess.
    for (const p of progress) expect(p.rows).toHaveLength(p.total)
  })

  it('counts collected ids as done and removes them from remaining', () => {
    const collected = ['whetblade-black-whetblade', 'cookbook-armorer-s-cookbook-1']
    const progress = achievementProgress(catalog, collected)
    const whet = progress.find((p) => p.id === 'whetblade')!
    expect(whet.done).toBe(1)
    expect(whet.remaining).toHaveLength(4)
    expect(whet.remaining.some((r) => r.id === 'whetblade-black-whetblade')).toBe(false)
    const cook = progress.find((p) => p.id === 'cookbook')!
    expect(cook.done).toBe(1)
    expect(cook.remaining).toHaveLength(105)
  })

  it('does not count unrelated collected ids', () => {
    const progress = achievementProgress(catalog, ['boss:malenia', 'grace:elleh'])
    for (const p of progress) expect(p.done).toBe(0)
  })

  it('fills in real sources for named bell bearings the guide left blank', () => {
    const progress = achievementProgress(catalog, [])
    const bb = progress.find((p) => p.id === 'bell-bearing')!
    const sellen = bb.rows.find((r) => r.id === 'bell-bearing-sellen-s-bell-bearing')!
    expect(sellen.how).toContain('Sellen')
    expect(sellen.how.toLowerCase()).toContain('witchbane')
    const kale = bb.rows.find((r) => r.id === 'bell-bearing-kale-s-bell-bearing')!
    expect(kale.how).toContain('Church of Elleh')
    // Every bell bearing now has a source after the overlay/fallback.
    expect(bb.rows.every((r) => r.how.length > 0)).toBe(true)
  })

  it('spot-checks a real whetblade location against the guide text', () => {
    const progress = achievementProgress(catalog, [])
    const whet = progress.find((p) => p.id === 'whetblade')!
    const black = whet.rows.find((r) => r.id === 'whetblade-black-whetblade')!
    expect(black.name).toBe('Black Whetblade')
    expect(black.how.toLowerCase()).toContain("night's sacred ground")
  })
})
