# Task 148 — audit fixes + one page per enemy (report)

Worktree `artifacts/all-knowing`, branch `task-148`. Read: `docs/tasks/147-report.md`,
`docs/DATA-CATALOG.md`, `DATA.md`. Sources used are all on disk (wiki-db, FMG name tables,
enemy combat/drop dumps, `entity-index.json`). `.env`/`.env.local` were never opened. No push.

Commits (one per step): `1b77bfc` §1 · `6038746` §2 · `d90da58` §3 · `d52b618` §4 ·
`3b6de0a` §5 · `3b58b4e` §6 · `1a78228` §7.

## Enemy records before/after

| | before (Task 147, 2026‑09‑29) | after |
| --- | ---: | ---: |
| enemy records | 1276 | **607** |
| exact-name duplicate groups | 177 | **0** |
| extra records | 668 | **0** |
| merged records carrying `variants` (>1) | 0 | **176** |
| old `enemy:<npcParamId>` ids resolving | n/a | **1276/1276** |

Index total 6307 → **5685** records. The 607 enemy pages are one per exact display name; a
name with a parenthetical ("Omen (Stormveil Castle)", "Omen (Accursed)") stays its own page.

---

## Step 1 — one page per enemy

`mergeEnemyVariants()` in `src/lib/entityIndexBuild.ts` groups `kind === 'enemy'` records by
exact `displayName`, keeps the richest member (preferring the `enemy:<slug>` id), unions
locations/regions/drops, and stores the per-placement table in `variants`
(`{ npcParamId, location, region, drops: [{ item, chance }] }`). The `Drop rates` stat is
removed — chances live only inside `variants`. `scripts/gen-aliases.mjs` aliases every old
`enemy:<npcParamId>` (and combat `factId`) onto the merged `enemy:<slug>`. `EnemyVariant` added
to `entityIndex.ts`; `EntityKinds.tsx` renders a `Variants (N)` block for enemies with >1.

Examples: `Omen` (4 variants: Cliffbottom/Unsightly/Altus/Shunning‑Grounds, Omen Cleaver 4%);
`Giant Crab` (5 variants); `Crab` (4 variants). Before: 1276 near-identical pages.

## Step 2 — placeholder junk

Final loop drops junk rows, strips `See #Drops` from drop lists, and clears template/one-word
descriptions. Root cause found: the wiki stores the pointer as `See [[#Drops`, so it only
becomes `See #Drops` after `prune()` — the filter now runs after prune, not before.

| check | before | after |
| --- | ---: | ---: |
| `Dummy Entity` enemies | 1 page | **0** |
| records with a `See #Drops` drop | 13 | **0** |
| single-word descriptions (`^\w+$`) | 357 | **0** |
| descriptions starting "The is a/an" | 49 | **0** |

Examples removed/cleaned: `enemy:dummy-entity` deleted; `Wandering Noble`,
`Noble Sorcerer` lost `See #Drops`; item descriptions `drop`/`merchant`/`other` emptied (refilled
in §3). `Type 1–20` and `test gem 1–3` were already absent (earlier `JUNK_NAME` handling).

## Step 3 — real descriptions

Empty / subjectless descriptions are refilled from `public/sourced/open/wiki-db/*` lead
paragraphs. A broken lead that lost its subject ("`The is a …`", "`is a …`") is repaired by
restoring the record name; a bare unrepairable template is never written. Broken parses
(`| res madness = }}`) and stray-plural leads are rejected.

| | before | after |
| --- | ---: | ---: |
| empty descriptions | 604 | **224** |
| descriptions matching `/^The is a|^\w+$/` | 406 | **0** |

Examples: `Abandoned Cave` → "Abandoned Cave is a Location and Sites of Grace in Elden Ring.";
`Coastal Cave` → "The Coastal Cave is a dungeon in Elden Ring."; `Commander Niall` →
"Commander Niall is an optional boss in Elden Ring. Defeating him will unlock … achievement."

## Step 4 — cut content

`buildCutNameSet()` flags a record when the wiki gives it `{{Infobox … Cut}}`, the
`Unused Content` (or cut/scrapped/removed) category, or a lead that says the content was cut.
The record gets `cut: true` and `stats.Status = "Cut content (not obtainable)"`; nothing is
deleted. **87 records flagged:** weapon 18, item 37, armor 20, npc 9, enemy 2, talisman 1.

Examples: `Abundance Twinblade`, `Blackflame Monk's Seal`, `Father Marika's Hammer` (all the
18 `{{Infobox Weapon Cut}}` pages are flagged).

## Step 5 — missing names / aliases

`scripts/gen-aliases.mjs` now maps the game's own FMG names and wiki redirects onto the single
record each names: `enemy-name` (old npc params), plus a new `game-name-table` block
(259 FMG names + 873 redirects). A name that two records could claim, an upgrade tier (`+N`),
a weapon affinity variant, a `Smithing Stone [N]` duplicate and any name another record already
owns are skipped. The FMG names are limited to the report's gaps: **maps, notes, cookbooks,
DLC Ashes of War, NPC titles**.

