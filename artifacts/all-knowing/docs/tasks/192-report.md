# Task 192 — 186 review, Batch F (orphan / one-way graph data) — report

Branch `task-192`. Items **18** and **19** of `docs/tasks/186-report.md` §FIX LIST Batch F.
Files owned and touched: `src/lib/entityGraph.ts` (all edits) and `src/lib/linkIntegrity.test.ts`
(tests). `src/lib/entityIndexBuild.ts` was **not** changed — its edge/relation output is derived
only from record fields that were already read, so the copy/scrape side needed no edit. Followed
AGENTS.md: no `.env`, no server, no background process; only true edges that the data on disk
asserts were added. Five other tasks run in parallel on other batches; edits are local to
`buildIndex()` so merges stay clean. Full gates were run once at the end (see §Checks).

## What changed (before → after, with examples)

Measured by installing the committed `public/sourced/entity-index.json` into the real
`src/lib/entityGraph.ts` (5,613 graph entities), the same way `linkIntegrity.test.ts` does.

| 186 check | before | after | notes |
|---|---:|---:|---|
| regions with no `contains` edge | **130 / 296** | **83 / 296** | 47 regions gained their first contents |
| records with no edges at all ("zero out-edges") | **360** | **359** | residual are genuinely locationless |
| records with zero inbound edges (orphans) | **375** | **374** | residual are locationless items/armor (item 19) |
| `region.contents` coverage (`audit:links`) | 56.1% | **72.0%** | guard ≥ 30% |
| graph edges total | 31,529 | 32,813 | +1,288, of which 643 `foundIn` / 645 `contains`; 2 pre-existing edges re-labelled `loot` → `entity-index` (same rel+to) |

### Item 18 — wire the missing `foundIn` / `contains` edges

Root cause: a record's own `location` text names the landmark **and the region it sits in**
("Agheel Lake South", "...the Church of Pilgrimage on the Weeping Peninsula"), but the old code
matched only a single **longest place** target (any of region/grace/dungeon) and then only a
`REGION_FACT` hint. A same-named grace/dungeon also hid the region it sits in, and a broad region
won over the specific landmark in the same sentence. So the record got a `foundIn` to the site and
the region stayed empty.

Fix (`src/lib/entityGraph.ts`, `buildIndex()`):

- A region-only target list (`regionTargets`) is built from **every region entity's canonical
  name**, kept separately from `byName` so a same-named grace/dungeon cannot shadow it
  (`grace:abyssal` vs `region:abyssal-woods`). It is used only to place a record from the region
  names its own `location` asserts.
- For a record with no authoritative `region`, **every** region name the location text asserts is
  wired (`foundIn` → region), which gives the region its reverse `contains` edge. Matching is
  whole-token (`containsPhrase`), so `region:gates` cannot match "Gateside".
- Aliases are deliberately **not** used for regions: a short alias (`"altus"`) would match the
  wrong place ("Scadu Altus"). Canonical names only.
- When the record already carries a `region` field, that authoritative value wins; the
  `REGION_FACT` fallback (`Greyoll's Dragonbarrow` → `region:caelid`) is still applied.

Examples now correct:

- `item:aristocrat-garb` (`location: "Agheel Lake South"`): `foundIn → grace:61443500` **and**
  `foundIn → region:agheel-lake`; `region:agheel-lake` now `contains → item:aristocrat-garb`
  ("Agheel Lake" is a whole-token prefix of the site name).
- `item:gilded-iron-shield` ("...outside the Church of Pilgrimage on the Weeping Peninsula"):
  `region:church-of-pilgrimage` now `contains → item:gilded-iron-shield` **and** still
  `foundIn → region:weeping`.
