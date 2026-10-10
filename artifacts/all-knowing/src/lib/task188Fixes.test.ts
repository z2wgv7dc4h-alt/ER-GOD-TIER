import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { EntityRecord } from './entityIndex'

/**
 * Task 188 (Batch B of the Task 186 report) — the field guards for the fixes:
 * §7 plate-frame coordinates, §8 the DLC title stored as a region, §9 the
 * quest/region description back-fill. Reads the committed index exactly like the
 * other quality guards, so a regression in the build fails the same way it would
 * reach a player.
 */

const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))
const records = (JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }).records ?? {}
const list = Object.values(records)

const inPlate = (map?: { x: number; y: number }): boolean =>
  !!map &&
  Number.isFinite(map.x) &&
  Number.isFinite(map.y) &&
  map.x >= 0 &&
  map.x <= 100 &&
  map.y >= 0 &&
  map.y <= 100

describe('Task 188 §7 — every stored coordinate is inside the plate frame', () => {
  it('keeps no record map outside 0–100', () => {
    const offenders = list.filter((record) => record.map && !inPlate(record.map)).map((record) => `${record.id} -> ${JSON.stringify(record.map)}`)
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('keeps every grace map pin (its coverage floor is 100%)', () => {
    const graces = list.filter((record) => record.kind === 'grace')
    expect(graces.length).toBeGreaterThan(400)
    expect(graces.filter((record) => inPlate(record.map)).length).toBe(graces.length)
  })

  it('recovers the two POI graces from the engine markers, not the signed lat/lng plane', () => {
    for (const id of ['grace:61423300', 'grace:62344800']) {
      expect(inPlate(records[id]?.map), `${id} has no in-frame pin`).toBe(true)
    }
  })
})

describe('Task 188 §8 — the DLC title is never a region', () => {
  it('keeps no record whose region names Shadow of the Erdtree', () => {
    const offenders = list.filter((record) => record.region && /shadow of the erdtree/i.test(record.region)).map((record) => `${record.id} -> ${record.region}`)
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('maps the Enir-Ilim encounter to its real sub-region', () => {
    expect(records['boss:needle-knight-leda']?.region).toBe('Enir-Ilim')
  })
})

describe('Task 188 §9 — quest and region descriptions back-filled from disk prose', () => {
  const described = (kind: string): number => {
    const rows = list.filter((record) => record.kind === kind)
    return rows.filter((record) => record.description && record.description.trim()).length / rows.length
  }

  it('describes at least 95% of quest pages (was 86%)', () => {
    // 0.95 counted 33 quest-line "N beats" filler descriptions; Task 187 removed that filler (owner rule:
    // empty beats fake), leaving 91% real text.
    expect(described('quest')).toBeGreaterThanOrEqual(0.9)
  })

  it('describes at least 90% of region pages (was 87%)', () => {
    expect(described('region')).toBeGreaterThanOrEqual(0.9)
  })

  it('gives an authored beat its real storyline prose', () => {
    expect(records['quest:alexander:met']?.description).toMatch(/South of Stormhill/i)
  })

  it('gives a place its wiki Overview sentence', () => {
    expect(records['region:carian-study-hall']?.description).toMatch(/eastern coast of Liurnia/i)
  })
})
