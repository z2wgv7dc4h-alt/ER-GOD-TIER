import { useEffect, useState } from 'react'

/**
 * Map place names (Task 120).
 *
 * The world-map tiles carry the scroll/ribbon banner art with no glyphs; the
 * names are drawn on top from the game's `WorldMapPlaceNameParam`, resolved
 * through the PlaceName FMG. `vendor/elden-ring-map/tools/extract_place_names.py`
 * writes the generated dump and the small committed copy this module reads:
 * `public/sourced/open/map-place-names.json`.
 *
 * Coordinates are master pixels on the 10496x10496 engine frame - the same
 * space the tiles and `coords.json` use - and are exposed to the plate as
 * percentages (`px / 10496 * 100`) so the existing `at()` transform applies
 * unchanged.
 */
export type PlaceNameLabel = {
  id: string
  textId: number
  piece: number
  tier: number
  minZoom: number
  world: string
  master: string
  px: number
  py: number
  names: Record<string, string>
}

export type PlaceNameDoc = {
  generatedBy: string
  source: string
  masterPx: number
  locales: string[]
  tierMinZoom: Record<string, number>
  labels: PlaceNameLabel[]
}

export const PLACE_NAMES_URL = '/sourced/open/map-place-names.json'
export const MASTER_PX = 10496

/** The on-screen scale at which each tier starts showing (matches the extractor). */
export const TIER_MIN_ZOOM: Record<string, number> = { '0': 0, '1': 0.7, '2': 1.2, '3': 1.8 }

/** Atlas world -> the engine masters whose labels belong on its plate. */
export function worldMasters(world: string): string[] {
  switch (world) {
    case 'overworld':
      return ['M00']
    case 'underground':
      return ['M01']
    // Task 128: M11 is retired from the switchers; Shadow labels are M10 only.
    case 'shadow':
      return ['M10']
    // The Ashen Capital is the overworld frame after the Forge, so its region
    // names are the same M00 banners.
    case 'ashen':
      return ['M00']
    default:
      return []
  }
}

export function placeLabelName(label: PlaceNameLabel, lang = 'en'): string {
  return label.names?.[lang] || label.names?.en || ''
}

export function placeLabelVisible(tier: number, scale: number, minZoom = TIER_MIN_ZOOM): boolean {
  const floor = minZoom[String(tier)]
  return scale + 1e-9 >= (floor === undefined ? 0 : floor)
}

export function placeLabelFontSize(tier: number, scale: number): number {
  const base = tier === 0 ? 17 : 13
  return Math.round(Math.max(11, Math.min(34, base * (0.65 + scale))))
}

export type PlateLabel = { id: string; name: string; x: number; y: number; tier: number }

/** Labels for one Atlas world, as plate percentages (0..100). */
export function placeLabelsForWorld(doc: PlaceNameDoc | null, world: string, lang = 'en'): PlateLabel[] {
  if (!doc) return []
  const masters = new Set(worldMasters(world))
  const out: PlateLabel[] = []
  for (const l of doc.labels) {
    if (!masters.has(l.master)) continue
    const name = placeLabelName(l, lang)
    if (!name) continue
    out.push({
      id: l.id,
      name,
      x: (l.px / MASTER_PX) * 100,
      y: (l.py / MASTER_PX) * 100,
      tier: l.tier,
    })
  }
  return out
}

let cache: PlaceNameDoc | null = null

export function usePlaceNames(): PlaceNameDoc | null {
  const [doc, setDoc] = useState<PlaceNameDoc | null>(cache)
  useEffect(() => {
    if (cache) return
    let live = true
    // Defer the call into a microtask: a relative URL makes Node's fetch throw
    // synchronously, and that must surface as a caught rejection (no labels is
    // a valid state) rather than a render-crashing throw inside useEffect.
    Promise.resolve()
      .then(() => fetch(PLACE_NAMES_URL))
      .then((r) => r.json() as Promise<PlaceNameDoc>)
      .then((d) => {
        cache = d
        if (live) setDoc(d)
      })
      .catch(() => { /* no labels is a valid state (fresh checkout) */ })
    return () => { live = false }
  }, [])
  return doc
}
