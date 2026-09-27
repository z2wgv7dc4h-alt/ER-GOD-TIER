import { describe, expect, it } from 'vitest'
import { STAT_KEYS, LEVEL_OFFSET, statsTotal } from '../lib/level'
import { opBuilds, scaleStats, levelPlansFor, levelPlanFor, LEVEL_PLAN_LEVELS } from './builds'
import { pvpBuilds, pvpMatchups, type PvpBracket } from './pvp'
import { pvpTech } from './pvpTech'
import { buildHunt, resolveBuildId } from '../lib/buildHunt'
import { emptyCharacter } from '../data/seed'

/**
 * Task 116 tests: exact stat sums, the four brackets, full loadouts, no
 * duplicate ids, every item id resolvable, and the PvP tech/matchup corpus.
 */
describe('Task 116 PvP builds', () => {
  it('every spread sums to its level (sum - 79 = level)', () => {
    for (const b of pvpBuilds) {
      expect(statsTotal(b.stats) - LEVEL_OFFSET, `${b.id} (level ${b.level})`).toBe(b.level)
    }
  })

  it('has at least four builds in every bracket', () => {
    const brackets: PvpBracket[] = ['RL30-50', 'RL60-90', 'RL125', 'RL150']
    for (const bracket of brackets) {
      const count = pvpBuilds.filter((b) => b.bracket === bracket).length
      expect(count, `${bracket} has ${count}`).toBeGreaterThanOrEqual(4)
    }
  })

  it('carries a full loadout: weapons, armour, four talismans, spells, consumables and buff order', () => {
    for (const b of pvpBuilds) {
      expect(b.loadout, b.id).toBeTruthy()
      expect(b.loadout.weapons.length, `${b.id} weapons`).toBeGreaterThanOrEqual(1)
      expect(b.loadout.armor.length, `${b.id} armour`).toBeGreaterThanOrEqual(1)
      expect(b.loadout.talismans.length, `${b.id} talismans`).toBe(4)
      expect(b.loadout.consumables.length, `${b.id} consumables`).toBeGreaterThanOrEqual(1)
      expect(b.loadout.spells.length, `${b.id} spells`).toBeGreaterThanOrEqual(1)
      expect(b.playstyle.length, `${b.id} playstyle`).toBeGreaterThan(20)
      expect(b.combos.length, `${b.id} combos`).toBeGreaterThanOrEqual(1)
      expect(b.buffOrder.length, `${b.id} buff order`).toBeGreaterThanOrEqual(1)
      expect(b.beats.length, `${b.id} beats`).toBeGreaterThan(0)
      expect(b.losesTo.length, `${b.id} losesTo`).toBeGreaterThan(0)
      expect(b.source.length, `${b.id} source`).toBeGreaterThan(0)
    }
  })

  it('stamps a patch on every build and marks the nerfed-dependent ones', () => {
    const flags = ['still-strong', 'nerfed-but-works', 'sote', 'pre-1.08-dead']
    for (const b of pvpBuilds) {
      expect(flags, `${b.id} patch`).toContain(b.patch)
    }
    expect(pvpBuilds.some((b) => b.patch === 'sote')).toBe(true)
    expect(pvpBuilds.some((b) => b.patch === 'nerfed-but-works')).toBe(true)
  })

  it('has no duplicate ids across the OP and PvP libraries', () => {
    const ids = new Set<string>()
    for (const b of [...opBuilds, ...pvpBuilds]) {
      expect(ids.has(b.id), `duplicate ${b.id}`).toBe(false)
      ids.add(b.id)
    }
  })

  it('resolves every kit and need item in the entity graph', () => {
    for (const b of pvpBuilds) {
      expect(buildHunt(emptyCharacter, b).unresolved, b.id).toEqual([])
      for (const slot of b.kit) {
        expect(resolveBuildId(slot.id, slot.name), `${b.id} ${slot.id}`).toBeTruthy()
      }
    }
  })
})

describe('Task 116 matchups', () => {
  it('covers at least the 25 most common threats with real counter-tech', () => {
    expect(pvpMatchups.length).toBeGreaterThanOrEqual(25)
    const ids = new Set<string>()
    for (const m of pvpMatchups) {
      expect(ids.has(m.id), `duplicate ${m.id}`).toBe(false)
      ids.add(m.id)
      expect(m.threat.length).toBeGreaterThan(0)
      expect(m.aliases.length).toBeGreaterThan(0)
      expect(m.tell.length).toBeGreaterThan(10)
      expect(m.gearSwap.length).toBeGreaterThan(5)
      expect(m.counters.length).toBeGreaterThan(0)
      for (const c of m.counters) expect(c.length, m.id).toBeGreaterThan(10)
    }
    // The archetypes the task explicitly calls out.
    for (const id of ['matchup:bleed', 'matchup:bleed-katana', 'matchup:comet-azur', 'matchup:freezing-mist', 'matchup:bhs', 'matchup:carian-slicer', 'matchup:pots', 'matchup:moonveil', 'matchup:waterfowl', 'matchup:mimic-gank', 'matchup:blackflame', 'matchup:gank-squad']) {
      expect(ids.has(id), `missing ${id}`).toBe(true)
    }
  })
})

describe('Task 116 PvP tech', () => {
  it('has unique ids, a category and a how-to for every entry', () => {
    expect(pvpTech.length).toBeGreaterThanOrEqual(12)
    const ids = new Set<string>()
    for (const t of pvpTech) {
      expect(ids.has(t.id), `duplicate ${t.id}`).toBe(false)
      ids.add(t.id)
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.what.length).toBeGreaterThan(10)
      expect(t.how.length).toBeGreaterThan(20)
      expect(t.tags.length).toBeGreaterThan(0)
      expect(t.source.startsWith('http') || t.source.startsWith('Community-standard')).toBe(true)
    }
  })

  it('covers the techniques the task asks for', () => {
    const text = pvpTech
      .map((t) => `${t.name} ${t.what} ${t.how} ${t.tags.join(' ')}`)
      .join(' | ')
      .toLowerCase()
    for (const want of ['backstab', 'riposte', 'parry', 'roll-catch', 'delayed', 'chain backstab', 'taunter', 'festering', 'blue cipher', 'gank', 'etiquette', 'dodge', 'two-hand', 'crouch']) {
      expect(text, want).toContain(want)
    }
  })
})

describe('Task 116 OP level plans', () => {
  it('plans the four checkpoint levels with exact sums and min one per stat', () => {
    expect([...LEVEL_PLAN_LEVELS]).toEqual([40, 60, 100, 150])
    for (const build of opBuilds) {
      const plans = levelPlansFor(build)
      expect(plans.map((p) => p.level)).toEqual([40, 60, 100, 150])
      for (const p of plans) {
        expect(statsTotal(p.stats), `${build.id} @ ${p.level}`).toBe(p.level + LEVEL_OFFSET)
        for (const k of STAT_KEYS) expect(p.stats[k], `${build.id} ${k}`).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('scaleStats keeps the total exact and never drops a stat below 1', () => {
    const stats = scaleStats({ vigor: 10, mind: 10, endurance: 10, strength: 10, dexterity: 10, intelligence: 10, faith: 10, arcane: 10 }, 229)
    expect(statsTotal(stats)).toBe(229)
    expect(levelPlanFor(opBuilds[0], 40)).toEqual(scaleStats(opBuilds[0].stats, 40 + LEVEL_OFFSET))
  })
})
