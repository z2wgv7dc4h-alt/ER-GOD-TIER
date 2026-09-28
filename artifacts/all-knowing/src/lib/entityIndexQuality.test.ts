import { readFileSync } from 'node:fs'
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
