import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROUTE_REGIONS, isDlcRegion, regionReachableFrom, regionsAdjacent, routeGroupFor } from './regionRoutes'

/**
 * Task 114 §1 — the adjacency spine must be exactly the distinct regions of the
 * progress route the guide ships, in order. If legs.json changes, this fails.
 */
const legs = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/guide/legs.json', import.meta.url), 'utf8'),
) as { region: string }[]

describe('region route adjacency (Task 114)', () => {
  it('mirrors the distinct region order of legs.json', () => {
    const order: string[] = []
    for (const leg of legs) if (!order.includes(leg.region)) order.push(leg.region)
    expect([...ROUTE_REGIONS]).toEqual(order)
  })

  it('puts the early game in one walkable band', () => {
    expect(routeGroupFor('Raya Lucaria')).toBe('Liurnia of the Lakes')
    expect(routeGroupFor('Stormveil')).toBe('Limgrave')
    expect(regionsAdjacent('Limgrave', 'Liurnia')).toBe(true)
    expect(regionsAdjacent('Limgrave', 'Caelid')).toBe(false)
  })

  it('reaches a region from a neighbour but not across the map', () => {
    expect(regionReachableFrom(['Limgrave'], 'Weeping Peninsula')).toBe(true)
    expect(regionReachableFrom(['Limgrave'], 'Liurnia')).toBe(true)
    expect(regionReachableFrom(['Limgrave'], 'Mountaintops')).toBe(false)
  })

  it('flags the Shadow realm as DLC-only', () => {
    expect(isDlcRegion('Gravesite Plain')).toBe(true)
    expect(isDlcRegion('Castle Ensis')).toBe(true)
    expect(isDlcRegion('Limgrave')).toBe(false)
  })
})
