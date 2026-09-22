import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchNpcPlacements, placementSummary, type NpcPlacement } from './npcPlacements'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/npc-placements.json', import.meta.url), 'utf8'),
) as { source: string; placements: NpcPlacement[] }
const rows = doc.placements

describe('npc placements', () => {
  it('keeps the placed talkers (not enemy spawns)', () => {
    expect(rows.length).toBeGreaterThan(1000)
    expect(rows.length).toBeLessThan(3000)
    expect(new Set(rows.map((r) => r.npc)).size).toBe(95)
  })

  it('matches by name and summarises maps', () => {
    expect(matchNpcPlacements('bl', rows)).toEqual([])
    const hits = matchNpcPlacements('blaidd', rows)
    expect(hits.length).toBeGreaterThan(0)
    const sum = placementSummary(rows, hits[0].name)
    expect(sum.count).toBeGreaterThan(0)
    expect(sum.maps.length).toBeGreaterThan(0)
  })

  it('carries projected pins in the engine frame', () => {
    const projected = rows.filter((r) => r.px != null && r.py != null)
    expect(projected.length).toBeGreaterThan(1200)
    expect(projected.every((r) => r.px! >= 0 && r.px! <= 10496 && r.py! >= 0 && r.py! <= 10496)).toBe(true)
    expect(projected.every((r) => r.world === 'overworld' || r.world === 'shadow')).toBe(true)
  })
})
