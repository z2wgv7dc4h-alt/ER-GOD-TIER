# Task 129 — Forensics: why the Shadow underground (M11) map extracts as a small fogged patch

Symptom: M11 renders a small rocky patch plus a black polygon (looks like the game's unexplored fog) on grey.
Hypothesis: the world-map tiles have multiple variants per cell (revealed by map fragment / unrevealed fog /
per-mask-bit states) and `extract_tiles.py`'s variant rule picks the wrong one for M11 — or M11 cells live in a
different archive/bnd (DLC `.bdt`/`.bhd`, `dlc01`) than the extractor scans.

Investigate with the real game install (`erlib.gamepath.require_game_dir`), read-only on the game:
1. Enumerate EVERY world-map tile texture in all archives (base + DLC): list the names matching M11 (and M10 for
   comparison) — LOD, cell x/y, and every variant/mask suffix. Count cells per LOD per master from the archives,
   including any in DLC archives the extractor does not open. Check `71_maptile.mtmskbnd` rows for M11: what bits
   exist per cell and what they mean (map-fragment reveal flags).
2. Dump a handful of M11 raw tile variants to PNG in `.scratch/m11-forensics/` (same cell, each variant) so the
   difference (fog vs revealed) is visible; describe them.
3. Compare against M10: how the extractor picks M10 variants correctly and why M11 differs.
4. If the full revealed M11 exists: fix `extract_tiles.py` (variant selection and/or archive coverage), back up the
   current `web/tiles/M11` + `manifest.json`, re-extract M11 only, recompute `bounds`, and report tile counts and
   a zoom-0 description. Then check marker alignment by sampling tile alpha/brightness at each M11 pin
   (hit-rate), and fix the projection if needed (legacy conv / area offsets for areas 22, 25, 40–43).
5. If it truly does not exist, report the evidence exactly (names/counts), change nothing.

Write findings to `docs/M11-FORENSICS.md`. NEVER read .env files. Do not start/stop dev servers, no pip/npm
install. Commit code + doc changes (tiles are gitignored).
