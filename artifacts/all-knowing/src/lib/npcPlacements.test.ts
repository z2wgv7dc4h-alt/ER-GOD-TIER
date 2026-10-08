import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  matchNpcPlacements,
  npcCoordPins,
  placementSummary,
  placementsForName,
  type NpcPlacement,
} from './npcPlacements'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/npc-placements.json', import.meta.url), 'utf8'),
) as { source: string; placements: NpcPlacement[] }
const rows = doc.placements

describe('npc placements', () => {
  it('keeps the placed talkers (not enemy spawns)', () => {
    expect(rows.length).toBeGreaterThan(1000)
    expect(rows.length).toBeLessThan(3000)
    // Each person has several NpcParam rows (one per quest stage / variant, read at
    // MSB +0x2AC); the placements name them by person.
    const people = new Set(rows.map((r) => r.name.replace(/ · underground$/, '')))
    expect(people.size).toBeGreaterThanOrEqual(100)
    expect([...people].some((n) => n.includes('('))).toBe(false)
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
    expect(projected.every((r) => r.world === 'overworld' || r.world === 'shadow' || r.world === 'underground')).toBe(true)
  })
})

describe('npc placement wiring (Task 183 §1)', () => {
  it('projects one plate pin per NPC per world', () => {
    const pins = npcCoordPins(rows)
    expect(pins.length).toBeGreaterThan(80)
    expect(pins.every((p) => p.kind === 'npc')).toBe(true)
    expect(pins.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)).toBe(true)
    // Deduped: an NPC only carries one pin on a given world plate.
    expect(new Set(pins.map((p) => `${p.name}|${p.world}`)).size).toBe(pins.length)
  })

  it('resolves a page name exactly before falling back to a partial match', () => {
    const blaidd = placementsForName('Blaidd', rows)
    expect(blaidd.length).toBeGreaterThan(0)
    // Every exact hit is the same person (not "Blaidd the Half-Wolf" variants
    // when an exact "Blaidd" row exists).
    expect(blaidd.every((p) => p.name.replace(/ · underground$/, '') === 'Blaidd')).toBe(true)
    expect(placementsForName('Blaidd the Half-Wolf', rows).length).toBeGreaterThan(0)
    // A two-character name must not sweep the whole file.
    expect(placementsForName('D', rows)).toEqual([])
  })
})
