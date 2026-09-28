# Task 122 — Finish the map labels/pins, cover every entity, clear leftovers

## A. Remaining map banners (blank scrolls)
Only the 9 `WorldMapPlaceNameParam` names ship. The other scroll banners (Weeping Peninsula, Stormhill, Mistwood,
Lake of Rot, Dragonbarrow, Mt. Gelmir, Leyndell, Consecrated Snowfield, Gravesite Plain, Scadu Altus, Cerulean
Coast, Jagged Peak, Abyssal Woods, …) are still blank. Derive them honestly:
1. **Find banner art** in the extracted native tiles (M00, M10, M01): detect the pale ribbon shapes (template
   match against the 9 known banner crops, or colour/shape heuristics) → banner rects in master px. Write
   `tools/find_map_banners.py`; output rect list with confidence. Must re-find the 9 known banners (test).
2. **Name each banner** from `BonfireWarpSubCategoryParam` (the warp-menu area names, e.g. "Stormhill",
   "Mistwood") + the graces in that subcategory (grace coords via the markers projection): the banner takes the
   subcategory whose grace centroid is nearest and within a sane radius; ambiguous → leave unlabeled and list it
   in the report. Never place a label where no banner art was detected.
3. Merge into `map-place-names.json` with `source: "derived-banner"` + tier 1, rendered like the others.

## B. Marker regeneration without losing pins
Task 121 fixed M11 routing in code, but a fresh `build_markers.py` produced 1106 markers vs the 2686 currently
served (the served file also includes the `map:merge` pack: NPCs, merchants, dungeons, collectibles, items,
pieces). Regenerate properly: `map:setup` marker step + `npm run map:merge`, then diff per category vs the
current file (back it up first). Counts per category must not drop except the intended M10→M11 moves. Also
fix M11 pin alignment: Task 121 found M11 marker coords don't hit M11 art — check which projection (legacy conv
vs direct) M11 areas need, verify by sampling tile alpha at pin px, and fix. Report counts per master/category
before/after and the alignment hit-rate.

## C. Every entity in the graph (tooltips everywhere)
`entityGraph` only holds a curated subset (62 weapons, 0 armor, 28 talismans, 20 spells). Register EVERY record
from `public/sourced/entity-index.json` (1516 records incl. 560 armor) and the Library catalogue as graph
entities with canonical ids, so every name in the Library/Gear/Build/Gideon gets a peek card and entity page.
Extend `entityCoverage.test.ts` minimums to the full sets (weapons ≥ 95% req+scaling+location over ALL weapons;
armor ≥ 95% negation+weight+location; etc.) and update `docs/ENTITY-COVERAGE.md`.

## D. Leftovers
1. Remove the "New here? Press ?" hint — the first-run tour replaces it.
2. PvP intro shows developer text ("See docs/research/…md") and a long paragraph: cut to one line; move sources
   into a small "Sources" disclosure with real links.
3. Library › Guides is ~30 phone screens: collapsible groups, first open; long lists paginated/"show more".
4. Engine embed on desktop/tablet widths: the 2×2 world buttons crowd "Tools" and truncate "Realm of Shadow".
   Use the compact world `<select>` (Task 93) whenever the embed viewport is < 900px, and short labels.

Acceptance: `npm run audit:ui` (dev server on :5173 running; don't start/stop it) zero issues phone+desktop;
coverage guard passes with the new minimums; report the banner list (name, px, confidence) and marker counts.
`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
