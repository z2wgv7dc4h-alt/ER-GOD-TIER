# Task 120 — Place names on the map (the empty scroll banners)

The map tiles contain the scroll/ribbon banner art but no text; in-game the names ("Stormhill", "Limgrave",
"Weeping Peninsula", "Mistwood", "Lake of Rot"…) are drawn on top from `WorldMapPlaceNameParam` + the
PlaceName FMG. We never extracted them, so the map shows blank ribbons with faint glyph ghosts.

1. **Extractor** `vendor/elden-ring-map/tools/extract_place_names.py` using the existing `erlib`
   (`erlib.gamepath.require_game_dir`, the regulation/param readers and paramdefs in `data/paramdefs`, the FMG
   reader used for items/markers). Read `WorldMapPlaceNameParam` (text id, map area/grid, position, display
   level/zoom tier, disable flags / event flag if present) and resolve names from the PlaceName FMG (English;
   also the ru locale the engine already supports). Project positions to map pixels with the SAME code path the
   markers use (`server/lib/project.js` semantics / `WorldMapLegacyConvParam` for legacy dungeons). Handle all
   four worlds (overworld m60, underground, Realm of Shadow m61, shadow underground). Output
   `vendor/elden-ring-map/data/place-names.json` (generated) AND a committed copy
   `public/sourced/open/map-place-names.json` (small, derived; tiles stay uncommitted). Add it to
   `npm run map:setup`.
2. **Render** in `vendor/elden-ring-map/web/js/map.js`: draw labels on the canvas at their positions in the
   game's style — serif small-caps, light parchment ink on the banner (dark text on light ribbon, matching the
   in-game look), size scaled by zoom, with major region names (tier 0) visible when zoomed out and minor
   locations (tier 1+) appearing as you zoom in; no overlap with each other (simple collision culling by
   priority). Labels sit under pins. Respect the existing "Show labels" option (`[data-option]`, Task 59 pattern)
   and default it ON. Served through our `/engine` plugin (`vite.config.ts` must serve the new data file and
   expose it via the markers doc or a new `/engine/api/place-names`).
3. **Static plate fallback** (`src/Atlas.tsx` plate view) also draws the committed names as an overlay layer.
4. Tests: extractor output schema test (committed copy), projection sanity (Stormhill, Limgrave, Liurnia of
   the Lakes, Caelid, Leyndell, Gravesite Plain fall inside their region bounding boxes), label tier/zoom logic.

Report: counts per world and tier, 10 sample names with pixel positions, and whether the game install was
found. If the game install is not found, stop and report — do not invent coordinates.
`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
