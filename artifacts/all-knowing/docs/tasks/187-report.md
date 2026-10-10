# Task 187 — 186 review Batch A (generated-data content hygiene) — report

**Branch:** `task-187`. **Scope:** Batch A of the FIX LIST in `docs/tasks/186-report.md`
(items 1–5), file `src/lib/entityIndexBuild.ts`, with tests. The previous run committed two
WIP snapshots (`5aba4c9`, `9b16845`) that already implemented most of A1–A5 but stopped before
running the coverage gate and writing this report. This run finished the remaining work: fixed the
one gate regression A4 introduced, regenerated the generated data reproducibly, re-ran the touched
tests + `tsc`, and wrote this report. `.env` / `.env.local` were never opened; no server, preview or
background process was started.

Generated data was regenerated with the committed generators (`npm run index:entities` then
`node scripts/gen-aliases.mjs`); the alias output is byte-identical to the committed snapshot
(same SHA-1), so it is genuine generator output, not a hand edit.

---

## What changed (before = `25a4ea5` per the Task 186 report, after = this build)

`public/sourced/entity-index.json`: **5,589 records** (was 5,595; −6 = the six folded merchant
rows). `by kind`: enemy 613, item 1184, armor 751, quest 467, weapon 439, grace 417, region 295,
boss 281, spell 218, npc 188, talisman 158, ash 125, dungeon 119, spirit 80, merchant 74, shield 69,
mechanic 65, build 28, gate 10, ending 5, material 3.

### A1 — template / cut-content leaks (`entityIndexBuild.ts` `cleanProse`, `isTemplateSentence`)

Added a cut-content boilerplate detector (`CUT_BOILERPLATE`), a broken-subject lead detector
(`BROKEN_SUBJECT_LEAD`), and a lone-`<!--` strip, all folded into `isTemplateSentence`, so a
sentence that is markup or wiki cut boilerplate is dropped instead of stored.

| leak | before | after | examples (before → after) |
|---|---:|---:|---|
| raw `<!--` in player text | 5 | **0** | `enemy:giant-rat` "…cellars, and caves. `<!--`" → dropped |
| descriptions starting "The was a …" | 18 | **0** | `item:heavy-erdtree-greatshield` "The was a Greatshield that was cut from Elden Ring…" → dropped |
| "cut from Elden Ring" | 29 | **0** | `item:fringefolk-s-rune`, `item:blackflame-monk-s-seal` (cut rows) |
| "…are optional bosses…" (lost subject) | 4 | **0** | `boss:tibia-mariner*` all four now read "Tibia Mariners were skeletal boatsmen…" |
| "The s are characters in …" (blank name) | 1 | **0** | `npc:greater-potentate` "The s are characters in …" dropped |

*Assumption/limit:* four **`hunt:ghostflame-dragon*`** boss pages still contain the sentence
"Ghostflame Dragons are optional bosses in Shadow of the Erdtree. They are weak to …". That string is
**real wiki prose present on disk** (`public/sourced/open/wiki-db/boss.json`, `wiki-sections.json`,
`wiki/pages-015.json`) and has a proper subject, so it is kept (the rule only drops the *broken*
subjectless form; never invent or delete real text).

### A2 — enemy text (`entityIndexBuild.ts` `wikiLead`)

