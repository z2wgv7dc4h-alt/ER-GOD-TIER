# Task 135 — Read the world map from a phone photo (graces discovered + map fragments)

Fixtures (phone photos of a TV): `src/lib/__fixtures__/ps5/map-overworld-01.jpg` (south: Limgrave, Weeping,
Liurnia, Caelid), `map-overworld-north-01.jpg` (Altus, Leyndell, Gelmir, Mountaintops), `map-underground-01.jpg`
(Ainsel + Siofra). Ground truth in `ground-truth.json`. Task 134 showed OCR/icon identification of small cells fails
on these photos; the map works from **geometry**, which is robust.

1. **Reference maps**: build downscaled reference images for M00 (overworld) and M01 (underground) from the local
   tile pyramid (`vendor/elden-ring-map/web/tiles`, gitignored — read from the main checkout; fall back to the
   committed static plates in `public/sourced/maps/`), at 2–3 resolutions, plus precomputed keypoints
   (committed as a small JSON so the app doesn't recompute).
2. **Registration** (pure TS, no deps): detect keypoints + descriptors (ORB-like FAST+BRIEF on grayscale, or
   gradient-orientation histograms), match against the reference (ratio test), RANSAC homography. Detect which world
   (overworld vs underground — underground photos have the darkened overlay + "Show above ground" hint) and which
   region is in frame. Report reprojection error; reject if too high.
3. **Grace icons**: detect the gold circular grace icons (colour thresholds + circular blob + size range scaled by
   the homography), project into map pixels, snap to the nearest known grace (entity index / `grace-xyz`) within a
   tolerance scaled to zoom; ambiguous → candidates list. Output `{graceId, confidence}`.
4. **Map fragments**: for each map-fragment region polygon (derive from fragment/region data or grace clusters),
   classify revealed (painted terrain) vs unrevealed (plain parchment / grey fog) in the registered photo.
5. **UI**: Tarnished › Setup "Map & graces" step accepts map photos: shows the photo with detected graces overlaid,
   a count ("37 graces found in Limgrave/Caelid"), confirm → `discoveredGraces` + fragments via the normal
   confirm + inference path (graces imply regions reached, etc.).
6. **Eval**: per fixture, registration succeeds with error under threshold; detected grace count within ±15% of a
   hand count you make from the photo (document your counts); ≥ 90% of snapped graces lie in the regions listed in
   ground truth; fragments classification matches `revealedRegions`. Print precision/recall.

NEVER read .env files. No dev servers, no installs. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass;
commit after each numbered section.
