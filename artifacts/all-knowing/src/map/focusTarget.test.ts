import { describe, expect, it } from 'vitest'
import type { CoordPin } from '../lib/coords'
import { FOCUS_ZOOM, resolveFocusTarget } from './focusTarget'

/** The real boss-pin shape (public/sourced/open/boss-pins.json), one row. */
const bossCoords: CoordPin[] = [
  { id: 'bossflag:10000800', name: 'Godrick the Grafted', kind: 'boss', world: 'overworld', x: 29.51, y: 61.55 },
]

describe('resolveFocusTarget (Task 155)', () => {
  it('places an overworld boss on the overworld layer, centred and zoomed', () => {
    expect(resolveFocusTarget('boss:godrick', { coords: bossCoords })).toEqual({
      kind: 'placed',
      id: 'boss:godrick',
      name: 'Godrick the Grafted',
      layer: 'overworld',
      center: { x: 29.51, y: 61.55 },
      zoom: FOCUS_ZOOM,
    })
  })

  it('places an underground place on the underground layer', () => {
    expect(resolveFocusTarget('grace:siofra')).toMatchObject({
      kind: 'placed',
      layer: 'underground',
    })
  })

  it('places a DLC place on the shadow layer', () => {
    expect(resolveFocusTarget('grace:gravesite')).toMatchObject({
      kind: 'placed',
      layer: 'shadow',
    })
  })

  it('places an overworld grace on the overworld layer at its authored point', () => {
    expect(resolveFocusTarget('grace:first-step')).toMatchObject({
      kind: 'placed',
      layer: 'overworld',
      center: { x: 35.05, y: 70.05 },
      zoom: FOCUS_ZOOM,
    })
  })

  it('falls back to the region when the target has no grounded position', () => {
    const plan = resolveFocusTarget('boss:godrick', { coords: [] })
    expect(plan).toMatchObject({ kind: 'region', region: 'Stormveil' })
    if (plan.kind === 'region') expect(plan.message).toMatch(/Stormveil/)
  })

  it('honours an explicit region and reports nothing for an empty target', () => {
    expect(resolveFocusTarget('mystery:thing', { region: 'Liurnia' })).toMatchObject({
      kind: 'region',
      region: 'Liurnia',
    })
    expect(resolveFocusTarget(null)).toEqual({ kind: 'none', message: 'Nothing to show on the map.' })
  })
})
