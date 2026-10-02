# Task 146 — report

Branch `task-146`, worktree `artifacts/all-knowing`. No `.env`/`.env.local` read. No
dev servers, no `npm install`, no push.

## 0. Merge Task 145

Already merged by the previous run: `7b6fa4b Merge task-145 into task-146` (branches
touched only `docs/tasks/145-*`, `src/lib/enemyDrops.test.ts` and the drop pipeline).
This run continued from the uncommitted work it left: `src/data/game-name-aliases.json`,
`scripts/gen-aliases.mjs`, and the regenerated `aliases.json` (both copies).

## 1. In-game names restored (145/145)

`docs/tasks/146-unresolved-names.json` holds **145** verbatim FMG spellings (60 enemy,
39 npc, 46 region; **120 unique** names). All 145 now resolve through `canonicalFactId`
to an existing index record — **0 unresolved**. New test
`src/lib/gameNames.test.ts` asserts every one, plus the four restored items.

- The previous run's `src/data/game-name-aliases.json` maps each game spelling to its
  record; `scripts/gen-aliases.mjs` folds it into the alias plane. One fix was needed:
  a game spelling that also existed as a wiki-redirect alias on another row made
  `canonicalFactId` ambiguous ("Promised Consort Radahn" also alias of the Starscourge
  Radahn grace; "Ulcerated Tree Spirit (Boss)" also alias of the Fringefolk encounter).
  `gen-aliases.mjs` now strips the verbatim in-game spelling from every *other* row
  before attaching it, so each game name names exactly one record.
- **44 region records created** (`seedGamePlaceRegions` in `entityIndexBuild.ts`) for the
  place names the index never built. The other 2 region spellings point at records that
  already exist: `Giants' Gravepost` → `grace:beside-forge`, `Stargazers' Ruins` →
  `region:stargazer-s-ruins`. Parent regions come from the repo's own
  `map-points.json` (`<region> - <place>`), the Fextralife `guide/regions/*` routes, or
  `regionFromText`; the mapping is committed as `src/data/game-place-regions.json`.
  13 of them also get map coords from the engine's own pins (`engine-markers.json`).
  No description/text is invented.

## 2. Missing items added

`seedGameItems` in `entityIndexBuild.ts`, descriptions from the game's own FMG `info`
line:

- `item:twinned-armor` — base **Twinned Armor** (ProtectorName 600100). The index had
  folded it onto the altered row; the altered record is now re-homed at
  `item:twinned-armor-altered` (ProtectorName 601100), matching the greaves/robe
  base+`-altered` siblings.
- `item:gold-sewing-needle` — Gold Sewing Needle (GoodsName 8162), separate from the
  plain `item:sewing-needle` (8161) it was conflated with.
- `item:pest-thread-spears` — the DLC incantation **Pest-Thread Spears** (GoodsName
  2007210, kind `spell`); the base-game "Pest Threads" checklist row it shared an id
  with is now `item:pest-threads`.
- `item:perfumer-tricia` — the spirit summon (GoodsName 217000, kind `spirit`), separate
  from `boss:perfumer-tricia`; the boss's mis-attached summon line was removed.

`gameNames.test.ts` asserts each id, its name and its kind.

## 3. Merchant lines / quest pictures restored

- `restoreMerchantQuotes` gives each named merchant its real checklist quote again when
  its record lost it (the `<npc> - <stock>` vendor rows never matched the NPC row):
  **38 restored** — Enia (all stock variants), Miriel, Brother Corhyn, Preceptor Seluvis,
  Gowry, Patches, Knight Bernahl, Sorcerer Rogier, Blackguard Big Boggart, Pidia.
  Placeholder lines ("Insert NPC quote here.", "…") are dropped, never restored; template
  junk ("X is a merchant NPC in Elden Ring.") is **not** reapplied.
- `restoreLineImages` gives every `line:*` quest page its NPC picture from the repo
  image index, by the line's name or an alias (an ending like "Age of Order" is pictured
  by its NPC, Goldmask). **27 restored** — a superset of the 19 that existed at `de80111`
  because aliases now cover the remaining lines with a real, shipped image.

All three run inside `entityIndexBuild.ts` from source data; the generated index is not
hand-edited.

## 4. Final numbers

- `npm run index:entities` — 6355 records (was 6307; +44 regions, +1 armor, +1 item, +1
  spell, +1 spirit). region 355, armor 751, item 1188, spell 218, spirit 80.
- `npm run audit:pages` — 5 flagged, all pre-existing and unchanged: `item:fetal-position`,
  `item:let-us-go-together`, `item:may-the-best-win`, `item:ring-of-miquella`,
  `npcs:147100` (all `empty`). region pages flagged 0.
- `npm run audit:links` — dead data 0, dead renderer 0, guard violations 0.
- `npx vitest run` — **197 files passed, 1402 passed / 11 skipped**.
- `npm run lint` — exit 0 (41 warnings, none in the changed files).
- `npm run build` — success.
- `npx tsc -b` — clean.

## ASSUMPTIONS

- The merge (step 0) was already committed by the prior run; I verified it and did not
  re-merge.
- Region record ids are taken verbatim from `game-name-aliases.json` (the slug the alias
  plane mints) so the alias and the record always agree.
- `src/data/game-place-regions.json` is new. It gives the parent region for each of the
  46 region spelling; sources are `map-points.json` region prefixes, the guide region the
  name appears in, or `regionFromText`. Where no source named one, the parent is the
  major region the place sits in (e.g. *Drake Graveyard* → Charo's Hidden Grave,
  *Darkroad Sanctuary* → Scadu Altus, *Tenebrae Demesne* → Enir-Ilim) — these are the
  three least certain and are flagged here.
- Map coords are only written when `engine-markers.json` has an exact-name pin, and only
  as `x/y` + `world`, never an invented position.
- Merchant quotes are applied to every stock variant of a named NPC vendor, not only the
  two/three rows `de80111` happened to carry; this is the same real NPC line and avoids a
  null description on its other stalls.
- `line:*` images use the repo's local `/sourced/images/**` conversion of the fanapis NPC
  picture; more lines get a picture than at `de80111`, but each is the correct NPC image.
- Placeholder merchant lines are removed; existing non-placeholder, non-quote
  descriptions are left untouched.

## Not done

- Nothing from the brief was skipped. No build/Gideon/boss-roster logic touched; no test
  loosened or deleted.
