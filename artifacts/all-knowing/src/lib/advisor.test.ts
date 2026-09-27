import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData, type Weapon } from './ar'
import {
  advise,
  buildTodo,
  buildWarnings,
  detectBuild,
  pickGear,
  planRespec,
  rankUpgrades,
} from './advisor'
import { emptyCharacter } from '../data/seed'
import type { Character, Stats } from '../types'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

function char(over: Partial<Character> = {}): Character {
  return { ...emptyCharacter, ...over, stats: (over.stats ?? emptyCharacter.stats) as Stats }
}

const stats = (over: Partial<Stats>): Stats => ({ ...emptyCharacter.stats, ...over })

describe('advisor build detection', () => {
  it('reads a pure Strength sheet', () => {
    const b = detectBuild(char({ stats: stats({ strength: 60 }) }))
    expect(b.archetype).toBe('strength')
    expect(b.label).toBe('Strength')
    expect(b.confidence).toBeGreaterThan(0.5)
    expect(b.reason).toMatch(/Str 60/)
  })

  it('reads Intelligence, Faith and Arcane from the top stat', () => {
    expect(detectBuild(char({ stats: stats({ intelligence: 60 }) })).archetype).toBe('intelligence')
    expect(detectBuild(char({ stats: stats({ faith: 60 }) })).archetype).toBe('faith')
    expect(detectBuild(char({ stats: stats({ arcane: 60 }) })).archetype).toBe('arcane')
  })

  it('reads a level Str/Dex spread as quality', () => {
    const b = detectBuild(char({ stats: stats({ strength: 40, dexterity: 40 }) }))
    expect(b.archetype).toBe('quality')
    expect(b.reason).toMatch(/quality/i)
  })

  it('reads an even Int/Faith spread as a hybrid', () => {
    const b = detectBuild(char({ stats: stats({ intelligence: 40, faith: 40 }) }))
    expect(b.archetype).toBe('hybrid')
  })

  it('reads Bleed when an arcane build has a bleed weapon equipped', () => {
    const b = detectBuild(
      char({
        stats: stats({ dexterity: 40, arcane: 45 }),
        loadout: [{ id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 }],
      }),
      weapons,
    )
    expect(b.archetype).toBe('bleed')
    expect(b.reason).toMatch(/bleed/i)
  })
})

describe('advisor AR-ranked upgrades', () => {
  const dexChar = () =>
    char({
      stats: stats({ vigor: 40, endurance: 25, strength: 14, dexterity: 50, arcane: 10 }),
      discoveredGraces: ['grace:gatefront'],
    })

  it('ranks upgrades by build fit and specialises to the archetype', () => {
    const c = dexChar()
    const list = rankUpgrades(c, detectBuild(c, weapons), { weapons, reachableUpgrade: 10, limit: 200 })
    expect(list.length).toBeGreaterThan(0)
    for (let i = 0; i + 1 < list.length; i++) {
      expect(list[i].score).toBeGreaterThanOrEqual(list[i + 1].score)
    }
  })

  it('marks an already-collected weapon as owned', () => {
    const c = char({
      stats: stats({ dexterity: 40, arcane: 45 }),
      collectedItems: ['loot:rivers'],
      loadout: [{ id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 }],
    })
    const list = rankUpgrades(c, detectBuild(c, weapons), { weapons, reachableUpgrade: 10, limit: 200 })
    const rob = list.find((u) => u.weaponName === 'Rivers of Blood')
    expect(rob).toBeTruthy()
    expect(rob!.owned).toBe(true)
    // arNow reflects the equipped +10, not the reachable comparison level.
    expect(rob!.arNow).toBeGreaterThan(0)
  })

  it('flags a weapon in a reached region and not yet owned as obtainable now', () => {
    const list = rankUpgrades(dexChar(), detectBuild(dexChar(), weapons), {
      weapons,
      reachableUpgrade: 0,
      limit: 200,
    })
    const uchi = list.find((u) => u.weaponName === 'Uchigatana')
    expect(uchi).toBeTruthy()
    expect(uchi!.owned).toBe(false)
    expect(uchi!.obtainableNow).toBe(true)
    expect(uchi!.region).toBe('Limgrave')
  })

  it('marks a weapon behind a fired gate as lost and not obtainable', () => {
    const c = char({
      stats: stats({ dexterity: 50 }),
      completedQuestSteps: ['quest:erdtree-burned'],
    })
    const list = rankUpgrades(c, detectBuild(c, weapons), { weapons, reachableUpgrade: 0, limit: 200 })
    const bolt = list.find((u) => u.weaponName === 'Bolt of Gransax')
    expect(bolt).toBeTruthy()
    expect(bolt!.lost).toBe(true)
    expect(bolt!.obtainableNow).toBe(false)
  })

  it('reports the shortfall for an unmet requirement', () => {
    const c = char({ stats: stats({ strength: 5, dexterity: 5, arcane: 5 }) })
    const list = rankUpgrades(c, detectBuild(c, weapons), { weapons, reachableUpgrade: 0, limit: 400 })
    const rob = list.find((u) => u.weaponName === 'Rivers of Blood')
    if (rob) {
      expect(rob.meets).toBe(false)
      expect(rob.requirement).toMatch(/needs \+/)
    }
  })
})

