import { byId } from '../knowledge/catalog'
import type { AtlasWorld } from '../knowledge/graces'
import { canonicalFactId } from '../lib/aliases'
import type { CoordPin } from '../lib/coords'
import { labelOf } from '../lib/links'
import { resolveEntityPin } from './pins'

/**
 * Task 155 — resolve a "Show on map" target to the layer, centre and zoom the
 * Atlas must adopt. One pure rule shared by every entry point (Journey, entity
 * pages, search, Gideon) so they cannot drift, and unit-testable without the DOM.
 *
 * A target with a grounded position (an authored grace, a coords/boss pin, or a
 * loot row's grace) is *placed*. Anything else that still names a region is a
 * *region* fallback: the UI says so rather than opening the map on nothing.
 */
export const FOCUS_ZOOM = 3.4

export type FocusPlacement = {
  kind: 'placed'
  id: string
  name: string
  layer: AtlasWorld
  center: { x: number; y: number }
  zoom: number
}

export type FocusRegion = {
  kind: 'region'
  id: string
  name: string
  region: string
  message: string
}

export type FocusPlan =
  | FocusPlacement
  | FocusRegion
  | { kind: 'none'; message: string }

export function resolveFocusTarget(
  id: string | null | undefined,
  opts: { coords?: CoordPin[]; region?: string | null } = {},
): FocusPlan {
  if (!id) return { kind: 'none', message: 'Nothing to show on the map.' }
  const fact = byId.get(id) ?? byId.get(canonicalFactId(id))
  const resolved = resolveEntityPin(id, opts.coords ?? [])
  const name = fact?.name ?? resolved?.marker.name ?? labelOf(id)

  if (resolved) {
    return {
      kind: 'placed',
      id,
      name,
      layer: resolved.world,
      center: { x: resolved.marker.x, y: resolved.marker.y },
      zoom: FOCUS_ZOOM,
    }
  }

  const region = opts.region ?? fact?.region ?? ''
  if (region) {
    return {
      kind: 'region',
      id,
      name,
      region,
      message: `No map position for ${name} — showing ${region}.`,
    }
  }
  return { kind: 'none', message: `No map position for ${name}.` }
}
