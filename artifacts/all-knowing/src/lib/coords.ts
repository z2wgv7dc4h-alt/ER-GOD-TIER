import { useEffect, useState } from 'react'
import type { MapMarker } from '../types'

/**
 * Static-plate pins.
 *
 * Two sources, both already projected into the plate's own frame:
 *   - coords.json    — er-guide lat/lng pins (graces/items), on the Pack 960
 *                      mosaic frame (percent = px / 10496).
 *   - boss-pins.json — bosses, projected with the engine's world->pixel maths.
 *
 * `public/sourced/open/world-lots.json` (10k pickup XYZ rows) is deliberately
 * NOT plotted on the static plate. It carries world XYZ only, not percent
 * coords, so drawing it would need a third projection beside the two above —
 * and 10k dots would bury the map. Lot-level detail is the live engine
 * iframe's job. See ARCHITECTURE.md "Two map frames (do not mix)".
 */
export type CoordPin = {
  id: string
  name: string
  kind: MapMarker['kind'] | string
  world: string
  x: number
  y: number
  how?: string
  cat?: string
}

let cache: CoordPin[] | null = null

export function useCoords() {
  const [rows, setRows] = useState<CoordPin[]>(cache || [])
  useEffect(() => {
    if (cache) return
    void Promise.all([
      fetch('/sourced/open/coords.json').then((r) => r.json()),
      fetch('/sourced/open/boss-pins.json').then((r) => r.json() as Promise<CoordPin[]>).catch(() => [] as CoordPin[]),
    ]).then(([list, bosses]) => {
      cache = [...(list as CoordPin[]), ...bosses]
      setRows(cache)
    })
  }, [])
  return rows
}

export function matchCoords(text: string, rows: CoordPin[]) {
  const n = text.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (n.length < 3) return [] as CoordPin[]
  return rows.filter((r) => r.name.toLowerCase().includes(n)).slice(0, 12)
}
