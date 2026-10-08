import { existsSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { EntityRecord } from './entityIndex'

/**
 * Task 182 — the kind-gap fill from data already on disk. The index is generated
 * by `src/lib/entityIndexBuild.ts` and committed as `public/sourced/entity-index.json`;
 * these read that snapshot exactly like the other quality guards, so a regression
 * in the build fails the same way it would reach a player.
 *
 * §1 pictures from the right plane, §2 enemy coordinates, §3 boss runes.
 */

const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))
const wikiDbPath = [fileURLToPath(new URL('../../.scratch/er-mcp.db', import.meta.url)), fileURLToPath(new URL('../../data/raw/er-mcp.db', import.meta.url))].find(existsSync)

const records = (JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }).records ?? {}
const list = Object.values(records)

function fold(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function simpleNorm(value: unknown): string {
  return fold(value).toLowerCase().replace(/[\u2019'`"]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()
}
function possNorm(value: unknown): string {
  return simpleNorm(fold(String(value ?? '')).replace(/[\u2019']s\b/gi, ''))
}
function mapKeys(value: unknown): string[] {
  const plain = simpleNorm(value)
  const poss = possNorm(value)
  return poss && poss !== plain ? [plain, poss] : [plain]
}
function baseNorm(value: unknown): string {
  return simpleNorm(String(value ?? '').replace(/\([^)]*\)/g, ' ').replace(/&/g, ' and '))
    .replace(/^the /, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const imageDir = (image?: string): string | undefined => (image ? /\/images\/([^/]+)\//.exec(image)?.[1] : undefined)

describe('Task 182 §1 — a page pictures itself, never another kind', () => {
  // An object icon (armour, weapon, spell, …) or a place photo must never stand
  // in for a creature, and vice versa.
  const OBJECT_DIRS = new Set(['items', 'weapons', 'sorceries', 'incantations', 'armors', 'shields', 'talismans', 'ammos', 'ashes', 'classes'])

  it('never gives a boss/enemy/npc an object or place picture', () => {
    const offenders: string[] = []
    for (const record of list) {
      if (record.kind !== 'boss' && record.kind !== 'enemy' && record.kind !== 'npc') continue
      const dir = imageDir(record.image)
      if (dir && (OBJECT_DIRS.has(dir) || dir === 'locations')) offenders.push(`${record.id} -> ${record.image}`)
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('gives a region only location art', () => {
    const offenders = list
      .filter((record) => record.kind === 'region' && /\/images\//.test(record.image ?? '') && imageDir(record.image) !== 'locations')
      .map((record) => `${record.id} -> ${record.image}`)
    expect(offenders).toEqual([])
  })

  it('replaces the generic boss glyph on most bosses with a real portrait', () => {
    const bosses = list.filter((record) => record.kind === 'boss')
    const placeholders = bosses.filter((record) => /\/pack-icons\//.test(record.image ?? '')).length
    const real = bosses.filter((record) => /\/images\//.test(record.image ?? '')).length
    expect(bosses.length).toBe(281)
    // Was 68 real / 208 placeholders before Task 182; DLC portraits stay glyph-only.
    expect(real).toBeGreaterThanOrEqual(200)
    expect(placeholders).toBeLessThanOrEqual(70)
  })

  it('gives the regions the cached plane can picture a location photo', () => {
    const regions = list.filter((record) => record.kind === 'region')
    const withArt = regions.filter((record) => imageDir(record.image) === 'locations').length
    // Was 0 before Task 182.
    expect(withArt).toBeGreaterThanOrEqual(100)
  })
})

describe('Task 182 §2 — enemies get a representative map pin', () => {
  const enemies = list.filter((record) => record.kind === 'enemy')

  it('places a majority of enemies on the atlas', () => {
    const pinned = enemies.filter((record) => record.map).length
    // Was 0 before Task 182.
    expect(pinned).toBeGreaterThanOrEqual(450)
  })

  it('keeps every enemy pin inside the mosaic', () => {
    const offenders = enemies
      .filter((record) => record.map)
      .filter((record) => {
        const map = record.map!
        return !(Number.isFinite(map.x) && Number.isFinite(map.y) && map.x >= 0 && map.x <= 100 && map.y >= 0 && map.y <= 100)
      })
      .map((record) => `${record.id} -> ${JSON.stringify(record.map)}`)
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('projects a known spawn to its real place (Demi-Human in Limgrave)', () => {
    const demi = records['enemy:demi-human']
    expect(demi?.map, 'enemy:demi-human has no pin').toBeTruthy()
    // m60_43_35_00 is Limgrave, south-west of the Erdtree.
    expect(demi!.map!.x).toBeGreaterThan(30)
    expect(demi!.map!.x).toBeLessThan(45)
    expect(demi!.map!.y).toBeGreaterThan(65)
    expect(demi!.map!.y).toBeLessThan(80)
    expect(demi!.map!.world).toBe('overworld')
  })
})

describe('Task 182 §3 — boss runes from the wiki db', () => {
  const bosses = list.filter((record) => record.kind === 'boss')

  it('carries more boss rune rewards than before the db fill', () => {
    // Was 226 of 281 before Task 182.
    expect(bosses.filter((record) => record.stats?.Runes).length).toBeGreaterThanOrEqual(235)
  })

  it('marks the bosses it filled with the db source', () => {
    const filled = bosses.filter((record) => (record.sources ?? []).includes('er-mcp.db/bosses'))
    expect(filled.length).toBeGreaterThanOrEqual(15)
    for (const record of filled) expect(record.stats?.Runes, record.id).toBeTruthy()
  })

  // The db is a gitignored local drop; skip the completeness check without it.
  it.skipIf(!wikiDbPath)('fills a rune for every name-matched numeric db row', () => {
    const byName = new Map<string, EntityRecord>()
    for (const record of bosses) {
      for (const key of [...mapKeys(record.name), baseNorm(record.name)]) if (key && !byName.has(key)) byName.set(key, record)
    }
    const db = new DatabaseSync(wikiDbPath!, { readOnly: true })
    try {
      const rows = db.prepare('SELECT name, runes FROM bosses').all() as { name: string; runes: string | null }[]
      const missing: string[] = []
      for (const row of rows) {
        const runes = row.runes == null ? '' : String(row.runes).trim()
        if (!/^[\d][\d,\s]*$/.test(runes)) continue
        const match = mapKeys(row.name).map((key) => byName.get(key)).find(Boolean) ?? byName.get(baseNorm(row.name))
        if (match && !match.stats?.Runes) missing.push(`${match.id} (${row.name} = ${runes})`)
      }
      expect(missing, missing.slice(0, 20).join('\n')).toEqual([])
    } finally {
      db.close()
    }
  })
})