- `enemy:rat` no longer carries the **Frenzied Rat** variant prose. `wikiLead` now ranks a
  "Variant Description" heading *below* the page's own Overview/Summary, and the description is
  "Oversized rats often found in abandoned buildings, sewers, cellars, and caves." (before: "Rats
  afflicted by the Flame of Frenzy, capable of inflicting Madness.").
- 83 un-notable enemies (Catapult, Clouded Mirror Stand, Elder Albinauric…) stay **empty** rather
  than carry a cross-page/invented line ("empty beats fake"); described ratio is **530/613 = 86.5%**
  (guard floor 85%).

### A3 — merchant kind (`entityIndexBuild.ts` `fixMerchantCards`, called after all sources land)

- The **6 non-merchants are gone from the merchant kind**: `Alteration` & `Reversion` (the alteration
  menu) are dropped; `Dragon Communion` folds onto `region:cathedral-of-dragon-communion`; `D Hunter
  of the Dead`, `Sorcerer Rogier`, `Pidia, Carian Servant` fold onto their `npc:*` records. Merchant
  records **80 → 74**.
- Location-less merchant cards: **49 → 0** (each names its own place "… – <place>", or inherits a
  place from the character/region it shares a name with, or is dropped when genuinely empty).

### A4 — category text in `location` (`entityIndexBuild.ts` final location loop + `isCategoryPlace`)

A category/map label is no longer written into `location`; it is replaced by the parent region or a
place named in the record's own prose, else blanked. Offending records **19 → 0**:

| before | after |
|---|---|
| `region:altus` = "The Lands Between" | "Altus" |
| `region:bellum-highway` = "Sub-region" | "Liurnia of the Lakes" |
| `region:consecrated-snowfield` = "Sub-region" | "Mountaintops of the Giants" |
| `region:swamp-of-aeonia` = "Sub-Region" | "Caelid" |
| `npc:twinbird` = "Unknown" | *(blank)* |
| `npc:palm-reader` = "Multiple Locations" | *(blank)* |
| `invader:ensha` / `invader:mad-tongue-alberich` = "Proving Grounds" | "Roundtable" |

### A5 — "N beats" descriptions (`entityIndexBuild.ts` final summary fallback)

The graph-summary fallback now refuses a summary that is only a beat count (`/^\d+\s+beats?$/i`).
`line:*` quest and `ending` "N beats" descriptions **38 → 0**; those pages are now honestly empty
(or carry real summary prose where the graph had it), never a fake count.

---

## Regression found and fixed

A4 legitimately removed the category label that was the *only* `location` on three world/gameplay
region pages (`region:lands-between`, `region:sea-of-fog`, `region:sites-of-grace`); `enrichRegions`
had defaulted them to `"The Lands Between"`, which is exactly the value A4 bans. Region
`description + location` coverage fell **96.0% → 94.8%**, failing the `entityCoverage` region guard
(95). Per AGENTS ("if a count legitimately changed, update that number only and say so"), the region
guard floor in `src/lib/entityCoverage.ts` is lowered **95 → 94** with a comment citing §A4. This is
the only test number changed; no test was skipped or deleted.

---

## Final checks (touched tests + `tsc`)

| check | result |
|---|---|
| `npm run index:entities` | 5589 records, 4280 KiB |
| `node scripts/gen-aliases.mjs` | 7231 alias rows; legacy ids 987 mapped / 211 exceptions; output byte-identical to committed snapshot |
| `npx vitest run src/lib/entityIndexQuality.test.ts` | **35 passed, 1 skipped** (wiki-DB fixture absent in this worktree) |
| `npx vitest run` on the 11 index-reading tests (auditFixes, bossRoster, entityCoverage, extraImages, gameNames, icons, linkIntegrity, linksAudit, progressAudit, task182Gaps, entityIndexQuality) | **130 passed, 1 skipped** |
| `npx tsc -b` | exit 0 |

Per AGENTS the full suite / lint / build / audits are the supervisor's single run; they were not run
here. `npm run index:entities` was run because the change affects generated data.

---

## ASSUMPTIONS

- **"The Lands Between" in a region's `location`:** treated as a category (per the 186 report) and
  stripped, even though it is the honest world name for the top-level region pages. That is what
  forced the 95→94 guard floor change above.
- **The 4 `hunt:ghostflame-dragon*` "optional bosses" sentences are kept** — they are real wiki prose
  with a real subject, not the broken-subject leak A1 targets.
- **Merchant inventory/shop sub-rows** (`"X - <place>"`) inherit the base vendor's place; a merchant
  with no field at all is deleted, matching "give the 49 location-less merchants a place or drop the
  empty card".
- **Alias regeneration is part of A3's ripple:** folding the six merchant ids changes legacy-id
  resolution, so `public/sourced/aliases.json` / `src/data/aliases.json` /
  `src/data/legacy-alias-exceptions.json` were regenerated by `scripts/gen-aliases.mjs` (4 new
  exceptions for the folded ids). These are generated outputs, not hand edits.
- **Region `location` values are derived, not curated:** A4 fills a stripped category from
  `record.region` or a place named in the record's own on-disk prose. For a few parent-less region
  pages this is imperfect — e.g. `region:academy-of-raya-lucaria` / `region:jagged-peak` end up with
  their own name, and `region:roundtable-hold` picks "Liurnia of the Lakes" from a sentence about
  where its invitation drops. Every value comes from disk (no invention), but these are cosmetic
  imprecisions a later polish could refine; item 4 only required that no *category* label remain.
- **Previous WIP `entityIndexBuild.ts` edits were kept as-is** (they implement A1–A5); this run only
  added the gate fix, the regeneration and this report.

## Not done (and why)

- Nothing from Batch A is outstanding. Items outside Batch A (grace/quest/region description
  back-fill, coordinate clamping, name-table aliases, UI/doc strings, perf, graph orphans) belong to
  Batches B–G and other parallel tasks, and were deliberately not touched.

## Item checklist

- [x] 1. Kill the template/cut leaks: raw `<!--` 5→0, "The was a …" 18→0, "cut from Elden Ring"
      29→0, subjectless "are optional bosses…" 4→0, "The s are …" 1→0 (real-subject wiki text kept).
- [x] 2. Enemy text: `enemy:rat` frenzied prose replaced; 83 un-notable enemies stay honestly empty;
      described ratio 86.5% (≥85% guard).
- [x] 3. Merchant kind: 6 non-merchants folded onto their real entities; merchant 80→74; zero
      merchant cards with neither location nor region (was 49).
- [x] 4. No category label stored in `location` (19→0); replaced with a real parent place or blanked.
- [x] 5. "N beats" descriptions replaced with real text or nothing (38→0).
- [x] Tests for each item added to `src/lib/entityIndexQuality.test.ts` (§A1–§A5); touched tests and
      `npx tsc -b` pass; generated data regenerated with the committed generators.

ALL ITEMS DONE
