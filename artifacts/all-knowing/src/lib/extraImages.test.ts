import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizeName } from './fanImage'
import { extraImage, extraImageById, extraImageCount } from './extraImages'
import type { EntityRecord } from './entityIndex'

/**
 * Task 184 — the local picture plane (`src/data/image-index-extra.json`).
 *
 * The FanAPI index predates the DLC, so enemies, NPCs, graces, regions,
 * merchants and quests were mostly pictureless. This suite reads both indexes
 * (the FanAPI one and the Task 184 extra one) and holds per-kind coverage
 * floors to what the task achieved, checks every referenced file exists, and
 * checks that one creature picture is never reused across two different base
 * enemies (variants/encounters of one enemy legitimately share their wiki page's
 * portrait).
 *
 * `SAME_PAGE_SHARES` records the creature pages the wiki itself uses for more
 * than one named creature (e.g. its "Ram" page illustrates the Goat): the
 * shared picture is the wiki's own art for every name on the page, not a guess.
 */

const root = new URL('../../', import.meta.url)
const records: EntityRecord[] = Object.values(
  (
    JSON.parse(readFileSync(fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url)), 'utf8')) as {
      records: Record<string, EntityRecord>
    }
  ).records,
)

const baseIndex = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/image-index.json', import.meta.url)), 'utf8'),
) as Record<string, string>

const extraIndex = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/image-index-extra.json', import.meta.url)), 'utf8'),
) as { names: Record<string, string>; ids: Record<string, string> }

/** The floors Task 184 achieved, measured per record over the committed index. */
const FLOORS: Record<string, number> = {
  enemy: 0.75,
  npc: 0.95,
  grace: 0.9,
  region: 0.4,
  merchant: 0.9,
  quest: 0.9,
}

const SAME_PAGE_SHARES = new Set([
  '/sourced/images/creatures/abductor-virgin.webp',
  '/sourced/images/creatures/commoner.webp',
  '/sourced/images/creatures/demi-human-queen.webp',
  '/sourced/images/creatures/dominula-dancer.webp',
  '/sourced/images/creatures/dragon.webp',
  '/sourced/images/creatures/first-generation-albinauric.webp',
  '/sourced/images/creatures/fingercreeper.webp',
  '/sourced/images/creatures/mighty-demi-human.webp',
  '/sourced/images/creatures/millicent-s-sisters.webp',
  '/sourced/images/creatures/mule.webp',
  '/sourced/images/creatures/noble-page.webp',
  '/sourced/images/creatures/graven-mass.webp',
  '/sourced/images/creatures/ram.webp',
  '/sourced/images/creatures/sentry-stone.webp',
  '/sourced/images/creatures/sir-ansbach.webp',
  '/sourced/images/creatures/troll.webp',
  '/sourced/images/creatures/vulgar-militia.webp',
])

function hasPicture(record: EntityRecord): boolean {
  if (record.image) return true
  const key = normalizeName(record.name)
  return Boolean(baseIndex[key] || extraIndex.ids[record.id])
}

/** `entityIndexBuild.baseName`: drop trailing "(…)" and "×N" variant qualifiers. */
function baseName(name: string): string {
  return name.replace(/^\(.*?\)\s*/, '').replace(/\s*\(.*$/, '').replace(/\s*×\d+$/, '').trim()
}

function tokens(name: string): Set<string> {
  return new Set(baseName(name).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
}

function subset(a: Set<string>, b: Set<string>): boolean {
  return [...a].every((token) => b.has(token))
}

describe('extra picture plane (Task 184)', () => {
  it('has a non-empty extra index', () => {
    expect(extraImageCount()).toBeGreaterThan(500)
    expect(extraImage('Definitely Not A Real Entity')).toBeUndefined()
  })

  for (const [kind, floor] of Object.entries(FLOORS)) {
    it(`covers ${kind} above the floor`, () => {
      const all = records.filter((record) => record.kind === kind)
      expect(all.length, `${kind} has records`).toBeGreaterThan(0)
      const covered = all.filter(hasPicture).length
      expect(covered / all.length, `${kind}: ${covered}/${all.length}`).toBeGreaterThanOrEqual(floor)
    })
  }

  it('has every referenced extra image on disk', () => {
    const referenced = new Set(Object.values(extraIndex.ids))
    const missing = [...referenced].filter((path) => !existsSync(fileURLToPath(new URL(`public${path}`, root))))
    expect(missing).toEqual([])
  })

  it('never shares an enemy picture across different base enemies', () => {
    const byPath = new Map<string, string[]>()
    for (const record of records) {
      if (record.kind !== 'enemy') continue
      const path = extraImageById(record.id)
      if (!path) continue
      const names = byPath.get(path) ?? []
      names.push(record.name)
      byPath.set(path, names)
    }
    const offenders: string[] = []
    for (const [path, names] of byPath) {
      if (names.length < 2 || SAME_PAGE_SHARES.has(path)) continue
      const sets = names.map(tokens)
      const compatible = sets.every((a, i) => sets.every((b, j) => i === j || subset(a, b) || subset(b, a)))
      if (!compatible) offenders.push(path)
    }
    expect(offenders).toEqual([])
  })
})
