# Task 167 — PS5 photo reader on the owner's real photos

Branch `task-167`. Follows `docs/tasks/167-photo-reader.md`. This report covers the
whole branch: the earlier commits (map frame/calibration, occupancy, scoring harness)
and the resumed run that finished the web set, the docs and this report.

## What changed (files)

- `scripts/photo-eval.mjs` — new scoring harness: offline OCR over
  `src/lib/__fixtures__/ps5/*` (correct/wrong/missed per field, per screen type, ms per
  photo) plus `--web` self-consistency scoring of the no-ground-truth set. Writes
  `docs/PHOTO-EVAL.md` / `docs/PHOTO-EVAL-WEB.md` with `--doc`.
- `scripts/collect-web-photos.mjs` — polite collector (DuckDuckGo image results →
  Reddit/imgur hosts, ≥2.1 s between requests, descriptive UA) for the robustness set.
- `src/lib/ps5MapGraces.ts` — plate-frame calibration, engine→plate `master` (M00/M01/M10)
  world assignment, circularity filter.
- `src/lib/ps5MapRegistration.ts`, `src/lib/ps5MapCapture.ts`, `src/lib/ps5MapFragments.ts`
  — uniform plate scale on both axes; corrected Mt. Gelmir fragment anchor.
- `src/lib/ps5Inventory.ts` — peak-anchored cell-occupancy threshold.
- `docs/PHOTO-EVAL.md`, `docs/PHOTO-EVAL-WEB.md` — generated score sheets.
- `.scratch/167/web-photos/` — the 150-photo robustness set + `index.json` (gitignored,
  never committed).

## 1. Scoring harness — `npm run eval:photos`

Runs the same WASM-Tesseract path the app and `npm run test:ocr` use, via Vite SSR (no
server, no API calls). Per photo and per field it reports `correct` / `wrong` / `missed`;
`node_modules/.tmp/photo-eval.json` holds the raw run. `--only=`, `--web` and `--doc` flags.

Field accuracy by screen type, fixture set (13 photos, after the changes below):

| screen | photos | correct | wrong | missed | field accuracy |
| --- | ---: | ---: | ---: | ---: | ---: |
| status | 1 | 21 | 0 | 0 | 100% |
| equipment | 1 | 7 | 0 | 7 | 50% |
| inventory | 6 | 22 | 6 | 1 | 76% |
| equipment-picker | 1 | 1 | 1 | 1 | 33% |
| item-crafting | 1 | 3 | 0 | 0 | 100% |
| world-map | 3 | 27 | 4 | 0 | 87% |
| **all** | **13** | **81** | **11** | **9** | **80%** |

Before this run the same harness scored **79%** (inventory 72%, equipment-picker 33%).
The task's starting point (Task 135) had the map snapping only ~20% of detected icons.

## 2. Reader tuning — causes fixed

1. **Plate coordinate frame (biggest cause).** The committed plates (4096×3880) are a
   *uniform* downscale of the 10496 engine frame, but `regionPlatePoint`, the
   `classifyFragments` anchors and `snapGraces` all used `ref.height` for y. Every known
   grace therefore sat ~5% too high and most detections missed a snap. Both axes now use
   the width scale. This alone lifted grace snapping from ~20% to ~70–80%.
2. **Engine→plate calibration.** `PLATE_FRAME_CALIBRATION` maps engine percent to plate
   percent (`platePercent = enginePercent * scale + offset`); overworld `1.09`, underground
   `1.02/2/3`. The two overworld photos agree independently, so this is plate geometry,
   not a per-photo fudge.
3. **Correct world for each grace.** Graces are now assigned via their engine `master`
   (M00 overworld / M01 underground / M10 Shadow) instead of nearest-neighbour in the
   40-row curated list, which was leaking Shadow graces into the overworld index and vice
   versa.
