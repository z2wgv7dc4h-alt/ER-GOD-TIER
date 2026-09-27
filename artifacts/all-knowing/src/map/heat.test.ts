import { describe, expect, it } from 'vitest'
import type { MapMarker } from '../types'
import { heatCells, heatRadius } from './heat'

const pin = (id: string, kind: MapMarker['kind'], region: string, x: number, y: number): MapMarker => ({
  id,
  name: id,
  kind,
  region,
  campaign: 'base',
  x,
  y,
})

describe('undone heat (Task 111 §4)', () => {
  it('groups not-done bosses/items by region with a centroid', () => {
    const cells = heatCells(
      [
        pin('boss:a', 'boss', 'Limgrave', 10, 20),
        pin('item:b', 'item', 'Limgrave', 30, 40),
        pin('boss:c', 'boss', 'Caelid', 90, 90),
        pin('npc:d', 'npc', 'Limgrave', 0, 0),
        pin('item:done', 'item', 'Limgrave', 0, 0),
      ],
      (id) => id === 'item:done',
    )
    expect(cells).toEqual([
      { region: 'Limgrave', count: 2, x: 20, y: 30 },
      { region: 'Caelid', count: 1, x: 90, y: 90 },
    ])
  })

  it('returns an empty layer when everything is done', () => {
    expect(heatCells([pin('boss:a', 'boss', 'Limgrave', 1, 1)], () => true)).toEqual([])
  })

  it('scales the radius with the count', () => {
    expect(heatRadius(1)).toBeGreaterThan(3)
    expect(heatRadius(64)).toBeGreaterThan(heatRadius(4))
    expect(heatRadius(10000)).toBe(14)
  })
})
