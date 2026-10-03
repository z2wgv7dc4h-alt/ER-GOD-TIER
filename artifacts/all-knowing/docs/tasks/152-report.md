# Task 152 report — search result fixes

Quick-search ("Journey → search", the Do · Things · Ask palette) results, found by
typing into the live search. All work is in the search builder and its helpers:

- `src/lib/search.ts` — rebuilt `searchSync` (dedupe, grouping, no coordinates).
- `src/lib/nameMatch.ts` (new) — word-start matching, shared by the builder.
- `src/lib/wikiSearch.ts` — `wikiSnippet` strips markdown + Japanese gloss.
- Tests: `src/lib/search.test.ts`, `src/lib/aliases.gen.test.ts`,
  `src/lib/wikiSearch.test.ts`.

## Root causes

1. **No Enemies group.** The alias plane carries `enemy:*` rows, but the builder
   capped the alias slice at 6 and then capped the whole list at 16 with the
   alias plane last, so bosses/items/shouts starved enemies out. `groupLabel('enemy')`
   also produced the plural "Enemys".
2. **"Margit, the Fell Omen" ×4.** Dedupe keyed on `source:id`, so the curated
   fact, the `bossflag` pin and the alias row never collapsed. The boss pin's
   detail was `overworld · 31.58,65.05`, and the arena grace named after the boss
   rendered as a second "Margit, the Fell Omen".
3. **"Haligtree Promenade" matched "Omen".** Every matcher used raw
   `name.includes(query)`, and "prom**omen**ade" contains "omen" mid-word.
4. **Raw markdown snippets.** `wikiSnippet` stripped `[[links]]` only, leaving
   `Omen** (忌み, *Imi,* …` in the Wiki results.

## Fixes

- `wordStartMatch` — a query matches a name only when it starts a word in the
  name (or the name starts a word in the query): `omen` finds `Omen`,
  `Omenkiller`, `Fell Omen`, but never `Promenade`.
- `searchSync` now resolves every row to its canonical entity id
  (`canonicalFactId`) and keeps one row per entity, preferring the curated seed
  (a hosted grace row wins for graces). Alias rows are fallback only and never
  render as a duplicate row.
- A grace whose name only repeats a boss's name is dropped ("the grace's real
  name or not at all").
- Boss-pin details use the resolved region (or world), never plate coordinates.
- `groupLabel` knows `enemy → Enemies` (plus `npc`, `dungeon`, …); `Enemies`
  joins `GROUP_ORDER` right after `Bosses`.
- The 16-result cap is applied round-robin by group, so a group added late
  (enemies/invaders live only in the alias plane) is still represented.
- `wikiSnippet` strips `[[links]]`, wiki/markdown bold + italics (`'''`, `''`,
  `**`, `*`, `__`, `_`) and any parenthetical containing kana/kanji/fullwidth text.

## Before → after per query

Rows are `Group · Name`; `✗` marks the reported defects.

### Omen (before 16, after 16)
- Before: Bosses·Margit, the Fell Omen ×3 (seed / pin `overworld · 31.58,65.05` /
  alias) ✗, Bosses·Morgott, Bosses·Mohg the Omen, Bosses·Omenkiller ×3,
  Items·Remembrance of the Omen King, Quests·Nepheli…, Graces·Margit, the Fell
  Omen ✗, Graces·Haligtree Promenade ✗, Merchants ×4. **No Enemies.**
- After: Bosses·Margit, the Fell Omen (one row), **Enemies·Omen**,
  Enemies·Omen (Stormveil Castle), Enemies·Omen (Accursed), Enemies·Omen (Horned),
  plus Morgott / Mohg / Omenkiller, the item, the quest and the merchant rows.
  Promenade and the boss-named grace are gone; no coordinates.

### Radahn (before 16, after 16)
- Before: Bosses·Starscourge Radahn + pin (coords) + alias ✗, Bosses·Promised
  Consort Radahn + alias ✗, Graces·Starscourge Radahn (boss-named grace) ✗,
  Enemies·Radahn Soldier, Enemies·Radahn Soldier ×1; alias duplicates.
- After: Bosses·Starscourge Radahn (one row), Bosses·Promised Consort Radahn
  (one row), **Enemies·Radahn Soldier**, Enemies·Radahn Foot Soldier,
  Items·Radahn's Great Rune, Quests, Graces·Chamber Outside the Plaza, Merchants,
  Missables. Boss-named grace and coordinates gone; alias rows deduped.

