# Task 160 — fix the Task 157 link / inference / duplicate findings

Branch `task-160`. Every FIX-LIST item was addressed. All six defect classes are
now recomputed by a committed guard (`src/lib/linkIntegrity.test.ts`) and are 0.
The remaining non-zero counts are documented exceptions with reasons.

Measurement harness (gitignored, same technique as `.scratch/157/`): loads the
runtime modules through Vite SSR with the **committed** `public/sourced/entity-index.json`
installed exactly as the app installs it. `npm run audit:*` were re-run at the end.
`.env` / `.env.local` were never opened.

## Before → after, per Task 157 summary row

| # | check | finding | 157 before | 160 after |
| --- | --- | --- | --- | --- |
| 1a | links | graph edges whose target is not an entity (dead "Related" chip) | 513 | **0** |
| 1b | links | edges resolving to the wrong kind | 112 | **0** |
| 1c | links | alias rows whose `slug` has no record | 354 | **0** |
| 1d | links | infer chains whose `whenFact` does not resolve | 31 | **0** dead (14 `mapfrag:` resolve via the collectibles plane and can fire) |
| 1e | links | build "need" ids / hosted grace id unresolved | 3 | **0** |
| 1f | links | hosted warps whose canonical slug is a dead stub (search) | 359 | **0** |
| 1f | links | engine-marker pickups resolving by neither id nor name | 9 | 9 (documented, low) |
| 2a | missing | boss/enemy drop names that resolve to no item | 149 | 106 (documented) |
| 2b | missing | merchant stock names that resolve to no item | 12 | 9 (documented) |
| 2c | missing | records with zero out-edges / zero inbound orphans | 358 / 401 | re-measured with a different kind filter (553 / 4011) — not comparable, see notes |
| 2d | missing | `record.related` labels that resolve to no entity | 606 | 152 (not rendered as links) |
| 2e | missing | regions with no `contains` edge | 245 | **188** |
| 2e | missing | boss-roster vs index drop disagreement | 44 | 70 (method differs; see notes) |
| 3a | inference | dead catalog facts | 7 | **0** |
| 3b | inference | implication cycle | 1 | **0** |
| 3c | inference | bell-bearing chains that can never fire | 17 | **0** |
| 3d | inference | boss facts whose own region is not implied | 43 | 50 (method differs; see notes) |
| 3e | inference | catalog `implies` targets with no catalog row | 6 | 8 (all resolve as graph stubs; low) |
| 4 | dead ends | empty pages | 2 | **0** |
| 4 | dead ends | dead "Related" chips (same as 1a) | 509 | **0** |
| 4 | dead ends | "Mark done" offered where tracking is refused | 1317 | **0** |
| 5a | duplicates | same name across different kinds | 288 | 271 (structural place overlaps / legitimately distinct pages) |
| 5a | duplicates | same name within one kind | 51 | **0** |
| 5b | duplicates | one alias pointing at several records | 83 | 132 (method differs; name collisions, low) |
| 5c | duplicates | repeated entries inside `drops` / `related` | 36 | 21 |
| 6a | conflicts | catalog region vs entity-index region | 68 | 67 (mostly label granularity) |
| 6b | conflicts | same boss name with different rune strings | 23 | not re-measured (formatting only, low) |

The six required guards (see `src/lib/linkIntegrity.test.ts`) are all 0:
dead Related edges, wrong-kind edges, dead search rows, unfireable infer chains,
"Mark done" without tracking, within-kind duplicate names.

## Fixes, in FIX-LIST order

### 1 — Place-name links landed on quest lines / gates (was 53 `foundIn` → 0 wrong-kind)
- `src/lib/entityGraph.ts`: catalog/loot/acquisition `foundIn` now resolve through
  `resolvePlace` (region/grace/dungeon only); the entity-index path already did.
- `src/lib/entityIndexBuild.ts`: `resolveName` gained `kindMatchesResolvePrefix`, so a
  wiki/source name index can no longer be hijacked by a same-named quest line or gate
  (`Weeping Peninsula` → `line:irina`). `NAME_PRIORITY` in `entityGraph` now ranks a
  place above a quest alias and an ownable item above a `mechanic` card.
