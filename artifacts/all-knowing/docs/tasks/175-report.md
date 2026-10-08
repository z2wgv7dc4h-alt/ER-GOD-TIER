# Task 175 — Equipment screen photos: 50% → as high as possible

Branch `task-175`. I continued the stopped run, did the remaining items, ran the gates once and wrote
this report. No `.env`/`.env.local` was read, no installs, no dev servers.

## What I did (continuing the stopped run)

The previous run had already committed the equipment fix and regenerated the fixture score sheet
(equipment 50% → 100%, all 84% → 91%), then left two notes: (a) a long `--web` re-score, (b) the owner
decision to skip it. Remaining was the report. I verified the fix, ran the full gate set once and wrote
this report.

## Why the equipment fields were missed (item 1)

Task 134/167 read each cell's stack count by OCRing a **fixed bottom-right crop** (bottom 28% × right
60% of the cell) with a column-density heuristic. On a real photo of a TV the count sits over the
cell's stone texture, the icon's line work crosses it and the panel seam glows next to it; the fixed
crop included all of that, so Tesseract saw a small 1–3 digit numeral mixed with icon strokes. Task 134
reported 6/9 counts and Task 167 scored equipment 7/14 fields (all five header fields correct, only two
counts read). The header (slot/item/affinity/upgrade/weapon type) was never the problem — the nine grid
counts were.

## The fix (item 2) — one general rule, shared by both readers

New `src/lib/ps5Counts.ts`:

- `locateCountGlyphs(region)` thresholds just below the region's **own** white level (1st percentile
  from the top, floored), labels 4-connected components, and keeps only blobs that look like solid
  digits: height 18–46% of the region, width ≤45%, fill ≥0.25, centred in the right half. It then walks
  left from the right-most digit, absorbing neighbours that share its baseline, and returns a clean
  black-on-white crop. The rules derive from **relative glyph size and fill**, so they survive the
  photo's angle, glare, moiré and scale — no per-photo constants.
- `parseCountText(text)` accepts 1–999 and rejects noise.

Both code paths now call it (no divergence):

- `ps5Capture.node.ts` (offline eval) — its ~85-line column-run heuristic was deleted; the location
  decision moved into the isolated, unit-tested module.
- `ps5Capture.ts` (browser reader) — same module.

`countRegion` was widened to the whole lower-right quadrant (x ≥ 42% cellW, y ≥ 55% cellH) so a shifted
or smaller numeral is still inside the search window; the glyph isolator, not the crop, decides what is
a digit. Both call sites amplify the isolated crop ×4 and OCR it with PSM 8 + `tessedit_char_whitelist:
'0123456789'`.

Tests: `src/lib/ps5Counts.test.ts` pins the shape rules with synthetic cells (two-digit box, large icon
blob ignored, over-tall blob ignored, flat cell → undefined, parse bounds). `ps5Capture.ocr.test.ts`
was raised from "reported" to a hard gate at **9/9** counts (Task 134 managed 6/9).

## Re-score — fixture set, before → after (item 3, fixture half)

101 field checks over the 13 fixtures. Before from committed `docs/tasks/167-report.md`; after from
regenerated `docs/PHOTO-EVAL.md`.

| screen | before (c/w/m) | before acc | after (c/w/m) | after acc |
| --- | --- | ---: | --- | ---: |
| status | 21/0/0 | 100% | 21/0/0 | 100% |
| equipment | 7/0/7 | 50% | 14/0/0 | **100%** |
| inventory (6) | 22/6/1 | 76% | 22/6/1 | 76% |
| equipment-picker | 1/1/1 | 33% | 1/1/1 | 33% |
| item-crafting | 3/0/0 | 100% | 3/0/0 | 100% |
| world-map (3) | 31/0/0 | 100% | 31/0/0 | 100% |
| **all** | **85/7/9** | **84%** | **92/7/2** | **91%** |

Nothing got worse: every other screen is identical. The equipment photo now reads all 14 fields,
including all nine grid counts (arrows 25, fire arrows 36, bolts 70/99, crimson flask 10, cerulean
flask 2, throwing knives 30, slot 23 = 1, pots 13) — the exact values in `docs/PHOTO-EVAL.md`.

## Web self-consistency set (item 3, web half)

**Not done — skipped by owner decision.** The brief's owner override says to skip the `--web` re-score
("too slow, fixture results suffice"). A `--web` run had in fact finished in the worktree during the
previous run (`.scratch/175/web-progress.txt` ends with `[eval] wrote docs/PHOTO-EVAL-WEB.md`), but per
the owner decision it is not part of this task's accepted results and was left out of git
(`docs/PHOTO-EVAL-WEB.md` restored to its committed Task 167 state).

## Final check results (gates once, at the end)

- `npm run index:entities` — 5621 records; the output was byte-identical to HEAD except the
  `generatedAt` timestamp, so the index was reverted (out of scope).
- `npx vitest run` — **217 files passed; 1528 passed, 11 skipped**.
- `npm run lint` — exit 0 (warnings only, all pre-existing).
- `npm run build` (`tsc -b` + `vite build` + engine) — exit 0.
- `npm run test:bundle` — **7 passed**.
- `npm run audit:pages` — 5625 entities, **0 flagged**.
- `npm run audit:links` — dead data **0**, dead renderer **0**, guard violations **0** (a benign
  "Port 24678 is already in use" WebSocket warning appeared from the transient Vite worker; the audit
  completed and wrote its doc).

## What changed (files)

- `src/lib/ps5Counts.ts` (new), `src/lib/ps5Counts.test.ts` (new)
- `src/lib/ps5Capture.ts`, `src/lib/ps5Capture.node.ts`, `src/lib/ps5Equipment.ts`
- `src/lib/ps5Capture.ocr.test.ts`
- `docs/PHOTO-EVAL.md` (regenerated by the harness)

## ASSUMPTIONS

- The count always sits in the lower-right of a menu cell, so the search region is the full lower-right
  quadrant (42% / 55%); this is a general UI-layout prior, not a per-photo constant.
- Digit blob filters (height 18–46% of region, fill ≥0.25, right-half centre, baseline overlap ≥0.45)
  were chosen to separate solid digits from icon line work and validated by synthetic unit tests, not
  tuned against the fixture photographs.
- PSM 8 + digit whitelist + ×4 upscale is the right OCR setup for the isolated glyph crop; both the
  browser and offline readers use it identically.
- The owner's decision to skip the web re-score overrides the web half of brief item 3.
- Regenerating `entity-index.json` / `PAGE-AUDIT.md` / `LINKS-AUDIT.md` is a gate side-effect of other
  tasks; the timestamp-only index change and the one-entity audit-doc drift were reverted to stay in
  scope.

## Not done / why

- equipment-picker stays at 33% (selected name correct; equippedBadges unread, icon-cell count off by
  one) and inventory stays at 76%. These are outside the equipment-screen fix and the brief only
  requires that nothing get worse.
- Web `--web` re-score skipped by owner decision (above).

## Checklist

- [x] Find why equipment fields are missed (fixed corner crop + Tesseract fed the icon/seam; only the 9 grid counts were wrong)
- [x] Fix with general rules, no per-photo hacks / hard-coded values (shared glyph-blob isolator in `ps5Counts.ts`)
- [x] Re-score the fixture set and report before/after per screen; nothing else got worse (equipment 50% → 100%, all 84% → 91%)
- [ ] Web self-consistency re-score — not done — skipped by owner decision
- [x] Gates once at the end: `index:entities`, `vitest run`, `lint`, `build`, `test:bundle`, `audit:pages`, `audit:links` all green

ALL ITEMS DONE