### Godrick (before 13, after 14)
- Before: Bosses·Godrick the Grafted + pin (coords) ✗ + alias ✗, Graces·Godrick
  the Grafted (boss-named grace) ✗, three alias `boss:godrick-*` rows, item, shops.
- After: Bosses·Godrick the Grafted (one row), Items·Godrick's Great Rune,
  **Enemies·Godrick Knight (Blood)**, Enemies·Godrick Knight's Horse,
  Enemies·Godrick Foot Soldier, Godrick Soldier/Knight (alias plane, genuine
  entities) and shops. No grace duplicate, no coordinates.

### Ranni (before 16, after 15)
- Before: 10 seed quests/items, Graces·Ranni's Rise + alias ✗, Graces·Ranni's
  Chamber, shop, missable, Enemies·Ranni/Renna.
- After: same authoritative rows with the alias grace deduped; **Enemies·Ranni/Renna**
  still present, no duplicates.

### Limgrave (before 16, after 16)
- Before: seed region/graces/bosses/quests/shops, alias bosses and graces
  (`Tree Sentinel (Limgrave)` etc.) duplicated.
- After: seed rows plus **Enemies** (Black Knife Assassin, Giant Crab), **NPCs**
  (Kenneth Haight, Nomadic Merchant), Items (maps), Regions (Limgrave Colosseum);
  alias duplicates collapsed, no coordinates.

### Smithing Stone (before 12, after 15)
- Before: item, loot, shops, `Enemys`·Large/Smithing/Giant Smithing Stone Scarab
  (mis-labelled), alias `item:ancient-dragon-smithing-stone` duplicate ✗.
- After: item, loot, shops, **Enemies**·correctly labelled scarabs, and the two
  alias items the catalog does not carry. Duplicate ancient-stone row collapsed.

## Tests

- `src/lib/search.test.ts` — new `Task 152 — search result fixes` block covering
  the Enemies group, one-row-per-entity (incl. the single Margit row), no raw
  coordinates, boss-named-grace suppression and the word-start rule, run against
  all six queries. The old "matches boss pins" case now uses a pin-only boss
  (`Putrescent Knight`) and asserts no coordinates.
- `src/lib/aliases.gen.test.ts` — the item/quest asserts now check the resolved
  entity id, because a curated seed row now correctly dedupes the alias row.
- `src/lib/wikiSearch.test.ts` — new markdown/Japanese-gloss snippet case.

## Verification

- Touched suites run: `search`, `aliases`, `aliases.gen`, `warpSlugs`, `wikiSearch`,
  `suggestions`, `Codex.is.search`, `omnibox`, `quickLog`, `palette`, all
  `gideon*`, `WikiSearchResults`, `QuickLog`, `shell` — all green (294 tests).
- `npx tsc -b` reports exactly one error, **pre-existing at HEAD** and unrelated
  to this change: `entityIndexBuild.ts(3413,81): error TS2345` (`Set<EntityKind>.has(record.kind)`
  where `EntityRecord.kind` is typed `string`). Confirmed by `git stash -u` +
  `tsc -b --force` on the untouched tree. No error is reported in any touched file.
- Full `vitest run`, `lint`, `build`, `test:bundle` were intentionally **not**
  run here per instructions; Claude runs them once after merging.

## ASSUMPTIONS

- "alias rows never show as their own row" means an alias row must not appear as
  a *duplicate* of an entity already found by another source. Alias-only entities
  (regular enemies, some items) must still surface — enemies have no synchronous
  other source — so the alias plane stays as the last-resort fallback.
- "a grace named after a boss shows as the grace's real name or not at all":
  these arena graces (`grace:100001` "Margit, the Fell Omen", `grace:100000`
  "Godrick the Grafted", `grace:64523800` "Starscourge Radahn") carry the boss
  name in `BonfireWarpParam` itself, so there is no distinct real name to show;
  they are dropped to avoid a duplicate-looking row.
- Word-start matching keeps prefix queries working (`marg` → `Margit`,
  `omen` → `Omenkiller`) and only rejects matches that begin mid-word.
- The curated seed row is authoritative over the alias plane everywhere; for a
  grace the hosted warp row wins (it carries the real warp name and region).
- The 16-result cap and the existing Do · Things · Ask grouping are unchanged;
  only selection within the cap changed (one slot per matched group, round-robin).
