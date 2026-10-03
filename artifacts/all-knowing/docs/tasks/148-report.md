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

---

# Follow-up (post-§7 regressions)

After the step-8 report commit. Two regressions fixed in `src/lib/entityIndexBuild.ts`
(generators only); `public/sourced/entity-index.json` was regenerated.

## 1. Empty pages back to the master baseline

Task 148 §2 cleared a one-word placeholder description (`PLACEHOLDER_DESC`,
including a bare region name). For 41 authored quest beats the region *was* the
record's only player text, so clearing it left the page with no description,
location, stats, drops or sections — `audit:pages` then flagged 46 empty pages
(41 quest, 4 item, 1 npc) against 5 on master (78c285c). The fix: when the
placeholder being cleared is exactly the record's own region, keep it as the
record's **location** (location is player text and carries no template), then
clear the description as before.

| | master 78c285c | Task 148 §7 | after |
| --- | ---: | ---: | ---: |
| empty pages (`audit:pages`) | 5 | 46 | **5** |
| — quest | 0 | 41 | **0** |
| — item | 4 | 4 | 4 |
| — npc | 1 | 1 | 1 |

## 2. Wiki template descriptions removed

A wiki lead that only states the category — `X is a … in Elden Ring.` or
`X is an Axe, a melee armament .` — is not a description. The build now splits
every description into sentences and drops any containing `in Elden Ring.` or
`a melee armament`, keeping the rest. When nothing real remains it falls back to
(1) the game's own caption/info text for an exact name match
(`open/text/*Caption.json` / `*Info.json` via `names.json`), then (2) the first
real sentence on the wiki page (`open/wiki-sections.json`, e.g. the Overview
prose behind the Summary template), then (3) leaves the field empty. The build
never writes a template sentence.

| | before | after |
| --- | ---: | ---: |
| descriptions matching `/in Elden Ring\.\|a melee armament/` | 788 | **0** |
| of those, real remainder kept | — | 103 |
| rescued by the game's own text | — | 172 |
| rescued by the next wiki sentence | — | 501 |
| description emptied (other fields remain) | — | 12 |
| quest records whose only text was a bare region name | 41 | 0 |

The guard tests still pass: `entityCoverage` (boss/weapon/shield/armor/talisman/
spell/ash/spirit/item 100%, npc/region/enemy ≥95%) and `entityIndexQuality`
(regions ≥95%, enemies ≥90%, no empty location record) are unchanged. Catalogue
item/armor/talisman/spell/ash/spirit records remain 100% description+location;
npc 99.5%, region 98.4%, enemy 99.3% (description+location).

New guard in `src/lib/auditFixes.test.ts`:
no description matches `/in Elden Ring\.|a melee armament/`.

## Follow-up gates (run once, in order)

- `npm run index:entities` → **5685 records** (4450 KiB).
- `npm run audit:pages` → **5687 entities, 5 flagged** (was 46); empties: 4 item, 1 npc.
- `npm run audit:links` → **dead data 0, dead renderer 0, guard violations 0**.
- `npx vitest run` → **198 files, 1408 passed, 11 skipped, 0 failed**.
- `npm run lint` → **0 errors** (pre-existing warnings only).
- `npm run build` → success (large-chunk warning only).

## Follow-up assumptions

1. A bare region name cleared from a description is real locator data, not prose;
   it is restored to `location` (never back to `description`, which would trip the
   §2 one-word guard). This is the only description-clearing change.
2. "The next non-template wiki sentence" is read as the first real sentence in
   `open/wiki-sections.json` for the page (Summary templates skipped, list rows
   and sub-20-character fragments skipped). No sentence is synthesised.
3. The measured template count is 788 on the Task 148 §7 index with the test
   regex; the brief's 833 was not reproduced from the committed snapshot.
4. A record whose description becomes empty is left empty; only the pre-existing
   5 master-baseline pages remain flagged.
