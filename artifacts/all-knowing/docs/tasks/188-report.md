# Task 188 — 186 review, Batch B — report

**Brief:** `docs/tasks/188-fix.md` — do the **Batch B** items (6–9) of the Task 186
`FIX LIST`. **Branch** `task-188`; base `25a4ea5` ("Task 186 product review report").
`.env` / `.env.local` were never opened. No server, preview or background process was
started (the index generator uses Vite in middleware mode with no port, as before).

The previous run had committed nothing on the branch (`git log` was at the 186
report, `git status` only had the brief). This run did every item.

---

## What changed (before → after, with examples)

Data is `public/sourced/entity-index.json`, regenerated with `npm run index:entities`
(5,595 records; by-kind counts unchanged). The index is build-only; the app never
runs `entityIndexBuild`.

### Item 6 — hide the empty description block on grace pages (per the brief: do not re-add place prose)

The Task 177/186 decision to drop the place-name prose from graces left 400 of 417
grace pages with a `Lore` tab that showed only the placeholder
*"No lore text in the data for this entry."* No real grace prose exists on disk (the
remainder are cross-page lore leaks like the Stormhawk text on two Stormveil graces),
so the brief's chosen path — keep the prose out, hide the block — was taken.

- `src/library/EntityPanel.tsx`: a grace with no lore/description/strategy/sections
  no longer renders the `Lore` tab (or the empty placeholder when the tab state is
  left over). A grace that genuinely has text (the 17 leak rows) keeps its tab.
- Example: `grace:elleh` (Church of Elleh) now shows only Stats / Where / Related /
  Wiki; no empty lore block.

### Item 7 — coordinates outside the 0–100 plate frame

**Before:** 187 records printed a nonsense x/y — boss 132, merchant 29, npc 24,
grace 2. Root cause: `coordFor` preferred `boss-xyz.json` (raw world-space units,
e.g. `boss:adula` `{x:101.6,y:397.3}`) over `boss-pins.json` (the real 0–100 pins),
and `map-extras.json` signed lat/lng (`Weeping Evergaol` `{x:98.3,y:-209.9}`) was
registered before the engine's own 10496-frame pins.

- Added `plateFrame(x,y)` and used it everywhere a pin is stored: `coordFor` now
  returns the first *in-frame* source (so a real `boss-pins` pin is no longer
  shadowed); `mergeGrace`, `mergeNpc` and `mergeWikiGraces.addCoord` reject
  out-of-frame rows; a central guard drops any remaining out-of-frame `record.map`.
- The two graces that fell through to the signed plane were recovered from the
  engine `markers` plane (already in the 10496 frame): `grace:61423300` →
  `{34.32, 75.82}`, `grace:62344800` → `{16.35, 39.35}`.
- **After:** **0** records outside 0–100. Grace map coverage stays **100%**
  (417/417, the coverage guard floor). Boss pins 244→234 (out-of-frame raw rows
  removed; several recovered from `boss-pins`), merchant/npc out-of-frame 0.

### Item 8 — `region: "Shadow of the Erdtree"` on 18 records

`regionFromText` maps "Realm of Shadow / Land of Shadow / Shadow of the Erdtree" to
the DLC title, which then sat in `region` (the parent-region field).

- New pass: if `region` is exactly the DLC title, replace it with a real sub-region
  from the record's own location/description, else blank it. A merged enemy's
  `"A · B · Shadow of the Erdtree"` list only loses the DLC component, keeping its
  real sub-regions (3 extra records cleaned).
- **After:** **0** records whose `region` names Shadow of the Erdtree (exact or
  substring). Example: `boss:needle-knight-leda` `Shadow of the Erdtree` →
  `Enir-Ilim` (keeps the Task 130 `locationRegion` boss floor at 100%).

### Item 9 — quest (86%) and region (87%) descriptions back-filled

- **Quest (86% → 98%, 458/467).** A `quest:` beat is an authored `storylines.ts`
  step; the graph summary is a region label, so the normal fallback left the beat
  empty once it had a location. The pass maps each step's `factId` / `factIds` /
  `grants` to its authored `detail` and fills the empty beat. Example:
  `quest:alexander:met` → *"South of Stormhill. Hit the ground. Missable if you
  never crack it, but he can still show later."*
  The 9 remaining are 8 state flags (e.g. `quest:alexander:missed-limgrave`,
  `quest:millicent-killed`, `quest:erdtree-burned`) and the one `line:ymir` label;
  they are left empty on purpose (see Assumptions).
