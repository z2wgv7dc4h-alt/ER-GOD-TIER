import type { MapMarker } from '../types'

/**
 * Task 111 §4 — "undone heat".
 *
 * The not-done boss/item pins grouped by region, with a centroid for each so the
 * plate can show where the work still is as one density blob. Pure: callers pass
 * the `isDone` predicate (normally `factState(...) === 'true'`), so the module
 * has no dependency on the workspace.
 */
export type HeatCell = { region: string; count: number; x: number; y: number }

const HEAT_KINDS = new Set<MapMarker['kind']>(['boss', 'item'])

export function heatCells(pins: MapMarker[], isDone: (id: string) => boolean): HeatCell[] {
  const byRegion = new Map<string, { sumX: number; sumY: number; count: number }>()
  for (const m of pins) {
    if (!HEAT_KINDS.has(m.kind)) continue
    if (isDone(m.id)) continue
    const cur = byRegion.get(m.region) ?? { sumX: 0, sumY: 0, count: 0 }
    cur.sumX += m.x
    cur.sumY += m.y
    cur.count += 1
    byRegion.set(m.region, cur)
  }
  return [...byRegion.entries()]
    .map(([region, c]) => ({ region, count: c.count, x: c.sumX / c.count, y: c.sumY / c.count }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region))
}

/** Screen radius for a cell's count, tap/read-able but never swallowing the map. */
export function heatRadius(count: number): number {
  return Math.min(14, 3 + Math.sqrt(Math.max(0, count)) * 1.8)
}
