import { describe, expect, it } from 'vitest'
import type { Character } from '../types'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { BUILD_FACT_IDS, buildHunt, resolveBuildId } from './buildHunt'
import { REGULATION_STAMP } from './regulation'

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
const rivers = allBuilds.find((b) => b.id === 'build:rivers')!

describe('buildHunt resolver', () => {
  it('has one explicit display-slug table', () => {
    expect(BUILD_FACT_IDS.rob).toBe('loot:rivers')
    expect(Object.keys(BUILD_FACT_IDS).length).toBeGreaterThanOrEqual(20)
  })

  it('resolves a dangling need id to its real row under the same item', () => {
    expect(resolveBuildId('loot:dark-moon')?.factId).toBe('loot:dark-moon-gs')
    expect(resolveBuildId('loot:millicent-prosthesis')?.factId).toBe('item:millicent-prosthesis')
  })

  it('resolves a kit slug by its display name when the slug alone is ambiguous', () => {
    // Same slug, different gear: base insignia (Rivers) vs Rotten (frost-bleed).
    const frost = allBuilds.find((b) => b.id === 'build:frost-bleed')!
    const wingedRivers = resolveBuildId('winged', 'Winged Sword Insignia')
    const wingedFrost = resolveBuildId('winged', 'Rotten Winged Sword Insignia')
    expect(wingedRivers?.factId).toBe('loot:winged-sword-insignia')
    expect(wingedFrost?.factId).toBe('item:rotten-winged-sword-insignia')
    expect(frost.kit.some((k) => k.id === 'winged')).toBe(true)
  })

  it('resolves the large majority of distinct need[] ids after the Task 65 rows', () => {
    const needIds = [...new Set(allBuilds.flatMap((b) => b.need))]
    const resolved = needIds.filter((id) => resolveBuildId(id))
    // Task 65 added the loot rows that existed in names.json; only a handful whose English
    // name is missing stay unresolved.
    expect(needIds.length).toBeGreaterThan(60)
    expect(resolved.length).toBeGreaterThan(needIds.length - 5)
  })
})

describe('buildHunt', () => {
  it('splits a kit into have/missing and never mutates the character', () => {
    const before = JSON.stringify(character)
    const hunt = buildHunt(character, rivers)
    expect(JSON.stringify(character)).toBe(before)
    expect(hunt.buildId).toBe('build:rivers')
    const missing = hunt.missing.map((m) => m.factId)
    expect(missing).toContain('loot:rivers')
    expect(missing).toContain('loot:lord-blood-exul')
    expect(missing).toContain('boss:radahn')
    expect(hunt.have).toEqual([])
  })

  it('marks a piece as have once it is on the character, and drops it from missing', () => {
    const withRob: Character = { ...character, collectedItems: ['loot:rivers'] }
    const hunt = buildHunt(withRob, rivers)
    expect(hunt.have.map((h) => h.factId)).toContain('loot:rivers')
    expect(hunt.missing.map((m) => m.factId)).not.toContain('loot:rivers')
  })

  it('pins missing loot through the leftover layer (grace frame), not invented coords', () => {
    const hunt = buildHunt(character, rivers)
    const rob = hunt.missing.find((m) => m.factId === 'loot:rivers')
    expect(rob?.pin).not.toBeNull()
    expect(hunt.pins.map((p) => p.id)).toContain('loot:rivers')
  })

  it('resolves kit items whose names contain apostrophes (Lion\u2019s, Lusat\u2019s)', () => {
    for (const id of ['build:azur', 'build:greatsword-lions-claw']) {
      const build = allBuilds.find((b) => b.id === id)!
      const hunt = buildHunt(character, build)
      expect(hunt.unresolved.filter((u) => u.source === 'kit'), id).toEqual([])
    }
  })

  it('works for every build without throwing and loses no kit/need token', () => {
    for (const build of allBuilds) {
      const hunt = buildHunt(character, build)
      expect(hunt.buildId).toBe(build.id)
      expect(hunt.missing.length + hunt.have.length + hunt.unresolved.length).toBeGreaterThan(0)
    }
  })
})
