import type { TileRows } from './mapBounds'

/**
 * Task 128 — map-master visibility and SotE-underground routing.
 *
 * The engine's switcher (`vendor/elden-ring-map/web/js/app.js`) shows the four
 * masters in `manifest.json`. M11 ("Realm of Shadow — Underground") is a
 * partial patch that no projection maps pins onto, so it is retired: the tile
 * extractor marks it `hidden: true`, the switcher skips hidden masters, and any
 * stored preference pointing at one falls back to M10. These pure helpers are
 * the tested statement of that rule (the engine keeps its own DOM-side copy).
 */
export const MASTER_ORDER = ['M00', 'M01', 'M10', 'M11'] as const

export type MasterInfo = {
  hidden?: boolean
  tiles?: TileRows
  [key: string]: unknown
}

export type MasterMap = Record<string, MasterInfo | undefined> | null | undefined

export function masterIsHidden(master: MasterInfo | null | undefined): boolean {
  return !master || master.hidden === true
}

/** The masters a switcher may list, in order, skipping hidden/absent ones. */
export function visibleMasterIds(masters: MasterMap, order: readonly string[] = MASTER_ORDER): string[] {
  if (!masters) return []
  return order.filter((id) => !masterIsHidden(masters[id]))
}

/**
 * Resolve a stored master preference. A preference that is missing, hidden or
 * retired (M11) falls back to `fallback` (M10), then to the first visible
 * master. Returns null when the manifest has nothing to show.
 */
export function resolveMasterPreference(
  preferred: string | null | undefined,
  masters: MasterMap,
  fallback = 'M10',
): string | null {
  if (preferred && !masterIsHidden(masters?.[preferred])) return preferred
  if (masters && !masterIsHidden(masters[fallback])) return fallback
  return visibleMasterIds(masters)[0] ?? null
}

/**
 * SotE map areas that are underground and have no map screen of their own:
 * Stone Coffin Fissure (22), Finger Birthing Grounds (25) and the catacombs,
 * gaols, ruined forges and caves (40-43). They are pinned to the Shadow surface
 * master (M10) at their surface entrance and labelled with the badge below.
 */
export const SOTE_UNDERGROUND_AREAS = new Set([22, 25, 40, 41, 42, 43])

export const UNDERGROUND_BADGE = '· underground'

/** `"Stone Coffin Fissure"` -> `"Stone Coffin Fissure · underground"`. */
export function withUndergroundBadge(name: string, area: number): string {
  return SOTE_UNDERGROUND_AREAS.has(area) && !name.includes(UNDERGROUND_BADGE)
    ? `${name} ${UNDERGROUND_BADGE}`
    : name
}