- Example: `boss:bayle -foundIn-> line:igon` is gone; `item:dragonmaw` no longer
  "drops into" `build:dragon-communion`.

### 2 — Dead "Related" chips from ghost grace slugs (513 → 0)
- `scripts/gen-aliases.mjs`: a warp with no authored slug now maps to the index's
  existing `grace:<warpId>` record, not a synthetic `grace:{name-slug}` stub
  (354 ghost rows → 0; `unmatched warps: 0/418`). `grace-stub` rows: 0.
- `src/lib/entityGraph.ts` still skips a prose match with no entity, as a backstop.

### 3 — "Mark done" offered where tracking is refused (1317 → 0)
- `src/EntityActions.tsx` consults `trackActionLabel`/`canonicalEntityId` from
  `src/library/pageModel.ts`, the same authority the entity panel uses. Regions,
  dungeons, graces, NPCs, merchants, mechanics, builds and shared multi-location
  boss pages no longer render a tracking button.

### 4 — Bell-bearing chains never fired (17 → 0)
- `src/knowledge/inferChains.ts`: `bellBearingRule` now uses the real index ids
  (`item:kal-s-bell-bearing`, `item:rogier-s-bell-bearing`, …), verified against
  `public/sourced/entity-index.json`. `src/knowledge/setupInference.test.ts` filter
  updated to the fixed `item:` id shape (a shifted count, not a relaxed assertion).

### 5 — Drops / merchant stock landed on mechanics cards (49 edges → 0)
- `src/lib/entityGraph.ts`: `drops`/`sells`/`tradedFor`/build kit resolve through
  `resolveOwned` (ownable kinds only). `item:rune-arc`, `item:golden-seed`,
  `item:memory-stone` now win over their `mechanic` cards.

### 6 — Merchant shop stock stored as `drops` on quest lines (10 `droppedBy` → 0)
- `src/lib/entityGraph.ts`: only a `boss`/`enemy` record emits a `drops` edge, so a
  quest line or spell page that carries a scraped `drops` array (shop stock, wiki
  notes) can no longer claim an item. Example `line:patches`/`line:ymir` no longer
  "drop" their shop.

### 7 — Orphans / records with no edges / empty regions
- `src/lib/entityIndexBuild.ts`: `mergeSubLocationDuplicates()` folds a wiki
  sub-location `region:` page with no region of its own onto the same-named
  `dungeon:` record (58 merged). Regions with no `contains` edge: **245 → 188**;
  total region records 356 → 298. Macro regions (they carry their own `region`) are
  never folded.
- Remaining 188 are wiki-db location articles (churches, towers, shacks, unmarked
  spots) with no same-named dungeon and no source string that names them; see
  exceptions.

### 8 — Drop/stock names resolved to no item (149 → 106)
- `src/lib/entityIndexBuild.ts`: `cleanDropText()` normalises counts, notes, place
  prefixes and category prefixes (`3x Dragon Heart`, `Dragon Heart x5`,
  `Ash of War: Holy Ground`, `Cathedral of Manus Celes: Adula's Moonblade`,
  `Smithing Stone (7) x 5`, `Unlocks Agheel's Flame`, `Perfumer Tricia (ash)`) and
  drops rune totals / wiki placeholders. Applied at the `addDrops` chokepoint and at
  the per-encounter roster merge that previously bypassed it.
- Remaining 106 are armour "Set" names, generic plurals ("Smithing Stones",
  "Golden Runes", "Grave Glovewort"), body parts and wiki typos that name no single
  item; see exceptions.

### 9 — Same-name duplicates (within-kind 51 → 0)
- `entityIndexBuild`: `foldUnanchoredDuplicates()` (an FMG row onto its catalogue
  anchor), `foldHuntDuplicates()` (a `hunt:` checklist row onto the boss), and
  `qualifyDuplicateGraceNames()` (two real warp points sharing a name, e.g. the two
  Artist's Shacks, get a `(region)` qualifier so they stay separate but are
  distinguishable).