- `item:ranni-s-dark-moon` (long prose naming Chelona's Rise, Moonfolk Ruins, Lunar Estate Ruins):
  `region:chelona-s-rise` now `contains → item:ranni-s-dark-moon`, alongside the existing
  `foundIn → region:lunar-estate-ruins`.
- `item:ailment-talisman` ("...the Gravesite Plain at the Abandoned Ailing Village"):
  `region:ailing-village` and `region:gravesite-plain` both gain contents.
- `region:gates` does **not** gain an edge from "Gate**side** Chamber".

Where the location text names a site but no region (or vice versa) only the honest side is wired.
No edge was added to move a number; a record whose location names no mapped place is left alone.

### Item 19 — records with zero out-edges

360 records (186) had no edges at all; **359** remain after item 18. Broken down by the data on
disk for the top kinds (**item 194, armor 63, weapon 27, ash 14, npc 15, talisman 17, region 4**),
they fall into:

| why no edge | n | example |
|---|---:|---|
| no `location` and no `region` at all | 150 | `item:blackflame-monk-greave` |
| only a **merchant** source, no place ("Sold by Patron…") | 30 | `item:lordsworn-s-shield` |
| only a **boss/enemy drop** source, no place ("Dropped by…") | 21 | `item:albinauric-bow` |
| cut / unobtainable content | 39 | `item:brave-s-battlewear-altered` |
| craft / alter only ("Crafted: Modify…") | 39 | `item:ansbach-s-attire-altered` |
| "Varies" / "Anywhere" / "Multiple Locations" | 6 | `item:ansbach-s-boots` |
| other non-place text (tutorial topics, "Loot", "First Floor", "Available from the start") | 74 | `item:about-bows`, `item:golden-rune-7` |

Every one names a **source** (merchant/boss/quest) or a non-place, never a mapped place; adding a
`foundIn` edge would mean inventing a location, which the brief forbids (empty beats fake). These
records are left unlinked on purpose and the player-facing "no location" copy already exists
(`src/EntityActions.tsx:41` → "No location in the data yet."). This item is therefore a data
statement, pinned by a guard test rather than a fabricated edge.

## Tests for each item

`src/lib/linkIntegrity.test.ts` — new `describe('Task 192 orphan / one-way graph guards')`:

- §18 — a location naming a landmark and its region wires both (`region:agheel-lake contains
  item:aristocrat-garb`, `region:church-of-pilgrimage contains item:gilded-iron-shield`,
  `region:chelona-s-rise contains item:ranni-s-dark-moon`).
- §18 — a short region alias cannot match a longer place name (`region:altus` never contains
  `region:scadu-altus`).
- §18 — regions with no contents `≤ 90` (was 130; now 83), printing the offenders on failure.
- §19 — a curated sample of locationless records (`item:about-bows`, `item:balled-up`,
  `item:dejection`, `item:beckon`, `item:golden-rune-7`, `item:brave-s-battlewear-altered`,
  `item:ash-of-war-swift-slash`, `region:st-trina-s-hideaway`) has no `foundIn` edge **and** its
  `location` text matches no place name in the graph — i.e. nothing was fabricated.

The pre-existing Task 160/173 guards (`foundIn` may only target a place kind; no dead edges; drop
strings resolve) still pass unchanged.

## Final check results (run once at the end)

- `npm run index:entities` — ok, **5595 records**; the working-tree output is byte-identical to the
  committed index except its embedded `generatedAt` timestamp, so the regenerated file was reverted
  (no data change; `src/lib/entityGraph.ts` is runtime, not the generator).
- `npx tsc -b` — exit 0.
- `npx vitest run` — **no assertion failures**. 2 files failed with **timeouts only**
  (`src/map/itemSources.test.ts` test timeout at 60 s; `src/lib/progressAudit.test.ts` hook timeout
  at 10 s) while four other task suites were running on the same machine (`build-entity-index.mjs`
  and a `task-188` vitest were both active). Both files pass in isolation —
  `npx vitest run src/map/itemSources.test.ts` → 7 passed (53 s) — and
  `src/map/itemSources.test.ts` imports **no** entityGraph code. No timeout was changed.
- `npm run lint` — exit 0, 0 errors / **46 warnings** (same as 186).
- `npm run build` — exit 0.
- `npm run test:bundle` — **7 passed**.
- `npm run audit:pages` — **5599 entities, 9 flagged** (same as 186), PASS.
- `npm run audit:links` — **dead data 0, dead renderer 0, guard violations 0**, PASS; the
  `region.contents` row rose 56.1% → **72.0%**. `docs/LINKS-AUDIT.md` / `docs/PAGE-AUDIT.md` are
  the regenerated gate output and are committed with this report.

## ASSUMPTIONS

- "The missing `foundIn`/`contains` edges" are those a record's own `location`/`region` text
  asserts. I matched region **canonical names** only (no aliases) to avoid a short alias matching a
  different place; the cost is that a `region` field holding a campaign label
  ("Shadow of the Erdtree") still resolves to nothing, which is honest (it is not a place).
- Whole-token region matching is used, so a region name inside a longer word (Gates/Gateside) does
  not match; the same substring tolerance the pre-existing code used for site matching is kept.
- A record's authoritative `region` field wins; location-derived region edges are skipped for those
  records, so the (sometimes wrong) scraped `location` list on multi-place boss encounters
  (e.g. `boss:nights-cavalry--caelid-highway-south` has `region: "Caelid"` but
  `location: "Bellum Highway · Liurnia of the Lakes"`) cannot add a contradicting region.
- The 2 edges whose `source` changed (`loot` → `entity-index`) are the same rel+to edges now also
  asserted by the record itself; provenance labels only.
- Item 19 is satisfied as an inspected data statement plus a guard test. Its literal "say so,
  rather than linking nothing" UI surface (`EntityPanel.tsx` "Loading location data.") is outside
  Batch F's owned files and is left to a UI batch.

## Not done, and why

- The residual **83** region-less-`contains` and **374** orphan records are the honest floor of the
  data on disk: no surviving record names those landmarks/regions, so no true edge exists (adding
  one would invent a place). They are enumerated in §Item 19 / by the measurement harness.
- `src/lib/entityIndexBuild.ts` was left untouched: its record fields already carry every location
  string the graph consumes, so no copy-side change was needed for Batch F.

## Checklist

- [x] 18. Wire the missing `foundIn`/`contains` edges from data on disk — regions with no contents
      **130 → 83 / 296** (+1,288 edges); only record-asserted region names were linked, with tests.
- [x] 19. Inspect the 360 zero-out-edge records by kind; every remaining one names a source or a
      non-place, so they are left unlinked ("no known location") rather than given an invented edge,
      pinned by a guard test.
- [x] Tests for each item (`src/lib/linkIntegrity.test.ts`, Task 192 describe).
- [x] Edits kept local to `buildIndex()`; `npx tsc -b` clean; full gates run once at the end; this
      report written with before/after numbers, assumptions and what is not done.

ALL ITEMS DONE
