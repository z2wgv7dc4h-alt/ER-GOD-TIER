# Task 149 — Comprehensive read-only audit (report)

**Verdict: NOT READY.** The core gates mostly pass (typecheck, tests, lint, build, the six
`audit:*`/coverage scripts), and the Task 148 data pass clearly landed for enemies and
game-name resolution. But a hard, checkable gate fails — `npm run test:bundle` (first-load JS
**5.23 MB vs a 3.5 MiB budget**, and `index`/`worker`/`infer` all over the 1.2 MiB per-chunk
cap), a regression from master `878fb28` (which was already marginally over) caused by
`src/data/aliases.json` growing **270 KB → 1.16 MB** and being inlined into the `infer` and OCR
`worker` chunks. On top of that the committed generated audit docs are **stale** (they still
describe the pre-148 index), **236 pages have no description** and **472 pages use a bare
place name as their description**, and **1,091 of 7,786 ids** from the old index now go nowhere
(no record, no alias). A PS5 player can use the app, but the Library will show a lot of empty
and place-only entity pages, one photographed/legacy state can silently lose facts, and the
"ready" evidence the repo ships is out of date.

Method: read-only. `.env`/`.env.local` were never opened. Scripts live in `.scratch/149/`
(reused `.scratch/147/` where possible). The only file written is this report. The task's
`run149.sh` expected a `node_modules` junction; it was missing, so the intended junction to the
main checkout was recreated (no `npm install`). No dev server was started.

---

## A. Gates (run once; numbers)

| gate | result | numbers |
|---|---|---|
| `npx tsc -b` | **PASS** | exit 0 |
| `npx vitest run` | **PASS** | 198 files, **1408 passed, 11 skipped, 0 failed** (exit 0) — but see note |
| `npm run lint` | **PASS** | exit 0; **0 errors**, ~40 warnings (pre-existing; `set-state-in-effect`, `only-export-components`, unused vars in two scripts) |
| `npm run build` | **PASS** | exit 0; 322 modules; **59 JS + 6 CSS** chunks; >500 kB warning; PWA precache 115 entries |
| `npm run audit:pages` | **PASS** | **5687 entities, 5 flagged** (4 item + 1 npc empties) |
| `npm run audit:links` | **PASS** | **dead data 0, dead renderer 0, guard violations 0** |
| `npm run audit:progress` | **PASS** | **6 scenarios, 0 violations** |
| `npm run audit:inference` | **PASS** | **558 rules, 17 scenario facts** |
| `npm run coverage:entities` | **PASS** | "all guard minimums met" |
| `npm run data:offline` | **PASS** | 2713 files, 86.4 MB → `offline-manifest.json` |
| `npm run test:ocr` | **PASS** | 5 files passed / 1 skipped; **17 passed, 1 skipped, 0 failed** |
| `npm run test:bundle` | **FAIL** | build OK, then `bundleBudget.test.ts`: expected `5234752 < 3670016` (3.5 MiB). `index-RT2Jl28m.js` 1,478,621 B, `worker-DzSkJjgg.js` 1,445,738 B, `infer-CNNspf_s.js` 1,353,585 B — all > the 1.2 MiB per-chunk cap |

Other `audit:*`/`check:*` scripts in `package.json`: only `audit:ui` and `crawl:ui` remain, and
both require a running dev server — **not run** (the brief forbids dev servers). No `check:*`
scripts exist. `scripts/accuracy-audit.mjs` has no npm script.

**Important gate caveat.** `bundleBudget.test.ts` runs only when `dist/` is newer than the
sources. On the first `npx vitest run` (no fresh `dist/`) those 3 tests are skipped, so the suite
is green. After any `npm run build`, the *same* `npx vitest run` **fails 1 test** (1410 passed, 8
skipped). `npm run build` itself does not run tests, so CI that runs vitest before build stays
green; CI that runs it after a build would fail.

---

## B. Data (`public/sourced/entity-index.json`, 5685 records, generatedAt 2026-10-03T14:39:33Z)

### B1. Completeness vs the game's name tables

Reused `.scratch/147/section1.mjs` against the current index + `aliases.json`. WeaponName affinity
slots and `%null%`/`[ERROR]` dropped; names resolved by normalised name against records **and**
aliases.