- `entityGraph`: a `hunt:` dungeon-index row that names an authored boss is aliased
  to the boss page (2 left at first; now **0** within-kind duplicates).
- `gen-aliases`: a folded hunt id now points at the boss record.

### 10 — Warp/alias search rows pointed at the synthetic stub (359 → 0)
- Same alias-plane fix as #2. `canonicalFactId`, `searchSync` and `relatedFor` no
  longer return ghost ids; `aliases` with a slug that is no record: 0.
- `src/knowledge/npcLocations.ts`: the NPC locator's stale name-slug grace ids were
  repointed at the real `grace:<warpId>` records (Blaidd, Alexander, Millicent, Boc,
  Hyetta, Irina, Igon). `refusedNpcLocations` now holds only the deliberate
  `grace:roundtable-hold`.

### 11 — Catalog vs index region disagreements (68 → 67)
- Not mass-rewritten: the remaining 67 are label granularity where both strings are
  true (`Stormveil` vs `Stormveil Castle`, `Raya Lucaria` vs `Academy of Raya
  Lucaria`, `Mt. Gelmir` vs `Volcano Manor`). See exceptions.

### 12 — Haligtree medallion implication cycle (1 → 0)
- `src/knowledge/catalog.ts` no longer has `item:haligtree-secret-medallion →
  region:haligtree`; the reachability conclusion moved to a one-way chain in
  `src/knowledge/inferChains.ts`. Catalog cycles now 0.

### 13 — Dead catalog facts / missing region mappings (7 → 0)
- Wired `item:sewing-needle` ← `quest:boc:needle`, `quest:fia:concluded` →
  `boss:fortissax`, and added Siofra/Ainsel to `REGION_FACT`. Dead facts 0.
- The plain Sewing Needle was renamed from the borrowed "Gold Sewing Needle" so the
  two items are distinguishable.

### 14 — Empty pages (2 → 0)
- `cleanupFmgDuplicates` drops an FMG-only row with no catalogue anchor and no real
  counterpart, so `item:fetal-position` / `npcs:147100` no longer ship a no-data
  page. The stale icon-test exception for "Fetal Position" was removed.
- Wiki pages mis-filed under "boss" by category but naming an existing NPC/overview
  (`Count Ymir`, `Dragon`) now enrich that real page instead of minting a second,
  pictureless boss page.

### 15 — Build/hosted/engine ids that resolved to nothing (3 → 0)
- `src/knowledge/builds.ts`: `build:dark-moon.need` and `build:frost-bleed.need`
  fixed; `gen-aliases` maps the hosted Prince of Death's Throne to its real record.
- The 9 low engine-marker pickup names (affinity-prefixed weapons such as
  "Fire Longsword") remain; see exceptions.

## New guard

`src/lib/linkIntegrity.test.ts` (6 tests) recomputes over the committed index:
dead Related edges, wrong-kind edges, dead warp/alias search rows, unfireable infer
chains, "Mark done" on a refused kind, and within-kind duplicate names. Each must be
0 or ≤ an explicitly named exception map (currently empty).

## Final gates (run once, all green)

| command | result |
| --- | --- |
| `npm run index:entities` | 5630 records |
| `npx vitest run` | 205 files, 1463 passed, 11 skipped |
| `npm run lint` | 0 errors |
| `npm run build` | ok (PWA precache 139 entries) |
| `npm run test:bundle` | 7 passed |
| `npm run audit:links` | dead data 0, dead renderer 0, guard violations 0 |
| `npm run audit:inference` | 562 rules, 17 scenario facts |
| `npm run audit:pages` | 5634 entities, 0 flagged |
| `npm run audit:progress` | 6 scenarios pass |
| `npm run coverage:entities` | all guard minimums met |

## Remaining exceptions and why

- **106 unresolved drop names** — armour "Set" names (no single item), generic
  plurals ("Smithing Stones", "Golden Runes"), body parts and wiki typos
  ("Death' Poker", "Sacrifical Axe"). None names one ownable item, so no honest edge
  exists; they stay as display text, not links.
