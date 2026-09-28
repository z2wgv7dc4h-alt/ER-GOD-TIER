import { existsSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { EntityRecord } from './entityIndex'

/**
 * Task 132 — player-facing quality guards for the enrichment index.
 *
 * The index is generated from `src/lib/entityIndexBuild.ts` and committed as
 * `public/sourced/entity-index.json`; these tests read that committed snapshot
 * exactly like `entityCoverage.test.ts`, so a regression in the build fails CI
 * the same way it would reach a player.
 */

const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))
const checklistTalismansPath = fileURLToPath(new URL('../../public/sourced/checklists/talismans.json', import.meta.url))
const wikiTalismanDbPath = fileURLToPath(new URL('../../data/raw/er-mcp.db', import.meta.url))
const records = (JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }).records ?? {}
const list = Object.values(records)

const norm = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019'`"]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()

/** Every string a player can read on an entity page/peek card. */
function playerText(record: EntityRecord): string[] {
  const out: (string | undefined)[] = [record.name, record.description, record.location, record.region, record.strategy]
  if (record.drops) out.push(...record.drops)
  if (record.stats) out.push(...Object.values(record.stats))
  if (record.related) out.push(...record.related)
  if (record.sections) for (const section of record.sections) out.push(section.heading, section.text)
  if (record.upgradeLevels) for (const level of record.upgradeLevels) out.push(level.name, level.effect)
  if (record.questSteps) for (const step of record.questSteps) out.push(step.title, step.text, step.location)
  return out.filter((value): value is string => typeof value === 'string')
}