| | before | after |
| --- | ---: | ---: |
| alias rows | 5224 | **6215** |
| `game-name-table` rows | 0 | **991** |

Examples: `Map: Limgrave, West` (goods:8600) → `item:map-limgrave-west`; an NPC long title maps
to its `npc:`/`merchant:` record; ~873 wiki redirect titles now resolve.

## Step 6 — boss drops + runes, merchant details

Bosses take `stats.Runes` from their `wiki-db/boss.json` page (the field was read but never
applied). An encounter variant whose roster row has no drops keeps the pooled source drops
instead of blanking them. `enrichMerchants()` gives a shop sub-row ("Brother Corhyn — Altus
Plateau") its base merchant's real description/region/pin/stats and fills a base merchant from
its wiki Character page (real prose only, no invented template).

| metric | before | after |
| --- | ---: | ---: |
| bosses with no drops | 32 | **9** |
| bosses with no runes | 119 | **54** |
| merchants with no description | 51 | **25** |
| merchants with map coords | 12 | **30** |
| merchants with a region | 11 | **32** |
| merchants whose location ≠ "Merchant" | 0 | **31** |

Examples: `Ancestor Spirit` runes 13,000; `Astel` 80,000; `Brother Corhyn — Altus Plateau`
inherits Corhyn's quote and pin.

## Step 7 — tests + gates

New `src/lib/auditFixes.test.ts`: no enemy display name twice; every old `enemy:<npcParamId>`
drop id resolves to its merged page; no description matching `/^The is a|^\w+$/`; no
`Dummy Entity`/`type N`/`test gem`; every wiki `Weapon Cut` page is flagged `cut: true` with the
Cut status. `entityCoverage`/`entityIndexQuality` needed the §3 lead repair to hold their 95%
region/npc guards (placeholder region names had counted before).

Final gates (run once, in order):

- `npm run index:entities` → **5685 records** (607 enemy), 4429 KiB.
- `npm run audit:pages` → **5687 entities, 46 flagged**.
- `npm run audit:links` → **dead data 0, dead renderer 0, guard violations 0**.
- `npx vitest run` → **198 files, 1407 passed, 11 skipped, 0 failed**.
- `npm run lint` → **0 errors**; no warning in changed files (pre‑existing warnings only).
- `npm run build` → success (chunks >500 kB warning only; `bundleBudget` runs only against a
  fresh `dist/`, and the gate order is vitest before build).

## ASSUMPTIONS

1. The enemy merge groups by **exact display name after `displayName`** (parentheticals kept), so
   "(Boss)"/location rows stay separate; `variants` is only emitted when >1 placement.
2. "Never use a template sentence" is read as **never synthesize one**. Wiki lead paragraphs are
   real on‑disk text; a lead that dropped its subject is repaired by restoring the record name,
   which is required to keep the region/npc coverage guards (which counted placeholder names
   before) from failing. No test was loosened.
3. Step 5's redirect/name attachment uses the loose `norm` (possessives/parentheticals folded)
   and skips any name owned by another row; "exactly one record" means one index record id.
4. `entityIndexBuild.ts` imports `aliases.json` for name resolution, so index and aliases are
   mutually dependent. The final committed pair was iterated to a stable point; a 1–2 record
   catalogue drift (e.g. `Perfumer's Cookbook [1]/[2]` ids) is possible and not user‑visible.
5. Cut content is identified purely from wiki signals (infobox/category/lead); no deletion.
6. Merchant "no template" means a real quote or a substantive wiki lead only; single‑sentence
   templates and shop‑category rows are left undescribed.

## SKIPPED (and why)

1. **er‑mcp.db `bosses.runes` extraction** (report item 7, ~13 more bosses). The generator runs
   in Node/Vite and cannot query SQLite, and data changes are restricted to the two named
   generators; adding a new SQLite‑derived source file was out of scope. 65 rune gaps were
   instead filled from `wiki-db/boss.json`.
2. **er‑mcp.db `pages`/`sections` description fallback.** The exported `public/sourced/wiki/pages-*`
   corpus would need a new glob import of 42 large chunks, and its Summary text is the same
   derived text as wiki‑db and often broken ("Ancestor Spirit\*\* . , ."), so it was not wired.
3. **673 `enemy:<npcParamId>` ids from `enemy-drops.json` still unresolved.** They never named an
   enemy record (Blaidd, Gurranq, named bosses/NPCs), so there is no merged page to alias to.
   All 1276 ids that *were* enemy records resolve.
4. **25 merchant descriptions remain empty** — mostly Remembrance/shop‑category rows with no real
   (non‑template) source text.
5. **`Type 1–20` / `test gem 1–3`** were already absent before step 2 (earlier junk‑name logic);
   the guard is still asserted.
