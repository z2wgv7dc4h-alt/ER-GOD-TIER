import type { MapMarker } from '../types'

/**
 * Grid clustering for the static plate. Graces/bosses (icon pins) and the
 * gate/leftover layers stay individual; the dense iconless pins (items,
 * dungeons, fragments, spirit ashes) collapse into counted clusters so the
 * plate is readable at a glance.
 */
export type Cluster = { x: number; y: number; count: number; first: MapMarker }

function clusterable(m: MapMarker): boolean {
  return m.kind !== 'grace' && m.kind !== 'boss' && !m.gate && !m.leftover
}

export function clusterMarkers(rows: MapMarker[], cell: number, threshold = 150): { singles: MapMarker[]; clusters: Cluster[] } {
  if (cell <= 0 || rows.length <= threshold) return { singles: rows, clusters: [] }
  const buckets = new Map<string, MapMarker[]>()
  const singles: MapMarker[] = []
  for (const m of rows) {
    if (!clusterable(m)) {
      singles.push(m)
      continue
    }
    const key = `${Math.floor(m.x / cell)}:${Math.floor(m.y / cell)}`
    const b = buckets.get(key) ?? []
    b.push(m)
    buckets.set(key, b)
  }
  const clusters: Cluster[] = []
  for (const b of buckets.values()) {
    if (b.length === 1) {
      singles.push(b[0])
      continue
    }
    clusters.push({
      x: b.reduce((s, m) => s + m.x, 0) / b.length,
      y: b.reduce((s, m) => s + m.y, 0) / b.length,
      count: b.length,
      first: b[0],
    })
  }
  return { singles, clusters }
}