describe('advisor gear picks', () => {
  it('tags Intelligence gear', () => {
    const c = char({ stats: stats({ intelligence: 60 }) })
    const gear = pickGear(c, detectBuild(c, weapons))
    const names = gear.map((g) => g.name)
    expect(names).toContain('Graven-Mass Talisman')
    expect(names).toContain('Godfrey Icon')
  })

  it('tags bleed gear', () => {
    const c = char({
      stats: stats({ dexterity: 40, arcane: 45 }),
      loadout: [{ id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 }],
    })
    const gear = pickGear(c, detectBuild(c, weapons))
    expect(gear.map((g) => g.name)).toContain("Lord of Blood's Exultation")
    expect(gear.map((g) => g.name)).toContain('Rotten Winged Sword Insignia')
  })
})

describe('advisor planRespec', () => {
  it('maps current stats onto a target build and reuses buildHunt', () => {
    const plan = planRespec(emptyCharacter, 'build:rivers')
    expect(plan).toBeTruthy()
    expect(plan!.targetName).toBe('Rivers of Blood')
    expect(plan!.stats.length).toBeGreaterThan(0)
    expect(plan!.larvalTears).toBe(1)
    expect(plan!.rennalaAvailable).toBe(false)
    expect(plan!.rennalaNote).toMatch(/Beat Rennala/)
    expect(plan!.missing.map((m) => m.factId)).toContain('loot:rivers')
  })

  it('notes Rennala is available once she is defeated', () => {
    const plan = planRespec(char({ defeatedBosses: ['boss:rennala'] }), 'build:rivers')
    expect(plan!.rennalaAvailable).toBe(true)
    expect(plan!.rennalaNote).toMatch(/Larval Tear/)
  })

  it('returns null for an unknown target', () => {
    expect(planRespec(emptyCharacter, 'not-a-build')).toBeNull()
  })
})

describe('advisor to-do ranking', () => {
  it('ranks missables before quests before level-band fit', () => {
    const c = char({
      level: 80,
      discoveredGraces: ['grace:forge-giants', 'grace:gatefront'],
    })
    const todo = buildTodo(c, {
      areas: [{ area: 'Limgrave', levelMin: 1, levelMax: 20, upgradeMin: 0, upgradeMax: 3, steps: '' }],
    })
    const missable = todo.findIndex((t) => t.kind === 'missable')
    const quest = todo.findIndex((t) => t.kind === 'quest')
    const level = todo.findIndex((t) => t.kind === 'level')
    expect(missable).toBeGreaterThanOrEqual(0)
    expect(quest).toBeGreaterThan(missable)
    expect(level).toBeGreaterThan(quest)
  })
})

describe('advisor warnings', () => {
  it('warns when a stat is below an equipped weapon requirement', () => {
    const c = char({
      stats: stats({ strength: 5, dexterity: 5, arcane: 5 }),
      loadout: [{ id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 1 }],
    })
    const warnings = buildWarnings(c, { weapons })
    expect(warnings.some((w) => w.kind === 'requirement')).toBe(true)
  })

  it('warns about points past a soft cap', () => {
    const c = char({ stats: stats({ strength: 90 }) })
    const warnings = buildWarnings(c)
    const sc = warnings.find((w) => w.kind === 'soft-cap')
    expect(sc?.stat).toBe('strength')
    expect(sc?.text).toMatch(/soft cap/)
  })

  it('warns about equip load above 70% when supplied', () => {
    const warnings = buildWarnings(emptyCharacter, { equipLoad: { current: 40, max: 50 } })
    expect(warnings.some((w) => w.kind === 'equip-load')).toBe(true)
    const light = buildWarnings(emptyCharacter, { equipLoad: { current: 20, max: 50 } })
    expect(light.some((w) => w.kind === 'equip-load')).toBe(false)
  })
})

describe('advisor advise', () => {
  it('returns the six consolidated sections', () => {
    const result = advise(char({ stats: stats({ intelligence: 60 }) }), { weapons })
    expect(Object.keys(result).sort()).toEqual(['build', 'gear', 'later', 'todo', 'upgrades', 'warnings'])
    expect(result.build.archetype).toBe('intelligence')
    expect(result.gear.length).toBeGreaterThan(0)
  })
})

/* ---------------------------------------------------------------------------
 * Task 114 §6 — golden-path sanity. The same Lv 30 start as the phone audit:
 * a Limgrave Dex character must never be told to chase DLC or far-region gear.
 * ------------------------------------------------------------------------- */