- **Region (87% → 91%, 267/295).** Empty place pages are refilled from their own
  wiki Overview sentence in `wiki-sections.json`. Example:
  `region:carian-study-hall` → *"The Carian Study Hall is a building on the eastern
  coast of Liurnia, to the north of Jarburg."* Also `region:haligtree` and
  `region:leyndell-ashen-capital`. The 28 that remain empty have no real prose on
  disk (only definitional templates such as *"The is a Site of Grace located within
  the Lands Between."*, which are correctly rejected — empty beats fake).

### Files changed

| file | change |
|---|---|
| `src/lib/entityIndexBuild.ts` | `plateFrame` guard + `coordFor` fall-through; in-frame guards in `mergeGrace`/`mergeNpc`/`mergeWikiGraces`; engine `markers` as a grace-coord source; central map guard; `backfillDescriptionsAndRegions()` (items 8/9) |
| `src/library/EntityPanel.tsx` | hide the empty `Lore` block on graces (item 6) |
| `src/library/EntityPanel.test.tsx` | grace/non-grace lore-tab tests |
| `src/lib/task188Fixes.test.ts` | new guards for items 7/8/9 |
| `public/sourced/entity-index.json` | regenerated |

## Final check results (full gates, once)

| gate | result |
|---|---|
| `npm run index:entities` | PASS — 5,595 records, by-kind unchanged |
| `npx tsc -b` | PASS (exit 0) |
| `npx vitest run` | **222 files, 1593 passed / 11 skipped, 1 failed** |
| `npm run lint` | PASS — 0 errors / warnings only |
| `npm run build` | PASS — 77 JS + 7 CSS chunks; engine 76 files / 2.5 MB |
| `npm run test:bundle` | PASS — 7 passed |
| `npm run audit:pages` | PASS — 5,599 entities, 9 flagged (before 1,832) |
| `npm run audit:links` | PASS — dead data 0, dead renderer 0, guard violations 0 |

**The one failed test is an environment timeout, not a regression.**
`src/map/itemSources.test.ts › reports the item coverage lift…` iterates ~3,000
catalogue rows and exceeded Vitest's 60 s per-test limit (68 s) under the parallel
load of the whole run; it finished the loop and printed
`before 827/1980 (41.8%) -> after 1864/1980 (94.1%)` before the timeout fired.
Run on its own it passes: **7 passed in 44.6 s**. It touches item `resolve`/pins
only — none of this task's edited code paths. Two audit scripts also hit the known
Vite SSR `fetchModule` 60 s transport timeout
(`Error when evaluating SSR module … transport invoke timed out after 60000ms`)
on their first attempt and passed cleanly on retry; this is the same environmental
slowness behind the "Port 24678 is already in use" line, not a code problem.

Generated `docs/PAGE-AUDIT.md` / `docs/LINKS-AUDIT.md` were reverted after the runs,
as in the 186 report; only the index and the report are committed.

## ASSUMPTIONS (things the brief did not state)

1. **Item 6 = the `Lore` tab/block.** The grace body (`GraceSections`) never rendered
   a description, so the only "empty description block" on a grace page was the
   `Lore` tab and its placeholder. Hiding that tab on a description-less grace is the
   change; the 17 graces that still carry text keep their tab.
2. **Out-of-frame coordinates are dropped, not clamped.** Clamping a raw world-space
   pin to the plate edge would place a wrong dot; dropping it is the honest reading
   of "cannot print a nonsense x/y". The 2 graces whose pins were lost this way were
   recovered from a real in-frame source so the grace map floor stays 100%.
3. **The engine `markers` plane is a legitimate pin source.** The dead `graces` loop
   was extended to the `markers` plane (also 10496-frame) so POI graces the
   checklist omits get a real pin.
4. **Item 9 quest prose = the authored `storylines.ts` step `detail`.** The 186
   report said "wiki-db prose"; for a `quest:` beat the wiki step matching already
   ran (`npc-quests.json`) and these beats had none. The step's own authored detail
   is the real, on-disk prose for that beat, so it is used. Region prose is the wiki
   Overview from `wiki-sections.json`.
5. **Quest `grants` are mapped, `lockouts` are not.** A granted state flag describes
   the step that reaches it; a lockout flag (e.g. "missed", "killed") would be
   misdescribed by the granting step's positive-action text, so those stay empty.
6. **The 3 enemy `region` strings that merely *contain* the DLC title** were treated
   as in scope for item 8 (only the DLC component was stripped, real sub-regions
   kept), which is stricter than the report's exact-match count of 18.

## Not done / out of scope

- The **`line:` "N beats" descriptions and the 17 cross-page grace lore leaks**
  (Stormhawk text on `grace:100004`/`grace:100008`, etc.) belong to **Batch A**
  (items 1–2/5) and were deliberately left for that task; item 6 is only the empty
  block.
- No grace "real prose" was invented (none exists on disk — see item 6). The 28
  region empties with only definitional wiki templates stay empty.
- Gideon code, builds, generated index/alias files were not hand-edited; the index
  was regenerated by the generator only.

## Item checklist

- [x] 6. Grace empty description block hidden on grace pages; place prose not
      re-added; test added (`EntityPanel.test.tsx`).
- [x] 7. 187 out-of-frame coords → 0; every stored `map` inside 0–100; grace map
      floor stays 100%; tests added (`task188Fixes.test.ts`).
- [x] 8. 18 `region: "Shadow of the Erdtree"` → 0 (real sub-region or blank; 3 lists
      cleaned too); test added.
- [x] 9. Quest descriptions 86% → 98%; region 87% → 91%; back-filled from on-disk
      prose only; tests added.
- [x] Tests for each item (new `src/lib/task188Fixes.test.ts`, `EntityPanel.test.tsx`).
- [x] Index regenerated; touched tests + `npx tsc -b` green while working.
- [x] Full gates run once at the end; results recorded above, including the one
      environmental test timeout with its isolated pass.
- [x] Report written with before/after numbers, examples, assumptions, not-done.
- [x] Committed on `task-188` (`d521c1d` code+tests, `791a511` regenerated index).

ALL ITEMS DONE
