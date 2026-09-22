import { describe, expect, it } from 'vitest'
import { clusterMarkers } from './cluster'
import type { MapMarker } from '../types'

const pin = (id: string, x: number, y: number, kind: MapMarker['kind'] = 'item'): MapMarker => ({
  id, name: id, kind, region: 'r', campaign: 'base', x, y,
})

describe('clusterMarkers', () => {
  it('leaves small sets untouched', () => {
    const rows = [pin('a', 1, 1), pin('b', 2, 2)]
    expect(clusterMarkers(rows, 2.2)).toEqual({ singles: rows, clusters: [] })
  })

  it('keeps graces/bosses individual and clusters dense items', () => {
    const rows = [
      pin('g', 10, 10, 'grace'),
      pin('boss', 11, 11, 'boss'),
      ...Array.from({ length: 200 }, (_, i) => pin(`i${i}`, 50 + (i % 3) * 0.1, 50 + (i % 3) * 0.1)),
    ]
    const { singles, clusters } = clusterMarkers(rows, 2.2)
    expect(singles.some((m) => m.kind === 'grace')).toBe(true)
    expect(singles.some((m) => m.kind === 'boss')).toBe(true)
    expect(clusters.length).toBeGreaterThan(0)
    expect(clusters.reduce((n, c) => n + c.count, 0)).toBe(200)
  })
})
