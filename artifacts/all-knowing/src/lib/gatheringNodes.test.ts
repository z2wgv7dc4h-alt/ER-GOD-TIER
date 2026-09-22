import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildGatheringNodes, matchGatheringNodes, nearestRegion } from './gatheringNodes'
import type { GraceRegion } from './gatheringNodes'

/** The real open dumps, read straight off disk — not a hand-rolled fixture. */
const nodes = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/gathering-nodes.json', import.meta.url), 'utf8'),
) as any[]

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

describe('gathering nodes (AEG placements -> queryable facts)', () => {
  const facts = buildGatheringNodes(nodes, regions)

  it('converts ~21.8k rows into gathering-node facts with world assignments', () => {
    expect(facts.length).toBeGreaterThan(21000)
    expect(facts.length).toBeLessThan(22000)
    expect(facts.every((f) => f.id.startsWith('node:'))).toBe(true)
  })

  it('assigns each node to a world based on the confirmed 60/61 world-tile grids', () => {
    const worlds = new Set(facts.map((f) => f.world))
    expect(worlds.has('overworld')).toBe(true)
    expect(worlds.has('underground')).toBe(true)
    expect(worlds.has('shadow')).toBe(true)
    // 'ashen' is never claimed: nothing in this dump distinguishes Ashen
    // Capital's map id from living Leyndell's, so guessing one would be a
    // fabrication, not a finding — see the areaToWorld() doc comment.
    expect(worlds.has('ashen')).toBe(false)
  })

  it('resolves a real node to its area and region', () => {
    const sample = facts.find((f) => f.model === 'AEG099_821')
    expect(sample).toBeDefined()
    expect(sample!.area).toBeGreaterThan(0)
    // Only area 60/61 are confirmed (m60_*/m61_* world-tile grids); every
    // other area falls into 'underground' as the closest unverified bucket.
    if (sample!.area === 60) expect(sample!.world).toBe('overworld')
    else if (sample!.area === 61) expect(sample!.world).toBe('shadow')
    else expect(sample!.world).toBe('underground')
    expect(sample!.x).toBeDefined()
    expect(sample!.y).toBeDefined()
    expect(sample!.z).toBeDefined()
  })

  it('resolves nodes to their nearest grace region', () => {
    const limgraveNodes = facts.filter((f) => f.area === 10)
    expect(limgraveNodes.length).toBeGreaterThan(0)
    const withRegion = limgraveNodes.filter((f) => f.region.length > 0)
    expect(withRegion.length).toBeGreaterThan(0)
    // Some regions should be well-known Limgrave locations
    const regionSet = new Set(withRegion.map((f) => f.region))
    expect(regionSet.size).toBeGreaterThan(1)
  })

  it('preserves model and instance IDs from the source data', () => {
    const sample = facts[0]
    expect(sample.model).toBeDefined()
    expect(sample.model.length).toBeGreaterThan(0)
    expect(sample.instanceId).toBeDefined()
  })

  it('keeps all nodes (no deduping by placement)', () => {
    // The source has ~21.8k rows, each a distinct placement.
    // We should have roughly the same number of facts (no collapsing).
    expect(facts.length).toBeCloseTo(nodes.length, -2)
  })

  it('distinguishes nodes in different worlds by area', () => {
    const overworldNodes = facts.filter((f) => f.world === 'overworld')
    const undergroundNodes = facts.filter((f) => f.world === 'underground')
    const shadowNodes = facts.filter((f) => f.world === 'shadow')

    expect(overworldNodes.length).toBeGreaterThan(0)
    expect(undergroundNodes.length).toBeGreaterThan(0)
    expect(shadowNodes.length).toBeGreaterThan(0)

    // Verify world-to-area mapping is consistent with the confirmed grids.
    for (const node of facts) {
      if (node.world === 'overworld') expect(node.area).toBe(60)
      if (node.world === 'shadow') expect(node.area).toBe(61)
      if (node.world === 'underground') expect(node.area === 60 || node.area === 61).toBe(false)
    }
  })
})

describe('nearestRegion', () => {
  const byArea = new Map<number, GraceRegion[]>([
    [10, [
      { areaNo: 10, x: 0, y: 0, z: 0, region: 'Far' },
      { areaNo: 10, x: 100, y: 0, z: 0, region: 'Near' },
    ]],
  ])

  it('picks the closest point in the same area', () => {
    expect(nearestRegion(byArea, 10, 99, 0, 0)).toBe('Near')
    expect(nearestRegion(byArea, 10, -50, 0, 0)).toBe('Far')
  })

  it('returns empty when the area has no points', () => {
    expect(nearestRegion(byArea, 99, 0, 0, 0)).toBe('')
  })
})

describe('matchGatheringNodes', () => {
  const facts = buildGatheringNodes(nodes, regions)

  it('matches by region name', () => {
    const hits = matchGatheringNodes('stormveil', facts)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((f) => f.region.toLowerCase().includes('stormveil'))).toBe(true)
  })

  it('matches by map ID', () => {
    const hits = matchGatheringNodes('m10_', facts)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((f) => f.map.startsWith('m10_'))).toBe(true)
  })

  it('matches by model code', () => {
    const hits = matchGatheringNodes('aeg099', facts)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].model.toLowerCase()).toContain('aeg099')
  })

  it('ignores very short queries', () => {
    expect(matchGatheringNodes('ae', facts)).toEqual([])
  })

  it('caps results at the limit', () => {
    const hits = matchGatheringNodes('m10', facts, 5)
    expect(hits.length).toBeLessThanOrEqual(5)
  })
})
