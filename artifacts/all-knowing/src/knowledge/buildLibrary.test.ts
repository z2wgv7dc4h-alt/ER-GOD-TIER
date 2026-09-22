import { describe, expect, it } from 'vitest'
import type { Character } from '../types'
import { opBuilds } from './builds'
import { pvpBuilds, pvpMatchups } from './pvp'
import { buildHunt, resolveBuildId } from '../lib/buildHunt'
import { REGULATION_STAMP } from '../lib/regulation'

const character: Character = {
  source: 'reckon',
  platform: 'ps5',
  regulation: REGULATION_STAMP,
  name: 'Tarnished',
  level: 40,
  startingClass: 'vagabond',
  stats: { vigor: 20, mind: 10, endurance: 15, strength: 20, dexterity: 12, intelligence: 9, faith: 9, arcane: 7 },
  loadout: [],
  defeatedBosses: [],
  discoveredGraces: [],
  collectedItems: [],
  completedQuestSteps: [],
  deniedFacts: [],
  answers: {},
  evidence: [],
  shots: [],
}

const allBuilds = [...opBuilds, ...pvpBuilds]
const statSum = (b: { stats: Record<string, number> }) => Object.values(b.stats).reduce((a, n) => a + n, 0)

const NEW_BUILD_IDS = ['build:pest-threads-plus', 'build:giant-crusher-jump', 'build:sword-night-flame']

describe('Task 65 build library', () => {
  it('hit the required library sizes', () => {
    expect(opBuilds.length).toBeGreaterThanOrEqual(28)
    expect(pvpBuilds.length).toBeGreaterThanOrEqual(16)
    expect(pvpMatchups.length).toBeGreaterThanOrEqual(12)
  })

  it('every new build produces a hunt list with no id dropped', () => {
    for (const id of NEW_BUILD_IDS) {
      const build = allBuilds.find((b) => b.id === id)
      expect(build, id).toBeTruthy()
      const hunt = buildHunt(character, build!)
      expect(hunt.buildId).toBe(id)
      expect(hunt.have.length + hunt.missing.length + hunt.unresolved.length).toBeGreaterThan(0)
    }
  })

  it('every need[] id in the whole library is resolvable or listed unresolved', () => {
    for (const build of allBuilds) {
      const hunt = buildHunt(character, build)
      for (const need of build.need) {
        const resolved = resolveBuildId(need)
        if (resolved) {
          expect(
            hunt.have.some((p) => p.factId === resolved.factId) || hunt.missing.some((p) => p.factId === resolved.factId),
            `${build.id} ${need}`,
          ).toBe(true)
        } else {
          expect(hunt.unresolved.map((u) => u.id), `${build.id} ${need}`).toContain(need)
        }
      }
    }
  })

  it('resolves every kit and need id in the library (nothing dropped)', () => {
    for (const build of allBuilds) {
      const hunt = buildHunt(character, build)
      expect(hunt.unresolved, build.id).toEqual([])
    }
  })

  it('new builds carry an original one-sentence why, a source, and a patch flag', () => {
    const flags = ['still-strong', 'nerfed-but-works', 'sote', 'pre-1.08-dead']
    for (const id of NEW_BUILD_IDS) {
      const build = allBuilds.find((b) => b.id === id)!
      expect(build.why.length).toBeGreaterThan(20)
      expect(build.why).not.toMatch(/https?:/)
      expect(build.source, id).toBeTruthy()
      expect(flags).toContain(build.patch)
    }
  })

  it('every build has legal-looking stats for its level bracket', () => {
    // RL30 must not carry an RL125 spread; a low-level kit stays far below a level-125 kit.
    const rl30 = pvpBuilds.find((b) => b.level === 30)!
    const rl125 = pvpBuilds.find((b) => b.level === 125)!
    expect(rl30.level).toBe(30)
    expect(statSum(rl30)).toBeLessThan(statSum(rl125))
    // No build may claim more stat points than a level-150 spread could hold.
    for (const build of allBuilds) {
      expect(statSum(build), build.id).toBeLessThanOrEqual(260)
    }
  })
})
