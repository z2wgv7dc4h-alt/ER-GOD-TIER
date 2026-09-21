import { describe, expect, it } from 'vitest'
import { opBuilds, type OpBuild } from './builds'
import { pvpBuilds, pvpMatchups } from './pvp'
import { techTips, type TechCategory } from './tech'
import type { Stats } from '../types'

const statKeys: (keyof Stats)[] = [
  'vigor',
  'mind',
  'endurance',
  'strength',
  'dexterity',
  'intelligence',
  'faith',
  'arcane',
]

function assertBuildShape(rows: OpBuild[], prefix: string) {
  const ids = new Set<string>()
  for (const b of rows) {
    expect(b.id.startsWith(prefix), `${b.id} should start with ${prefix}`).toBe(true)
    expect(ids.has(b.id), `duplicate build id ${b.id}`).toBe(false)
    ids.add(b.id)
    expect(b.name.trim().length).toBeGreaterThan(0)
    expect(b.tag.trim().length).toBeGreaterThan(0)
    expect(b.why.length, `${b.id} needs a real why`).toBeGreaterThan(30)
    expect(b.level).toBeGreaterThanOrEqual(1)
    expect(b.kit.length, `${b.id} needs a kit`).toBeGreaterThan(0)
    for (const k of statKeys) {
      expect(b.stats[k], `${b.id}.${k}`).toBeGreaterThanOrEqual(1)
      expect(b.stats[k], `${b.id}.${k}`).toBeLessThanOrEqual(99)
    }
  }
}

describe('opBuilds (PvE)', () => {
  it('keeps every build well-formed and unique', () => {
    assertBuildShape(opBuilds, 'build:')
  })

  it('grew past the original six and covers a wide stat spread', () => {
    expect(opBuilds.length).toBeGreaterThanOrEqual(12)
    // Pure strength / colossal.
    expect(opBuilds.some((b) => b.stats.strength >= 70)).toBe(true)
    // Intelligence casters.
    expect(opBuilds.filter((b) => b.stats.intelligence >= 50).length).toBeGreaterThanOrEqual(2)
    // Faith beyond the original Blasphemous Blade.
    expect(opBuilds.some((b) => b.id === 'build:blackflame' && b.stats.faith >= 50)).toBe(true)
    // Arcane beyond Rivers of Blood.
    expect(opBuilds.some((b) => b.stats.arcane >= 40 && b.id !== 'build:rivers')).toBe(true)
    // Dexterity beyond bleed.
    expect(opBuilds.some((b) => b.stats.dexterity >= 60)).toBe(true)
  })
})

describe('pvpBuilds', () => {
  it('keeps every PvP build well-formed and unique', () => {
    assertBuildShape(pvpBuilds, 'build:pvp-')
  })

  it('does not collide with the PvE ids and carries matchup fields', () => {
    const pve = new Set(opBuilds.map((b) => b.id))
    for (const b of pvpBuilds) {
      expect(pve.has(b.id)).toBe(false)
      expect(['invade', 'duel', 'both']).toContain(b.mode)
      expect(b.bracket.length).toBeGreaterThan(0)
      expect(b.keywords.length).toBeGreaterThan(0)
      expect(b.beats.length).toBeGreaterThan(0)
      expect(b.losesTo.length).toBeGreaterThan(0)
      expect(b.source.length).toBeGreaterThan(0)
    }
  })

  it('has at least one invade and one duel build', () => {
    expect(pvpBuilds.some((b) => b.mode === 'invade')).toBe(true)
    expect(pvpBuilds.some((b) => b.mode === 'duel')).toBe(true)
  })
})

describe('pvpMatchups', () => {
  it('has unique ids, real counters, and named threats', () => {
    const ids = new Set<string>()
    for (const m of pvpMatchups) {
      expect(ids.has(m.id)).toBe(false)
      ids.add(m.id)
      expect(m.threat.length).toBeGreaterThan(0)
      expect(m.aliases.length).toBeGreaterThan(0)
      expect(m.counters.length).toBeGreaterThan(0)
      for (const c of m.counters) expect(c.length).toBeGreaterThan(10)
    }
    // The archetypes the task explicitly called out.
    for (const id of ['matchup:bleed', 'matchup:colossal', 'matchup:mage', 'matchup:poke', 'matchup:greatshield']) {
      expect(ids.has(id), `missing ${id}`).toBe(true)
    }
  })
})

describe('techTips', () => {
  it('has unique ids, categories, and a real source URL', () => {
    const ids = new Set<string>()
    for (const t of techTips) {
      expect(ids.has(t.id)).toBe(false)
      ids.add(t.id)
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.what.length).toBeGreaterThan(10)
      expect(t.why.length).toBeGreaterThan(10)
      expect(t.how.length).toBeGreaterThan(10)
      expect(t.tags.length).toBeGreaterThan(0)
      // Either a citable URL or an explicit author-encoded attribution.
      expect(t.source.startsWith('http') || t.source.startsWith('Community-standard')).toBe(true)
    }
  })

  it('covers the categories the task asked for', () => {
    const categories = new Set<TechCategory>(techTips.map((t) => t.category))
    const wanted: TechCategory[] = ['jump-attack', 'ash-of-war', 'buff-stacking', 'spirit-ash', 'item', 'pvp-tech']
    for (const c of wanted) {
      expect(categories.has(c), `missing category ${c}`).toBe(true)
    }
  })

  it('flags patch-sensitive entries so they can be revisited', () => {
    expect(techTips.some((t) => t.patch)).toBe(true)
  })
})
