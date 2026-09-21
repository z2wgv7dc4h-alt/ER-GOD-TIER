import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildChestFacts, catalogItemIndex, matchChests, nearestRegion } from './chestFacts'
import type { GraceRegion } from './chestFacts'
import type { WorldLot } from './openData'

/** The real open dumps, read straight off disk — not a hand-rolled fixture. */
const lots = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/world-lots.json', import.meta.url), 'utf8'),
) as WorldLot[]

const graceXyz = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/grace-xyz.json', import.meta.url), 'utf8'),
) as { areaNo: number; x: number; y: number; z: number; subRegion?: string | null; majorRegion?: string | null }[]

const regions: GraceRegion[] = graceXyz.map((r) => ({
  areaNo: r.areaNo,
  x: r.x,
  y: r.y,
  z: r.z,
  region: r.subRegion || r.majorRegion || '',
}))

describe('chest facts (world-lots -> queryable chests)', () => {
  const chests = buildChestFacts(lots, regions)

  it('collapses 4018 treasure rows into one fact per event flag', () => {
    // 3404 distinct flags, minus 3 whose rows carry no item name.
    expect(chests.length).toBe(3401)
    expect(chests.every((c) => c.id === `lot:${c.flag}`)).toBe(true)
  })

  it('resolves a real chest to its location and item', () => {
    const grape = chests.find((c) => c.flag === 10007850)
    expect(grape).toBeDefined()
    expect(grape!.items).toEqual(['Shabriri Grape'])
    expect(grape!.region).toBe('Stormveil Castle')
    expect(grape!.map).toBe('m10_00_00_00')
    expect(grape!.x).toBeCloseTo(-298.403, 3)
  })

  it('unions multi-item chests instead of emitting one row per item', () => {
    const alberich = chests.find((c) => c.flag === 11007005)
    expect(alberich!.items).toHaveLength(4)
    expect(alberich!.items).toContain("Alberich's Robe")
  })

  it('dedupes items against the authored catalog', () => {
    const blade = chests.find((c) => c.flag === 12027080)
    expect(blade!.items).toEqual(['Fingerslayer Blade'])
    expect(blade!.catalogIds).toContain('item:fingerslayer')
    expect(catalogItemIndex().get('fingerslayer blade')).toBe('item:fingerslayer')
    // and the connection is not accidental: at least one chest resolves per known item
    expect(chests.filter((c) => c.catalogIds.length > 0).length).toBeGreaterThan(50)
  })

  it('drops flag-0 rows (no event flag to dedupe or tick)', () => {
    expect(chests.some((c) => c.flag === 0)).toBe(false)
  })

  it('only keeps treasure sources, not enemy drops or scripted awards', () => {
    expect(chests.every((c) => c.source === 'treasure' || c.source === 'emevd_treasure')).toBe(true)
  })
})

describe('nearestRegion', () => {
  const byArea = new Map<number, GraceRegion[]>([
    [10, [
      { areaNo: 10, x: 0, y: 0, z: 0, region: 'Far' },
      { areaNo: 10, x: 100, y: 0, z: 0, region: 'Near' },
    ]],
  ])

  it('picks the closest point in the same map area', () => {
    expect(nearestRegion(byArea, 'm10_00_00_00', 99, 0, 0)).toBe('Near')
    expect(nearestRegion(byArea, 'm10_00_00_00', -50, 0, 0)).toBe('Far')
  })

  it('returns empty when the area has no points', () => {
    expect(nearestRegion(byArea, 'm99_00_00_00', 0, 0, 0)).toBe('')
  })
})

describe('matchChests', () => {
  const chests = buildChestFacts(lots, regions)

  it('matches by item name', () => {
    const hits = matchChests('shabriri', chests)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].items.join(' ')).toContain('Shabriri Grape')
  })

  it('matches by region', () => {
    const hits = matchChests('stormveil castle', chests)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((c) => c.region === 'Stormveil Castle')).toBe(true)
  })

  it('ignores very short queries', () => {
    expect(matchChests('sh', chests)).toEqual([])
  })
})
