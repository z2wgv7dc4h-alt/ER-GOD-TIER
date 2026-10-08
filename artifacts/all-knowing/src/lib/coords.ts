import { useEffect, useState } from 'react'
import type { MapMarker } from '../types'
import { loadNpcPlacements, npcCoordPins } from './npcPlacements'

/**
 * Static-plate pins.
 *
 * Three sources, all already projected into the plate's own frame:
 *   - coords.json    — er-guide lat/lng pins (graces/items), on the Pack 960
 *                      mosaic frame (percent = px / 10496).
 *   - boss-pins.json — bosses, projected with the engine's world->pixel maths.
 *   - npc-placements.json — talking NPCs; each placement already carries the
 *                      engine `px/py`, so it joins the same frame (Task 183 §1).
 *                      "Show on map" then resolves an NPC by name like any pin.
 *
 * `public/sourced/open/world-lots.json` (10k pickup XYZ rows) is still not part
 * of this seed set: it needs a per-map world->plate affine and 3k dots would
 * bury the map. Chests are their own opt-in Atlas layer, built by `chestFacts.ts`
 * and projected with that same affine (Task 183 §2). Live lot detail remains the
 * engine iframe's job. See ARCHITECTURE.md "Two map frames (do not mix)".
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
      loadNpcPlacements().then((d) => npcCoordPins(d.placements)).catch(() => []),
    ]).then(([list, bosses, npcs]) => {
      const npcPins: CoordPin[] = npcs.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        world: p.world,
        x: p.x,
        y: p.y,
        cat: p.map,
      }))
      cache = [...(list as CoordPin[]), ...bosses, ...npcPins]
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