4. **Circularity filter.** Blobs whose outer boundary is not round (gold terrain, beaches)
   are rejected, so the snap precision stays at 1.00 on both overworld photos.
5. **Mt. Gelmir dark terrain.** The fragment anchor was on fog; it now sits on the
   volcanic terrain (derived from the game's own map pins, calibrated like the grace index),
   so Mt. Gelmir reads as revealed on the north photo.
6. **Inventory cell occupancy.** Replaced `median + 0.55·(peak−median)` (which broke when a
   page was mostly empty and dragged the median down) with a peak-anchored split
   `max(14, min(peak·0.28, 24))`.
7. **Scoring honesty (this run).** Item names are compared with the app's own normalisation,
   so a correct read printed as `Grave Glovewort (1)` is no longer scored `wrong` against
   ground truth `Grave Glovewort [1]`; the character name on a status photo is no longer
   fed to the alias-plane check (it is the player's name, not a game item).

### Map before/after (detected → snapped, purity)

| fixture | before | after |
| --- | --- | --- |
| map-overworld-01 | 55 → 11 (20%), purity – | 42 → 37 (**88%**), purity **1.00** |
| map-overworld-north-01 | 91 → 22 (24%) | 54 → 45 (**83%**), purity **1.00** |
| map-underground-01 | 24 → 4 (17%) | 17 → 13 (**76%**), purity 0.92 |

Registration inliers/error: overworld 67/2.74, north 82/2.66, underground 26/2.30. Grace
recall is above the brief's ≥70% target on all three, with no false graces on the overworld.

## 3. Web robustness set (`--web`)

`.scratch/167/web-photos/index.json`: **150** photos (42 status, 42 inventory, 34 equipment,
32 map guessed from search intent), Reddit/imgur hosts only, ≥2.1 s between fetches. Photos
are **not committed**. Scored with self-consistency checks (no ground truth). Final pass
rates per check and per guessed screen type:

| check | pass rate |
| --- | ---: |
| stats 1..99 | 53% |
| slot recognised | 50% |
| screenType detected | 45% |
| runes plausible | 28% |
| name resolves on alias plane | 20% |
| level = Σstats − 79 | 6% |
| map registration ok | 0% |

| guessed screen | photos | pass rate |
| --- | ---: | ---: |
| status | 42 | 48% |
| inventory | 42 | 34% |
| equipment | 34 | 38% |
| map | 32 | 3% |

Overall **37%** of checks passed. Commonest failure patterns, in order of impact:

- **No UI at all.** Many DDG hits are character-sliders, memes or screenshots of text, not a
  menu photo; OCR returns nothing and the photo is classified `unknown` (82/150 → screenType
  missed). This dominates the low rate and is expected for a keyword-harvested set.
- **Angled/glare photos** defeat the menu-text classifier: every map photo came back
  `unknown` because "Sites of Grace / Show Underground" never survived OCR; registration then
  never ran (0%-pass map row).
- **`level = Σstats − 79` is a heuristic**, not an identity: any character wearing
  stat-boosting talismans (e.g. Radagon's Soreseal, +20) or a Great Rune breaks it even when
  every number is read correctly. It is implemented exactly as the brief asks, so it is
  reported as a genuine failure pattern, not a reader bug.
- **Noisy item names** rarely resolve on the alias plane on the worst photos (20%), again
  dominated by non-UI images.

Before/after on the web set: the only reader-side change that touches it is the map
frame/calibration fix (category "map"); the `name resolves` check went from the status-name
misuse to item-only (corrected in this run), and the screen-type/level/runes checks are
unchanged heuristics. Web pass rates are reported once, after the fixes, because the
robustness set is used to find general failure modes, not to tune (tuning to it is forbidden).

## 4. Ground-truth completeness

All 13 fixture photos have a `ground-truth.json` entry with every legible field (status:
name/level/runes/stats/base stats/talisman; equipment: slot/item/grid counts; inventory: tab,
category, selected item, held, icon-cell count, counts; picker: selected + equipped badges;
crafting: tab/selected/icon count; maps: world, revealed/unrevealed regions). No entry needed
adding from the image. Items that cannot be verified from OCR alone and are flagged
**needs owner check**:

- `map-*.graceIconsVisible` is prose ("many (~100+)", "~16"), not a count. The harness's
  exact `detected` expectations (58 / 93 / 24) are the Task-135 hand counts, not present in
  `ground-truth.json`; keep them or replace with owner counts.
- `equipment-photo-01.gridCounts` lists 9 values but not which cell each belongs to; cell
  identity needs icon matching, so only the multiset is checkable.
- `selectedEffect` / `selectedEffectPrefix` are captured as short prefixes; the full effect
  text is not transcribed.
- `inventory-*.countsInOrder` gives per-cell values but not the per-cell icon identity.

## 5. Final checks (run once, at the end)

- `npx tsc -b` — clean.
- `npm run test:ocr` — 17 passed | 1 skipped.
- `npx vitest run` — 206 files, 1473 passed | 11 skipped.
- `npm run lint` — exit 0 (warnings only).
- `npm run build` — exit 0.
- `npm run test:bundle` — 7 passed.

## Remaining failures (not fixed)

- **Equipment stack counts**: only 2 of the 9 ground-truth counts are read; the angled photo
  plus thin white digits over stone texture defeat the digit isolation. Over-reads (e.g.
  `774`) show the run detector is picking glare columns.
- **Inventory stack counts are misaligned**: the lattice rows are offset from the true cell
  centres on several pages (key-items expects `14,5,3,2,3,11,2`, reads `8,3,4`), so correct
  digits land in the wrong cell or are dropped.
- **Inventory occupancy ±0–5 cells**: spirit 14→19, bolstering 19→23 (edge/glare cells
  counted), sorceries 15→14.
- **equipment-picker badges** (crossed-swords equipped marker) and inventory **effect text**
  are not extracted — features, not bugs; the harness records them as `missed`.
- **Map blob detection under-counts** (42/58, 54/93, 17/24), so the exposed `detected`
  check stays `wrong`; the brief's actual target (snap rate) is met. Underground purity 0.92
  (one blob may snap across the Ainsel/Siofra boundary).
- Web robustness: see §3.

## ASSUMPTIONS

- The harness's exact map `detected` targets (58/93/24) are treated as the Task-135 hand
  labels; ground-truth.json itself only says "many", so they are not independently verified.
- `level = Σstats − 79` is applied verbatim per the brief and counted as a failure when
  stat-boosting gear is worn.
- Web photos with no detectable UI are scored `unknown` (screenType missed), not discarded,
  to reflect real input.
- `.scratch/167/web-photos/` is intentionally uncommitted (gitignored).
- DuckDuckGo was used as the image source because Reddit's API is blocked from this host; the
  collector still restricts to Reddit/imgur image hosts and player-photo-looking titles.

## Checklist

- [x] Scoring harness `npm run eval:photos` (per photo/field, per screen type, ms) + `docs/PHOTO-EVAL.md`
- [x] Ground truth completeness checked; gaps listed as needs-owner-check
- [x] Reader tuning: main failure causes found and fixed (plate frame, calibration, grace world, circularity, Mt. Gelmir, occupancy), general rules only
- [x] Re-scored; before/after per screen type (79%→80% fixtures; map snap 20%→76–88%)
- [x] Map reader (Task 141): grace recall raised to ≥70% (88/83/76%), dark-terrain misread fixed
- [x] Web robustness set: 150 photos collected + `index.json`; self-consistency scoring (`--web`) + failure patterns
- [x] Tests/gates run: `test:ocr`, `tsc -b`, `vitest run`, `lint`, `build`, `test:bundle`
- [x] Report `docs/tasks/167-report.md` written

ALL ITEMS DONE
