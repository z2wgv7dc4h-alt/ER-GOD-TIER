import { describe, expect, it } from 'vitest'
import { bracketForLevel, matchupsForBuild, modeMatches, pvpBuilds, type PvpBuild } from './pvp'

/**
 * Task 164 §4/§7 — the pure helpers behind the PvP mode/level filters and the
 * per-build matchup ranking.
 */
describe('bracketForLevel', () => {
  it('maps a character level to its bracket band, clamping both ends', () => {
    expect(bracketForLevel(1)).toBe('RL30-50')
    expect(bracketForLevel(30)).toBe('RL30-50')
    expect(bracketForLevel(50)).toBe('RL30-50')
    expect(bracketForLevel(51)).toBe('RL60-90')
    expect(bracketForLevel(90)).toBe('RL60-90')
    expect(bracketForLevel(91)).toBe('RL125')
    expect(bracketForLevel(125)).toBe('RL125')
    expect(bracketForLevel(126)).toBe('RL150')
    expect(bracketForLevel(713)).toBe('RL150')
  })
})

describe('modeMatches', () => {
  it('lets invade/duel include dual-purpose builds, but "both" is the strict subset', () => {
    expect(modeMatches('invade', 'all')).toBe(true)
    expect(modeMatches('duel', 'all')).toBe(true)
    expect(modeMatches('both', 'all')).toBe(true)
    expect(modeMatches('invade', 'invade')).toBe(true)
    expect(modeMatches('both', 'invade')).toBe(true)
    expect(modeMatches('duel', 'invade')).toBe(false)
    expect(modeMatches('both', 'both')).toBe(true)
    expect(modeMatches('invade', 'both')).toBe(false)
    expect(modeMatches('duel', 'both')).toBe(false)
  })
})

describe('matchupsForBuild', () => {
  it('ranks the matchup corpus for a build by keyword overlap', () => {
    const bleed = pvpBuilds.find((b) => b.id === 'build:pvp-bleed-katana')!
    const ranked = matchupsForBuild(bleed)
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0].matchup.threat).toMatch(/bleed/i)
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score)
    }
    for (const { matchup } of ranked) {
      const shares = matchup.aliases.some((alias) => {
        const a = alias.toLowerCase()
        return bleed.keywords.some((k) => a.includes(k) || k.includes(a))
      })
      expect(shares, matchup.id).toBe(true)
    }
  })

  it('drops matchups that share no keyword', () => {
    const weird: PvpBuild = { ...pvpBuilds[0], keywords: ['zzz-no-such-keyword'] }
    expect(matchupsForBuild(weird)).toEqual([])
  })
})