| table | real names | unique | resolved | unresolved | vs 147 |
|---|---:|---:|---:|---:|---|
| WeaponName | 566 | 566 | 562 | 4 | same |
| ProtectorName | 788 | 768 | 743 | 25 | same |
| AccessoryName | 157 | 157 | 157 | 0 | same |
| GoodsName | 2221 | 2108 | 1253 | **855** | better (was 884) |
| GemName | 126 | 125 | 99 | 26 | same |
| ArtsName | 265 | 258 | 124 | 134 | better (was 137) |
| NpcName | 482 | 318 | 316 | **2** | **much better (was 20)** |
| PlaceName | 1006 | 609 | 609 | **0** | **much better (was 45)** |

Remaining unresolved real names (full lists in `.scratch/149/section1.out.txt`):
- **Weapon 4:** `Royal Soldier Straight Sword`, `Great Épée`, `Varré's Bouquet`, `Pulley Crossbow`.
- **Protector 25:** `Type 1`…`Type 20`, `Travel Hairstyle`, `Head`, `Body`, `Arms`, `Legs` (dev/cut).
- **Goods 855:** overwhelmingly **upgrade tiers that are not distinct items** (`Flask of Crimson
  Tears +1…+12`, `Mimic Tear Ashes +1…+10`, dozens of spirit-ash families), plus `Golden Rune [11]`.
  These should arguably not be name-table rows to match.
- **Gem 26:** `test gem 1–3` + 23 DLC Ashes of War (`Ash of War: Dryleaf Whirlwind`,
  `Carian Sovereignty`, `Blinkbolt`, …).
- **Arts 134:** weapon skills / AoW skill names, mostly DLC (`Waterfowl Dance`,
  `Messmer's Assault`, `Moonlight Greatsword`, …) — no skill record exists for most.
- **Npc 2:** `Asimi, Eternal King` and `Someone Yet Unseen` (cut).

### B2. Per-kind field coverage (current) vs 147

Computed with `.scratch/147/section2.mjs`; "picture" = `record.image` OR `image-index.json` hit.

| kind | n | description | loc/region | coords | picture | stats | drops |
|---|---:|---:|---:|---:|---:|---:|---:|
| armor | 751 | 100% | 91% | 0% | 73% | 91% | 0% |
| ash | 124 | 100% | 77% | 0% | 62% | 86% | 0% |
| boss | 280 | 94% | 100% | 87% | 83% | 100% | **97%** |
| build | 28 | 93% | 7% | 4% | 29% | 0% | 0% |
| dungeon | 119 | 98% | 100% | 100% | 99% | 1% | 0% |
| ending | 5 | 60% | 40% | 0% | 40% | 0% | 0% |
| enemy | **607** | 100% | 100% | 0% | 23% | 96% | **57%** |
| gate | 10 | 80% | 20% | 0% | 0% | 0% | 0% |
| grace | 416 | **93%** | 100% | 100% | 34% | 100% | 0% |
| item | 1187 | 97% | 95% | 0% | 45% | 82% | 0% |
| material | 3 | 100% | 100% | 0% | 67% | 100% | 0% |
| mechanic | 65 | 66% | 40% | 0% | 2% | 2% | 0% |
| merchant | 106 | **76%** | 100% | 28% | 25% | 29% | 0% |
| npc | 195 | 98% | 88% | 33% | 31% | 86% | 0% |
| quest | 468 | 90% | 77% | 3% | 5% | 0% | 0% |
| region | **355** | **87%** | 100% | 4% | 38% | 0% | 0% |
| shield | 69 | 100% | 100% | 0% | 100% | 100% | 0% |
| spell | 218 | 100% | 99% | 0% | 78% | 99% | 0% |
| spirit | 80 | 100% | 94% | 0% | 80% | 99% | 0% |
| talisman | 158 | 100% | 97% | 0% | 55% | 99% | 0% |
| weapon | 441 | 100% | 96% | 0% | 69% | 100% | 0% |

Better than 147: **merchant** (desc 11→76%, stats 11→29%, coords 11→28%), boss **drops 89→97%**,
enemy dedup 1276→607 with **drops 45→57%**. Worse: **grace description 100→93%** and **region
100→87%** (the Task 148 §follow-up template-description drop removed "X is a Site of Grace…"
text and left these empty), quest 99→90%.

The regenerated `coverage:entities` guard table confirms: region description+location 98.1% (guard
≥95) and enemy 99.3% (guard ≥95) **PASS**, but the `After` table shows grace desc 93.3% and boss
desc 94.3%.

