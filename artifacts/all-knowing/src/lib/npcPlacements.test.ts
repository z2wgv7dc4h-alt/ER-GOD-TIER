import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchNpcPlacements, placementSummary, type NpcPlacement } from './npcPlacements'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/npc-placements.json', import.meta.url), 'utf8'),
) as { source: string; placements: NpcPlacement[] }
const rows = doc.placements

describe('npc placements', () => {
  it('has many placed entities and all 95 talkers', () => {
    expect(rows.length).toBeGreaterThan(20000)
    expect(new Set(rows.filter((r) => r.dialogue).map((r) => r.npc)).size).toBe(95)
  })

  it('matches by name and summarises maps', () => {
    expect(matchNpcPlacements('bl', rows)).toEqual([])
    const hits = matchNpcPlacements('blaidd', rows)
    expect(hits.length).toBeGreaterThan(0)
    const sum = placementSummary(rows, hits[0].name)
    expect(sum.count).toBeGreaterThan(0)
    expect(sum.maps.length).toBeGreaterThan(0)
  })
})
