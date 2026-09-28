# Task 141 — Map photo reader: raise grace recall, fix Mt. Gelmir

Task 135's reader registers photos to 2–3 px but snaps only ~20% of detected gold icons to named graces
(map-overworld-01: 55 detected → 11 snapped; north: 91 → 22; underground: 24 → 4), and misclassifies Mt. Gelmir
(dark terrain) as unrevealed. Fixtures + ground truth: `src/lib/__fixtures__/ps5/`. Code: `src/lib/ps5Map*`.

1. Diagnose why detected blobs don't snap: plot (to `.scratch/`) each detected blob projected onto the map vs the
   nearest grace — tolerance too tight? wrong coordinate frame for some graces (legacy dungeons / conv param)? blob is
   a non-grace gold icon (dungeon/catacomb/merchant markers)? Classify every unsnapped blob.
2. Fix: correct coordinate frames, adaptive tolerance by local grace density, and reject non-grace icons by shape
   (grace = circular emblem vs building/door icons). Use the full grace set incl. legacy-dungeon interiors shown on the
   overworld. Target: ≥ 80% of true grace icons snapped with ≥ 95% precision on each fixture (document your hand
   labels of which blobs are graces).
3. Mt. Gelmir: classify revealed vs unrevealed with texture/detail (edge density, painted strokes) rather than
   saturation alone; test it on the north fixture.

NEVER read .env files. No dev servers, no installs. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass;
commit after each section. Report precision/recall per fixture before/after.