### B3. Quality

From `.scratch/149/sectionB3.mjs` (whole index):

| check | count | notes |
|---|---:|---|
| template descriptions (`in Elden Ring.`, `a melee armament`) | **0** | fixed |
| descriptions starting "The is a"/"This is a" | **0** | fixed |
| descriptions starting "are" | 5 | boss fragments (`Tibia Mariner` ×4 etc.) |
| empty descriptions | **236** | quest 47, region 45, item 40, grace 28, merchant 25, mechanic 22, boss 16, npc 4, dungeon 2, gate 2, ending 2, build 2, weapon 1 |
| `cut: true` records | 87 | weapon 18, item 37, armor 20, talisman 1, npc 9, enemy 2 (76 are catalogue kinds, still counted in totals) |
| mod / Reforged / Nightreign | **0** | clean |
| base-name is a bare numeric id | **0** | clean |
| map asset code in name/region/location | **0** | clean |
| **description == region/location exactly** | **472** | grace 356, dungeon 68, quest 31, boss 12, region 2, item 2, spirit 1 |
| records with `region` == "Shadow of the Erdtree" | 19 | boss 1, enemy 7, npc 9, quest 1, region 1 |
| `merchant` records that are not merchants | **27** | Remembrance/shop rows (`merchant:remembrance-of-the-*`, `merchant:sorcery`, `merchant:dragon-communion`, `merchant:elden-remembrance`) |
| boss descriptions that are raw stat blocks | 5 | `Black Knife Assassin (…)` ×4, `Soldier of Godrick` |

Examples: `grace` pages print the region as the description ("Mt. Gelmir"); `boss:malenia`
description = "Elphael, Brace of the Haligtree"; `boss:astel` = "Ainsel River";
`boss:radahn` / `boss:mohg-omen` descriptions are **empty** though both have full stats/drops;
`region:suppressing-pillar` description is Japanese (`ΘÄ«… (Shizume no Hashira) is a location…`).

Duplicates (`.scratch/149/section5*.out.txt`): enemy exact-name dup groups **0** (was 177 — fixed).
Still duplicated: `npc` 5 exact groups (`Boc the Seamster`, `Fire Knight Queelign`, `Moore`,
`Sir Ansbach`, `Thiollier` — dual `npc:`/`npcs:` ids); `item` 1 (`Haligtree Secret Medallion
(Left)` as `item:haligtree-medallion-left` and `item:haligtree-secret-medallion`); `boss` 0 exact
(32 norm groups are intentional location variants); `quest` 34 exact-name step groups. Two
case/punctuation variants remain: `Dectus Medallion (Right)`/`(right)`, `Giant's Flame Take Thee`/
`Giantsflame Take Thee`.

### B4. 25 random records per kind

Written to `.scratch/149/sectionB4.out.txt` (21 kinds). Samples are mostly coherent; concrete
defects seen as a player would:
- Wrong/odd coords on entity pages: `boss:mohg-omen` y = −298.53, `boss:demi-human-queen-margot`
  y = 1013.07, `boss:black-blade-kindred` y = 1048.49, `npc:brother-corhyn` (−325.95, −21.96),
  `merchant:pidia-carian-servant` (−107.67, 357.52). `record.map` is only *displayed* (never used
  to plot; Atlas uses `coords.json`/`boss-pins.json`), so this is a nonsense-on-page issue, not a
  broken pin.
- `mechanic`/`damage` records carry leaked acquisition prose as `region`
  (`mechanic:status-poison` starts "Guaranteed Drop: Caelid — Drops from the Night's Cavalry…"),
  and `damage:fire` has `stats=Runes`.
- `item:dusk-medallion` is named "Dectus Medallion (right)" (id/name disagree);
  `item:map-limgrave-west` is cased "Map (limgrave, West)"; `item:skill-raptor-of-the-mists` is a
  skill filed as an item.
