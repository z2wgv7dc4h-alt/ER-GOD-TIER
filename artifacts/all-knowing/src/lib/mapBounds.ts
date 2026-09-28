/**
 * Content bounds of an extracted tile master.
 *
 * Mirrors `content_bounds()` in `vendor/elden-ring-map/tools/extract_tiles.py`,
 * which writes the same rectangle into each master in `web/tiles/manifest.json`
 * as `bounds: [left, top, right, bottom]` (master px, right/bottom exclusive).
 * The engine (`vendor/elden-ring-map/web/js/map.js`) fits the viewport to this
 * rectangle on master switch, because the M11 (Realm of Shadow – Underground)
 * master only fills a 16x10 patch of the 10496x10496 canvas — fitting the full
 * square lands the user on grey.
 */
export type Bounds = [number, number, number, number]

/** `manifest.masters[id].tiles`: zoom level -> list of `[x, y]` tiles present. */
export type TileRows = Record<string, readonly (readonly [number, number])[]>

/**
 * Bounding rectangle of the tiles present at `nativeZoom`.
 *
 * Only the native level is considered: the lower zooms are LANCZOS-downscaled
 * and pick up a faint alpha halo one tile wide, which would inflate the bounds
 * past the real content. Returns null when nothing was rendered.
 */
export function contentBounds(
  tiles: TileRows | null | undefined,
  nativeZoom: number,
  tileSize = 256,
): Bounds | null {
  const rows = tiles?.[String(nativeZoom)]
  if (!rows || rows.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of rows) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return [minX * tileSize, minY * tileSize, (maxX + 1) * tileSize, (maxY + 1) * tileSize]
}