describe('Task 132 §1 — no raw engine map ids reach the player', () => {
  const RAW_TILE = /\bm\d{2}_\d{2}_\d{2}_\d{2}\b/

  it('has no player-visible field matching a raw map-tile id', () => {
    const offenders: string[] = []
    for (const record of list) {
      for (const text of playerText(record)) {
        if (RAW_TILE.test(text)) offenders.push(`${record.id}: ${text.slice(0, 80)}`)
      }
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('translates a known tile to a human place, not the id', () => {
    // m14_00_00_00 is the Academy of Raya Lucaria; the Abductor Virgin Duo lives there.
    const duo = records['boss:abductor-virgin-duo']
    expect(duo?.location).toBeTruthy()
    expect(duo!.location).toMatch(/Raya Lucaria/i)
    expect(duo!.location).not.toMatch(RAW_TILE)
  })
})

describe('Task 132 §2 — an enemy row merges into its NPC/boss/quest entity', () => {
  const KIND_PRIORITY: Record<string, number> = { npc: 0, boss: 1, quest: 2, enemy: 3 }

  function bestFor(query: string): EntityRecord | undefined {
    const q = norm(query)
    return list
      .filter((record) => KIND_PRIORITY[record.kind] !== undefined && norm(record.name).includes(q))
      .sort(
        (a, b) =>
          (KIND_PRIORITY[a.kind] ?? 9) - (KIND_PRIORITY[b.kind] ?? 9) ||
          (b.stats?.HP ? 1 : 0) - (a.stats?.HP ? 1 : 0) ||
          (b.description ? 1 : 0) - (a.description ? 1 : 0),
      )[0]
  }

  for (const name of ['Sellen', 'Alexander', 'Blaidd', 'Ranni', 'Patches']) {
    it(`${name} resolves to the NPC entity and carries the merged combat stats`, () => {
      const best = bestFor(name)
      expect(best, `no record for ${name}`).toBeTruthy()
      expect(best!.kind, `${name} resolved to ${best!.kind} (${best!.id})`).toBe('npc')
      expect(best!.stats?.HP, `${best!.id} has no merged HP`).toBeTruthy()
      expect(best!.stats?.Negation, `${best!.id} has no merged negation`).toBeTruthy()
    })
  }

  it('leaves no duplicate primary enemy row for a merged NPC name', () => {
    for (const name of ['Sorceress Sellen', 'Alexander, Warrior Jar', 'Ranni the Witch', 'Patches']) {
      const key = norm(name)
      const enemy = list.find((record) => record.kind === 'enemy' && norm(record.name) === key)
      expect(enemy, `unmerged enemy row still primary: ${enemy?.id}`).toBeUndefined()
    }
  })
})

describe('Task 132 §3 — location records are real and non-empty', () => {
  const regions = list.filter((record) => record.kind === 'region' && record.catalogue !== false)
  const hasGraces = (record: EntityRecord): boolean =>
    Boolean(record.sections?.some((section) => /sites? of grace|graces/i.test(section.heading)))

  it('gives at least 95% of regions a description or contained sites of grace', () => {
    const covered = regions.filter((record) => Boolean(record.description?.trim()) || hasGraces(record)).length
    expect(regions.length).toBeGreaterThan(100)
    expect(covered / regions.length).toBeGreaterThanOrEqual(0.95)
  })

  it('keeps no empty location record', () => {
    const empty = regions.filter((record) => !record.description?.trim() && !record.location?.trim() && !hasGraces(record))
    expect(empty.map((record) => `${record.id} (${record.name})`)).toEqual([])
  })

  it('drops the empty FMG place-name rows', () => {
    const junk = list.filter(
      (record) =>
        record.kind === 'region' &&
        record.catalogue === false &&
        (record.sources ?? []).some((source) => source.startsWith('names/fmg')) &&
        !record.description?.trim() &&
        !record.location?.trim(),
    )
    expect(junk.map((record) => record.id)).toEqual([])
  })
})

describe('Task 132 §4 — enemies carry a real description, not just their name', () => {
  const enemies = list.filter((record) => record.kind === 'enemy')
  const real = (record: EntityRecord): boolean => {
    const text = record.description?.trim()
    return Boolean(text && text.length >= 20 && norm(text) !== norm(record.name))
  }

  it('describes at least 90% of enemies', () => {
    const described = enemies.filter(real).length
    expect(enemies.length).toBeGreaterThan(500)
    expect(described / enemies.length).toBeGreaterThanOrEqual(0.9)
  })

  it('never leaves an enemy description equal to its name', () => {
    const nameOnly = enemies.filter((record) => record.description && norm(record.description) === norm(record.name))
    expect(nameOnly.map((record) => record.id)).toEqual([])
  })
})

describe('Task 133 §0 — wiki markup and Nightreign boilerplate are stripped', () => {
  it('has no wiki/markdown bold marker in player text', () => {
    const offenders: string[] = []
    for (const record of list) {
      for (const text of playerText(record)) {
        if (text.includes('**') || text.includes("'''") || text.includes('[[')) offenders.push(`${record.id}: ${text.slice(0, 80)}`)
      }
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('never mentions the other game, Nightreign', () => {
    const offenders: string[] = []
    for (const record of list) {
      for (const text of playerText(record)) {
        if (/nightreign/i.test(text)) offenders.push(`${record.id}: ${text.slice(0, 80)}`)
      }
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('has no two primary records of one kind on the same name + location', () => {
    const seen = new Map<string, string>()
    const offenders: string[] = []
    for (const record of list) {
      if (record.catalogue === false) continue
      const key = `${record.kind}|${norm(record.name)}|${norm(record.location)}`
      const previous = seen.get(key)
      if (previous) offenders.push(`${key} -> ${previous} vs ${record.id}`)
      else seen.set(key, record.id)
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })
})

describe('Task 133 §0 — upgrade rows and quest steps are folded', () => {
  it('folds only genuine upgrade kinds, never talismans or armour', () => {
    const leftover = list.filter((record) => /\s\+\d+$/.test(record.name) && record.kind !== 'talisman' && record.kind !== 'armor')
    expect(leftover.map((record) => record.id)).toEqual([])
  })

  it('folds the +N levels onto the base entity as an upgrade table', () => {
    const upgraded = list.filter((record) => record.upgradeLevels?.length)
    expect(upgraded.length).toBeGreaterThan(50)
    const ashes = list.find((record) => record.id === 'item:kindred-of-rot-ashes')
    expect(ashes?.upgradeLevels?.length).toBe(10)
    expect(ashes!.upgradeLevels!.map((level) => level.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('merges an NPC quest into one ordered step list', () => {
    const sellen = list.find((record) => record.questSteps?.some((step) => /Sellen/i.test(step.title)))
    expect(sellen, 'no record carries a merged Sellen quest line').toBeTruthy()
    const steps = sellen!.questSteps!
    expect(steps.length).toBeGreaterThanOrEqual(7)
    expect(steps.some((step) => step.source === 'authored')).toBe(true)
    expect(steps.map((step) => step.order)).toEqual(steps.map((_, index) => index + 1))
  })
})

describe('Task 133 §0 — talisman variants are separate collectibles, not folded upgrades', () => {
  const talismans = list.filter((record) => record.kind === 'talisman')
  const talismanNames = new Set(talismans.map((record) => norm(record.name)))

  // The wiki DB is a gitignored local data drop (`data/raw/`); skip on checkouts without it.
  it.skipIf(!existsSync(wikiTalismanDbPath))('keeps every wiki DB talisman (including the +N variants) as its own talisman record', () => {
    // `data/raw/er-mcp.db` is the DLC-inclusive authority: 156 talisman pages,
    // 38 of them `+N` variants that are distinct pickups with their own pages.
    const db = new DatabaseSync(wikiTalismanDbPath, { readOnly: true })
    try {
      const dbNames = db.prepare('SELECT name FROM talismans').all().map((row) => String(row.name))
      const missing = dbNames.filter((name) => !talismanNames.has(norm(name)))
      expect(missing).toEqual([])
      expect(talismans.length).toBeGreaterThanOrEqual(dbNames.length)
    } finally {
      db.close()
    }
  })

  it('keeps every checklist talisman as its own talisman record', () => {
    const checklist = JSON.parse(readFileSync(checklistTalismansPath, 'utf8')) as { name: string }[]
    const missing = checklist.filter((row) => !talismanNames.has(norm(row.name)))
    expect(missing).toEqual([])
    expect(talismans.length).toBeGreaterThanOrEqual(checklist.length)
  })

  it('keeps the +N and distinct-name variants the task called out', () => {
    const called = [
      'Crimson Amber Medallion +1',
      'Crimson Amber Medallion +2',
      'Crimson Amber Medallion +3',
      'Cerulean Amber Medallion +1',
      'Cerulean Amber Medallion +2',
      'Cerulean Amber Medallion +3',
      'Viridian Amber Medallion +1',
      'Viridian Amber Medallion +2',
      'Viridian Amber Medallion +3',
      'Arsenal Charm +1',
      "Erdtree's Favor +1",
      "Erdtree's Favor +2",
      'Stalwart Horn Charm +1',
      'Immunizing Horn Charm +1',
      'Clarifying Horn Charm +1',
      'Mottled Necklace +1',
      'Spelldrake Talisman +1',
      'Flamedrake Talisman +1',
      'Boltdrake Talisman +1',
      'Haligdrake Talisman +1',
      'Pearldrake Talisman +1',
      'Dragoncrest Shield Talisman +1',
      "Great-Jar's Arsenal",
      "Prince of Death's Cyst",
      "Kindred of Rot's Exultation",
      'Green Turtle Talisman',
      'Dragoncrest Greatshield Talisman',
    ]
    for (const name of called) expect(talismanNames.has(norm(name)), name).toBe(true)
  })

  it('has at least 30 standalone +N talisman records', () => {
    expect(talismans.filter((record) => /\s\+\d+$/.test(record.name)).length).toBeGreaterThanOrEqual(30)
  })
})

describe('Task 133 §0 — a boss-encounter enemy merges into the boss', () => {
  it('leaves no enemy row for a named boss encounter', () => {
    expect(list.find((record) => record.kind === 'enemy' && norm(record.name) === 'promised consort radahn boss')).toBeUndefined()
    expect(list.find((record) => record.kind === 'enemy' && norm(record.name) === 'nox swordstress boss')).toBeUndefined()
  })
})

describe('Task 140 §1 — fields the accuracy sample found missing are now carried', () => {
  it('gives catalogue armour its slot', () => {
    const armour = list.filter((record) => record.kind === 'armor' && record.catalogue)
    const withSlot = armour.filter((record) => record.stats?.Type)
    expect(armour.length).toBeGreaterThan(500)
    expect(withSlot.length / armour.length).toBeGreaterThanOrEqual(0.99)
  })

  it('gives catalogue spells their FP cost and slot count', () => {
    const spells = list.filter((record) => record.kind === 'spell' && record.catalogue)
    const withCost = spells.filter((record) => record.stats?.['FP cost'] && record.stats?.Slots)
    expect(spells.length).toBeGreaterThan(100)
    expect(withCost.length / spells.length).toBeGreaterThanOrEqual(0.99)
  })

  it('backfills FP cost / slots on spells seeded only from the magic dump', () => {
    // Miriam's Vanishing has no checklist row, so the parsed wiki DB `spells`
    // table is its only source for the cost and slot count.
    const vanishing = list.find((record) => record.kind === 'spell' && /miriam.s vanishing/i.test(record.name))
    expect(vanishing?.stats?.['FP cost']).toBe('9')
    expect(vanishing?.stats?.Slots).toBe('1')
  })

  it('carries the wiki skill on a wiki-only weapon', () => {
    expect(records['item:serpent-crest-shield']?.stats?.Skill).toBe('No Skill')
  })

  it('gives goods records the wiki infobox type where present', () => {
    const typed = list.filter((record) => record.kind === 'item' && record.stats?.Type)
    expect(typed.length).toBeGreaterThan(50)
  })
})