- `region` pages store a **type** in `region` ("Ruin", "Grace", "Shack", "Church", "Tower"…).
- `hunt:battlemage-hugues` boss description is a spirit-ash line ("Summons spirit of Battlemage
  Hugues"); `boss:divine-beast` says "Belurat" as region (ok).
- `merchant` pages mix real merchants with Remembrances and the Enia remembrance shop.
- Cut weapons still render as "The was a Twinblade melee armament that was cut…"
  (`item:abundance-twinblade`) — correctly flagged `cut`, but the text is broken.

### B5. Bosses

`.scratch/149/sectionB5.mjs`, against `open/game-areas.json` (210 GameAreaParam fights) and
`src/data/bosses.json` (220 encounters):
- **Fight pages:** 209/210 resolve (205 via alias, 4 by name); **1 unresolved** —
  `area:1049390800 Nox Swordress & Nok Monk` (the game row misspells "Swordress/Nok"; a page
  `boss:nox-swordstress-and-nox-monk` exists but has no alias for that flag).
- **Kill flags:** 205/210 resolve; 5 flags unresolved (`30100801` Crucible Knight, `30120801`
  Misbegotten Warrior, `31150800` Demi-Human Chief, `32050801` Crystalian (Spear),
  `1049390800`). No flag appears in two GameAreaParam rows, so these are genuinely missing alias
  entries, not partner-row artefacts.
- **Multi-location:** 33 same-name boss groups, **220/220** encounter ids have an entity page, and
  no two encounters share a kill flag. Per-location pages exist (e.g. Erdtree Burial Watchdog ×5,
  Black Knife Assassin ×4).
- **Runes/drops:** of 280 `boss` pages, **226 (81%) carry `Runes` and 271 (97%) carry drops**; the
  220-encounter roster has runes 161 and drops 189.

### B6. Old ids (`07e7eb0`)

`.scratch/149/sectionB6.mjs` vs `git show 07e7eb0:artifacts/all-knowing/public/sourced/entity-index.json`
(7,786 records):

| | count |
|---|---:|
| still exist by exact id | 5021 |
| resolve via alias to an existing record | 1674 |
| **now go nowhere (no record, no alias)** | **1091** |

Dead by prefix: **item 904**, quest 65, enemy 59, boss 36, npcs 26, npc 1. Examples:
`boss:abductor-virgin-duo`, `boss:baleful-shadow`, `boss:dragonkin-soldier-of-nokron`,
`boss:godfrey-the-grafted`, `boss:deathrite-bird`; `item:…` (904). A profile or packet written
against the old index would load with ~14% of its ids silently unresolvable. (Current in-app data
links are clean — `audit:links` reports 0 dead — so this only affects imported/persisted
pre-148 state.)

---

## C. App

### C1. Routes/sections and their data

Shell is four sections; `src/lib/sections.ts` is the source of truth (not the README):

| section | sub-views (sections.ts) | data actually read |
|---|---|---|
| Tarnished | overview · **gear** · setup (`update` alias) · profiles | entity index, `progressStats`/`advisor`, FanAPI/regulation via `MeGear`, PS5 capture + open text, vault/packet |
| Journey | now · **area** · map · quests | `planRoute`/`areaHub`/`advisor`; `guide/legs.json`; Atlas `coords.json` + `boss-pins.json` + engine markers + `npc-placements.json` + plates; storylines/`npcQuests` |
| Library | search · builds · pvp · guides | entity index, `guide/catalog.json`, FanAPI, `image-index`; `regulation-vanilla-v1.17.json`, builds/PvP; `guides-fextralife`/`builds-fextralife`/recipes/secrets/dialogue |
| Gideon | — | all of the above through `gideonTools` + wiki corpus |

All concrete runtime `/sourced/...` paths referenced from non-test `src` exist on disk
(`.scratch/149/sectionC1files.out.txt`); the only "MISS" lines are glob/prefix templates. No screen
reads a file that no longer exists. `Drop rates` was removed from enemy records in 148 and has
**0 remaining writers/readers**; the new enemy `variants` field is consumed by
`EntityKinds.tsx:320`. No component reads an index field that is no longer produced.

### C2. PS5 photo path

- `src/lib/ps5Capture*.ts` tests: `npm run test:ocr` → **17 passed, 1 skipped, 0 failed** (5 files
  passed / 1 skipped).
- 20 verbatim FMG strings fed to the OCR resolver `defaultItemResolver`
  (`.scratch/149/sectionC2.mjs`): **20/20 resolve** through the alias plane. But some are
  cross-kind mis-hits: `"Stormveil Castle"` → `enemy:omen-stormveil-castle`,
  `"Leyndell, Ashen Capital"` → `enemy:gargoyle-leyndell-ashen-capital`, `"Leyndell, Royal
  Capital"` → `item:map-leyndell-royal-capital`. The scanner filters by tab category, so this bites
  mainly when a place string is scanned with no category.

### C3. Progress / inference

`runProgressAudit()` runs **6** scenarios (`src/lib/__fixtures__/scenarios/progression.ts` +
`urmummytoilet.ts`): the real character plus early (Limgrave/Margit), mid (Liurnia+Caelid,
Godrick/Rennala/Radahn), late (Leyndell/Farum, Morgott/Fire Giant/Maliketh), DLC
(Shadow/Mohg/Radahn/Messmer) and a denial case (Godrick known, Margit explicitly denied). Each is
checked across 16 `AUDIT_AREAS`; 0 violations.
`trackActionLabel()` (`src/library/pageModel.ts:147`) returns **null** for `grace`, `region`,
`dungeon`, `npc`, `merchant`, `mechanic`, `build` and for a shared multi-location boss page — those
can only be marked done *indirectly* (a contained grace/boss/item proves a region or dungeon; a
quest step proves an NPC). So "can't be marked done" = grace/region/dungeon/npc/merchant/mechanic
and the shared boss page; everything else has an explicit button.

### C4. Builds vs master `878fb28`

Rebuilt both in throwaway worktrees with the same shared `node_modules`:

| | master `878fb28` | task-149 |
|---|---:|---:|
| chunk count | 59 JS + 6 CSS | 59 JS + 6 CSS (unchanged) |
| total emitted JS | **3,742,621 B** | **5,234,752 B** (+1,492,131) |
| `infer-*.js` | 607,770 | 1,353,585 (**+745,815**) |
| `worker-*.js` | 699,923 | 1,445,738 (**+745,815**) |
| `index-*.js` | 1,478,621 | 1,478,621 (unchanged) |
| `test:bundle` budget | fails by ~72 KB (already over) | fails by ~1.56 MB |

The identical +745,815 B delta in `infer` *and* `worker` is `src/data/aliases.json`
(270,438 B at `878fb28` → 1,163,276 B now) being inlined into both chunks via
`src/lib/aliases.ts`. Builds still render; the payload regressed materially.

### C5. TODO/FIXME/skipped

- `TODO`/`FIXME`/`HACK`/`XXX`: **none** in `src`.
- `eslint-disable-next-line`: 5 sites (`App.tsx:71`, `Gideon.tsx:72`, `EntityOverlay.tsx:69`,
  `state.tsx:265,417`).
- Skipped tests: **8 every run** — `src/lib/sl2/parse.test.ts` (3) and `src/lib/sl2/facts.test.ts`
  (5), both `describe.skipIf(!hasFixture)` because no real `ER0000.sl2` fixture exists here. The
  `bundleBudget` `describe.skipIf(!runDistChecks)` 3 tests are skipped only when `dist/` is absent
  or stale (first run); with a fresh build they run and 1 fails. `ps5MapRefs.build.ocr.test.ts`
  is opt-in and not in the default (non-OCR) run.
- `it.skipIf(!existsSync(wikiTalismanDbPath))` (`entityIndexQuality.test.ts`) and
  `it.skipIf(!existsSync(markerPath))` (`regulation.test.ts`) are currently satisfied, so they run.

### C6. Docs now false

- `docs/ENTITY-COVERAGE.md`, `docs/PROGRESS-AUDIT.md`, `docs/INFERENCE-RULES.md` and
  `public/sourced/offline-manifest.json` are committed with **`_Regenerated 2026-09-29._`** and
  pre-148 numbers (enemy 1276, region 99.4%, `aliases.json` 270,438 B, 2712 files/88.4 MB).
  Regenerating them today produces different content (enemy 607, region 98.1%, aliases 1,216,156 B,
  2713 files/86.4 MB). `docs/PAGE-AUDIT.md` and `docs/LINKS-AUDIT.md` were already current
  (2026-10-03).
- `README.md` §Sections still lists Library as "Search · Builds · **Kit**" and the section notes
  omit the new **Gear** (Tarnished) and **Area** (Journey) subs that `sections.ts` ships.
- `HANDOFF-CLAUDE.md` §0 says "33 bosses → **101 encounters**… 76 matched… **23** encounters with
  no per-location drop"; the roster is now **220 encounters** (33 same-name groups), 189 with
  drops, and only 9 boss pages lack drops.
- `DATA.md` says the alias plane is "**1273 rows / ~274 KB**" and "unmatched warps 360 → 0, bosses
  79/215"; it is **6215 rows / 1.16 MB**. It also says `open/boss-xyz.json` has **215** named
  bosses (actual **209**), `open/enemies.json` **520** (actual **1226**), and `guide/items.json`
  **2437** (actual **2490**) / "2.4k". `checklists/hunts.json` is referenced in prose but does not
  exist (canonical is `src/data/hunts.json`, 207).
- `README.md` still calls Gideon's model an "**Optional local LLM**"; the code/architecture use a
  hosted provider (`VITE_GIDEON_*`, DeepSeek/Meta) behind a dev proxy.

---

## MUST FIX before ready (ranked)

1. **Bundle budget / `test:bundle` failure.** `src/data/aliases.json` grew to 1.16 MB and is
   inlined into `infer-*.js` and the OCR `worker-*.js` (each +745,815 B), taking first-load JS to
   5.23 MB vs the 3.5 MiB guard, with three chunks over the 1.2 MiB cap. Evidence:
   `npm run test:bundle` (expected 5234752 < 3670016); master `878fb28` is only ~72 KB over, so
   this is a regression, not a paper failure. Files: `src/data/aliases.json`,
   `src/lib/aliases.ts`, `src/lib/bundleBudget.test.ts`. Either lazy-load the alias plane (fetch
   `public/sourced/aliases.json` like other runtime data) or lift the cap with a decision.
2. **Stale committed generated docs.** `docs/ENTITY-COVERAGE.md`, `docs/PROGRESS-AUDIT.md`,
   `docs/INFERENCE-RULES.md`, `public/sourced/offline-manifest.json` describe the pre-148 index
   (2026-09-29). Regenerate and commit, or the repo's own readiness evidence contradicts the
   shipped index.
3. **Empty / place-only entity pages.** 236 records have no description and 472 use the bare
   region/location as the description (grace 356, dungeon 68, quest 31, boss 12). Visible examples:
   `boss:radahn` and `boss:mohg-omen` (empty), `boss:malenia`/`boss:astel` (place as prose),
   `grace:*` (region as prose), `region:*` (45 empty). `src/lib/entityIndexBuild.ts` fills these.
4. **1,091 dead legacy ids.** Ids present at `07e7eb0` with no current record or alias (item 904,
   quest 65, enemy 59, boss 36, npcs 26, npc 1). Any imported/persisted pre-148 packet loses those
   facts. Either alias what should survive or document the migration break.
5. **GameAreaParam coverage gaps.** One fight with no page link (`area:1049390800`, Nox Swordress
   & Nok Monk) and 5 boss kill flags with no alias (Crucible Knight 30100801, Misbegotten Warrior
   30120801, Demi-Human Chief 31150800, Crystalian (Spear) 32050801, 1049390800). Affects the PC
   save path; PS5 marking is unaffected. `scripts/build-boss-roster.mjs` / `scripts/gen-aliases.mjs`.
6. **Doc drift** (README/HANDOFF/DATA) — see C6; at minimum fix the alias-plane size, boss-xyz
   count, and the Library Kit/encounters claims.

## NICE TO HAVE

- `merchant` kind contains 27 non-merchant rows (Remembrances, Enia's shop, Dragon Communion) —
  reclassify or rename.
- 19 records use `Shadow of the Erdtree` as a region; 5 boss descriptions are raw stat blocks;
  `region` records store a *type* in `region`.
- `item:dusk-medallion` name/id mismatch; `item:map-limgrave-west` casing; skill/item
  (`item:skill-raptor-of-the-mists`); 5 remaining `npc` exact duplicates (Boc, Fire Knight
  Queelign, Moore, Sir Ansbach, Thiollier) and the duplicate Haligtree Secret Medallion (Left).
- Entity-page coords outside the 0–100 frame for DLC NPCs/merchants/bosses (display-only; Atlas
  pins are grounded separately).
- OCR resolver returns cross-kind fuzzy hits for place names with no category filter
  ("Stormveil Castle" → an enemy).
- `npm test` fails after any build because `bundleBudget` becomes active — decide whether tests
  should be build-independent (they were intended to be).

## Could not check

- `npm run audit:ui` and `npm run crawl:ui` (both need a live dev server; forbidden).
- Physical PS5/phone behaviour and camera/Tesseract on-device (headless/test evidence only).
- Semantic correctness of a record's `region` for real places (no authoritative name→region map on
  disk; only structural oddities were flagged).
- `.env`/`.env.local` (never opened, per the brief).
