# Task 121 — "Realm of Shadow – Underground" map is empty

Selecting the fourth world (M11) shows an empty map. The extracted pyramid has only 261 tiles (the other three
masters have 2293 each) and the zoom-0 tile is a grey square with one small dark blob.

1. **Diagnose the extraction** (`vendor/elden-ring-map/tools/extract_tiles.py`, `probe_maptiles.py`, the
   `71_maptile.mtmskbnd` variant selection rule in docs/MAP-ENGINE.md). Using the game install
   (`erlib.gamepath`), list every M11 tile cell present in the archives at each LOD and which variant/mask bits
   exist. Determine whether (a) tiles are being skipped or the wrong variant chosen (fix it), or (b) the game's
   SotE underground map genuinely covers a small area. Report the evidence (cell counts per LOD from the
   archive vs extracted).
2. If tiles were missing: fix the extractor and re-extract M11 only (output goes to the gitignored
   `web/tiles/M11` in the MAIN checkout at `C:\Users\RIGGUSPIG\Desktop\ER MASTER TOOL\artifacts\all-knowing\vendor\elden-ring-map\web\tiles` — you may write ONLY that folder and its manifest entry there).
3. Either way: when switching master, fit the view to that master's **content bounds** (computed from the
   non-empty tiles, stored in the manifest as `bounds`) instead of the full 10496px square; the grey fill
   outside the content must not be what the user lands on. Apply to all four masters.
4. Markers: check which markers belong to the Shadow underground (areas m61 underground / SotE underground
   dungeons) and that they are routed to M11, not dropped or put on M10.

Report: the evidence, what was wrong, tile counts before/after, marker counts per master. Tests for the bounds
calculation. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit (tiles are
gitignored and not committed).