const DEX_STATS: Stats = {
  vigor: 15,
  mind: 10,
  endurance: 12,
  strength: 12,
  dexterity: 18,
  intelligence: 9,
  faith: 8,
  arcane: 10,
}

const STARTED = ['grace:gatefront', 'grace:stormhill-shack']

/** DLC is open only with Mohg + Radahn down; these fixtures have neither. */
function baseGameOnly(list: { dlc: boolean }[]): boolean {
  return list.every((u) => !u.dlc)
}

const EARLY = /limgrave|weeping peninsula|stormhill|stormveil|liurnia|raya lucaria|roundtable/i

function letterRank(letter: string): number {
  return { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, '–': 0, '-': 0 }[letter] ?? 0
}

/** The scaling letter the entry shows for the given attribute. */
function scalingLetterFor(scaling: string, attr: string): string {
  const m = scaling.match(new RegExp(`${attr} ([SABCDE])`, 'i'))
  return m ? m[1].toUpperCase() : '-'
}

describe('advisor golden path (Task 114)', () => {
  it('a Limgrave Dex start gets reachable, non-DLC, Dex-suited top 5', () => {
    const c = char({
      level: 30,
      stats: DEX_STATS,
      startingClass: 'warrior',
      discoveredGraces: STARTED,
      defeatedBosses: ['boss:margit'],
      answers: { lastRegion: 'Limgrave' },
    })
    const adv = advise(c, { weapons, reachableUpgrade: 6, limit: 5 })
    expect(adv.build.archetype).toBe('dexterity')
    expect(adv.upgrades).toHaveLength(5)
    expect(baseGameOnly(adv.upgrades)).toBe(true)
    for (const u of adv.upgrades) {
      expect(letterRank(scalingLetterFor(u.scaling, 'Dex')), u.name).toBeGreaterThanOrEqual(letterRank('C'))
      expect(u.region ?? '', u.name).toMatch(EARLY)
      expect(u.reachable).toBe(true)
      expect(u.later).toBe(false)
    }
  })

  it('a Limgrave Strength start gets reachable, non-DLC, Str-suited top 5', () => {
    const c = char({
      level: 35,
      stats: { ...DEX_STATS, strength: 30, dexterity: 12 },
      startingClass: 'hero',
      discoveredGraces: STARTED,
      defeatedBosses: ['boss:margit'],
      answers: { lastRegion: 'Limgrave' },
    })
    const adv = advise(c, { weapons, reachableUpgrade: 6, limit: 5 })
    expect(adv.build.archetype).toBe('strength')
    expect(adv.upgrades).toHaveLength(5)
    expect(baseGameOnly(adv.upgrades)).toBe(true)
    for (const u of adv.upgrades) {
      expect(letterRank(scalingLetterFor(u.scaling, 'Str')), u.name).toBeGreaterThanOrEqual(letterRank('C'))
      expect(u.reachable).toBe(true)
      expect(u.later).toBe(false)
      expect(u.region ?? '', u.name).toMatch(EARLY)
    }
  })

  it('a Liurnia Intelligence start gets reachable, non-DLC, Int-suited top 5', () => {
    const c = char({
      level: 40,
      stats: { ...DEX_STATS, intelligence: 40, dexterity: 14 },
      startingClass: 'astrologer',
      discoveredGraces: STARTED,
      defeatedBosses: ['boss:rennala', 'boss:radahn'],
      answers: { lastRegion: 'Ainsel' },
    })
    const adv = advise(c, { weapons, reachableUpgrade: 6, limit: 5 })
    expect(adv.build.archetype).toBe('intelligence')
    expect(adv.upgrades).toHaveLength(5)
    expect(baseGameOnly(adv.upgrades)).toBe(true)
    for (const u of adv.upgrades) {
      expect(letterRank(scalingLetterFor(u.scaling, 'Int')), u.name).toBeGreaterThanOrEqual(letterRank('C'))
      expect(u.reachable).toBe(true)
      expect(u.later).toBe(false)
      expect(u.region ?? '', u.name).toMatch(/liurnia|raya lucaria|caelid|gael tunnel|ainsel|limgrave/i)
    }
  })

  it('never recommends a Shadow of the Erdtree weapon before the DLC is open', () => {
    const c = char({
      level: 30,
      stats: DEX_STATS,
      discoveredGraces: STARTED,
      answers: { lastRegion: 'Limgrave' },
    })
    const adv = advise(c, { weapons, reachableUpgrade: 6, limit: 200 })
    expect(adv.upgrades.every((u) => !u.dlc)).toBe(true)
    const pool = rankUpgrades(c, detectBuild(c, weapons), { weapons, reachableUpgrade: 6, limit: 500 })
    expect(pool.some((u) => u.dlc && u.later)).toBe(true)
  })
})