- **9 unresolved merchant stock names** — wiki shop-table artefacts (`Surge`,
  `Flame` torn from "…Prayerbook", `Thioller's Garb (Altered)`).
- **188 regions with no `contains` edge** — wiki-db location articles (churches,
  towers, shacks, "Unmarked") with no same-named dungeon and no entity whose
  `location` names them. Linking them would invent a containment that is not in the
  data.
- **271 cross-kind same-name pages** — structural place overlaps (a grace and a
  region share a name) and genuinely distinct things (a `build:` and its signature
  `item:`). They are distinguishable by kind in the Library; not merged.
- **67 catalog/index region labels** — granularity, both correct.
- **9 engine-marker pickups** — affinity-prefixed weapon names in the vendored map
  data; low severity and only surfaced in a Gideon tool lookup.

## ASSUMPTIONS

- A `hunt:` checklist row naming the same fight as an authored boss is the same
  entity; it is folded onto the boss and the engine id is aliased, not deleted.
- Two graces that genuinely share a name (different warp points) are kept separate
  and given a `(region)` display qualifier; a region and a dungeon with the same
  name are the same place and are merged.
- A wiki "boss" page whose title already names an NPC/overview page is that page
  mis-categorised, not a second boss.
- Dropping a name-only FMG row with no catalogue anchor (an empty page) is the
  #14 fix, not "deleting data to lower a count".
- Rune-format inconsistency (2e/6b) and catalogue-vs-index label granularity (6a)
  are presentation, not link defects, and were left to avoid churning correct data.
- The `record.related` count uses the committed index's `related` arrays; they are
  not rendered as links, so this is data quality only.
- `aliasMultiSlug` / `rosterDisagree` / `bossRegionGap` after-numbers use a stricter
  method than Task 157, so the before/after is indicative, not byte-identical.

## Not done / why

- The 9 engine-marker pickup aliases were not added: they are affinity-prefixed
  name variants in vendored map data, used only by a Gideon item lookup, and mapping
  each to a base weapon would be a guess.
- Rune-string formatting and catalogue/index region label granularity were not
  normalised (low, both strings valid).
- No build data (`build:*` records) or Gideon code was touched.

## Completion checklist

- [x] FIX 1 — place-name `foundIn` links land on region/grace/dungeon (wrong-kind edges 112 → 0)
- [x] FIX 2 — dead "Related" chips from ghost grace slugs (513 → 0)
- [x] FIX 3 — "Mark done" only where the page model tracks (1317 → 0)
- [x] FIX 4 — bell-bearing infer chains fire (17 → 0 dead)
- [x] FIX 5 — drops/stock land on real items, not mechanics cards (49 → 0)
- [x] FIX 6 — no shop stock as `drops` on quest lines (10 → 0)
- [x] FIX 7 — empty regions / orphans: sub-location region duplicates merged (245 → 188 regions without contents; remainder documented)
- [x] FIX 8 — drop/stock normalisation (149 → 106; remainder documented)
- [x] FIX 9 — same-name duplicates: within-kind 51 → 0; cross-kind documented
- [x] FIX 10 — alias plane canonical slugs real (354/359 → 0); NPC locator ids repointed
- [x] FIX 11 — region conflicts reduced and remaining documented (68 → 67)
- [x] FIX 12 — Haligtree implication cycle removed (1 → 0)
- [x] FIX 13 — dead catalog facts wired/dropped (7 → 0)
- [x] FIX 14 — empty pages removed (2 → 0)
- [x] FIX 15 — build need ids + hosted grace fixed (3 → 0); 9 low engine pickups documented
- [x] Added `src/lib/linkIntegrity.test.ts` with the six recomputed guards
- [x] Ran the full gates once: index:entities, vitest, lint, build, test:bundle, audit:links, audit:inference, audit:pages, audit:progress, coverage:entities
- [x] Wrote `docs/tasks/160-report.md` (this file) with before/after, examples, exceptions and ASSUMPTIONS

ALL ITEMS DONE
