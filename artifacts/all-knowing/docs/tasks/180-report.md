# Task 180 — Unused data, built-but-unreachable code, gaps, outbound links (READ-ONLY) — report

Read-only. No app/source/data file was changed. Helper scripts live in `.scratch/180/` (gitignored,
uncommitted): `consumers.py`, `summarize.py`, `db.py`, `index_shape.py`, `index_keys.py`,
`coverage.py`, `urls.py`, `urls2.py`, `orphans.py`, `unused_exports.py`, `unused_exports_all.py`.
Only `docs/tasks/180-report.md` is committed. `.env` / `.env.local` were never opened.

Inputs: `docs/DATA-CATALOG.md` (409 files / 73.3 MB, plus 5,036 images / 37.9 MB), `DATA.md`,
`public/sourced/entity-index.json` (5,595 records, generated 2026-10-08T16:41Z), `.scratch/er-mcp.db`
(46.9 MB, 4,939 pages, 21 tables/views), `src/**` static scan, and the unmerged branches
`task-141 / 143 / 147 / 157 / 161`.

Numbers below are "now" (current tree). Where a fix is proposed the "→" value is what on-disk data
could supply, not a claim the app already shows it.

---

## 1. Unused data — every file and er-mcp.db table

### 1a. What DATA-CATALOG calls "UNUSED" is almost all a false positive

The catalog summary says **78 files UNUSED**. Its own quick list is exactly
**41 `public/sourced/wiki/pages-0NN.json` + 36 `wiki/search-*.json` + `player-knowledge.json`**.
The 77 wiki files are **runtime-loaded** by `src/lib/wikiSearch.ts`:
`loadWikiChunk` fetches `` `${BASE}/${name}` `` from the manifest (`wikiSearch.ts:135-143`) and
`loadBucket` fetches `` `${BASE}/${name}` `` (`wikiSearch.ts:217-221`), so no source module contains
the literal chunk filename and the census mis-fires. Corrected, the catalog's true "nothing in
`src/`/`scripts/` reads it" set is **one file: `player-knowledge.json`** (plus `player-questions.json`
is tooling-only, see below).

### 1b. Genuinely unused / barely-used, with contents and where it could go

| source | size / records | consumer today | what it contains | could feed | effort |
|---|---|---|---|---|---|
| `open/player-knowledge.json` | 3.14 MB / **5,718 rows** | **none** (only `playerKnowledge.test.ts` guards it) | Reddit posts+comments, topic-tagged, entity-resolved (57.9% carry ≥1 id), 846 `possiblyOutdated`; **239 useful (4.2%)** per Task 179, ~53% precision | item page **"How players use it"**, boss **"Player tips"**, mechanic **"Player notes"**, PvP **"Counters & tech"**; best home is Gideon grounded retrieval | **M** (needs a 239-row owner/LLM review + wiring) |
| `open/player-questions.json` | 2.45 MB / **6,581 rows** | `scripts/build-gideon-eval.mjs` only | real player questions + intent + resolved entities; 3,310 answerable / 3,271 not (Task 179) | eval set (done); ranked backlog → build recommender, PvP level reference, beginner primer, pacing | **S** (already documented in `docs/PLAYER-QUESTIONS.md`) |
| `er-mcp.db` → `redirects` | **2,730 rows** | **none** | wiki `from_title → to_title (+fragment)`; **≈2,073 not yet aliases** per Task 147 §3 | alias plane (`src/lib/aliases.ts`, `scripts/gen-aliases.mjs`) — more OCR/search hits | **S–M** |
| `er-mcp.db` → `bosses` | 165 | **none** | location, HP, `runes`, drops | fills **28** boss `runes` (Task 147); 111 rows carry drops | **S** |
| `er-mcp.db` → `spells` | 213 | **none** | fp/stamina cost, slots, int/fai/arc reqs, effect | fills fp/slots for **5** spells; stamina_cost has no index field | **S** |
| `er-mcp.db` → `armor` | 680 | **none** | slot, weight, poise, 57 with `effects` | mostly duplicate; `effects` has no index field | **S** |
| `er-mcp.db` → `talismans` | 156 | **none** | weight, effect, `summary` | duplicate; `summary` unused field | **S** |
| `er-mcp.db` → `weapons` | 480 | **none** | type, weight, reqs, scaling, skill, `effects` | duplicate of index/regulation | **S** |
| `er-mcp.db` → `entities` | 1,694 | **none** | typed page list (weapon/armor/spell/boss/talisman) | page census / cross-check only | **S** |
| `er-mcp.db` → `dlc_categories` 127, `dlc_report` 7, `sync_state` 1, `extract_failures` 0, `sections_fts*` 5 tables | small | **none** (FTS is human/tooling) | scrape bookkeeping + FTS shadow tables | maintenance/debug only | **S** |
| `open/bosses-fextralife.json` + `boss-images.json` + `images/bosses/**` | 163 bosses / 46 / 146 files | partly | boss **pictures**; fextralife url not all consumed | fills the **208/281 placeholder boss images** (§3) | **S–M** |
| `open/enemy-drops.json` | 1.2 MB / **4,086 rows** | yes (`enemyDrops.ts`, itemSources) | per-enemy drop rows | fills **265/613 enemy records with no drops** | **S** |
| `open/msb-enemies.json` | 2.9 MB / **31,388 placements** | yes (index build / itemSources) | every placed enemy + `NPCParamID` | enemy **coords** (0 today) / spawn maps | **M** |
| `npc-placements.json` | 180 KB / **1,331 rows, 564 npcs** (111 talking) | yes (`npcPlacements.ts`, `map:merge`) | XYZ + engine `px/py/world` per talking NPC | **npc coords on the page** (58/188 have `map` today) | **S** |
| `open/world-lots.json` | 529 KB / **3,458 rows** | yes (`openData.ts` → `chestFacts` 3,364 chests) | every MSB treasure pickup + flag + XYZ | plot chests on the atlas (currently XYZ-only, not drawn per `DATA.md`) / "where to find" | **M** |
| `open/gathering-nodes.json` | 3.9 MB / **20,222 rows** | yes (Codex-only, guarded) | AEG node `model` code, no item/material field | material farm routes — **but no item field**, honest value low | **L** (data gap, not code gap) |
| `regulation-vanilla-v1.17.json` | 1.1 MB | yes (AR calc, lazy) | `calcCorrectGraphs` 11, `attackElementCorrects` 32, `reinforceTypes` 31, `statusSpEffectParams` 447, `weapons` 3,296 | status/poise/defence math beyond AR; not currently surfaced | **M** |
| `open/text/GR_*`, `TalkMsg` 9,818, `EventTextForTalk` 906, `GR_Dialogues` 262 | 34,053 strings / 36 tables | yes (`gameText.ts`, Dialogue) | verbatim dialogue + UI/help text | speaker-attributed dialogue is capped at **2,083/9,818** by `dialogue-owners.json` (inherent); rest unattributable | **—** (ceiling) |
| `guide/regions/*.json` | 25 files, 1,074 rows | **none** (redundant) | per-region legs + cleanup | fully represented in `guide/legs.json` (124 legs) + `guide/items.json` | **S** (delete/keep archived) |
| `guide/overrides.json`, `checklists/{ammos,classes}.json`, `wiki-db/{class,faction,gesture,lore,mechanic,object}.json`, `checklists/expected-counts.json`, `guide/missable-index.json`, `maps/m1-underground-*.jpg` | small | **none** (redundant, Task 147) | superseded by `entity-overrides.json`, `fanapi/*`, `guide/catalog.json`, `legs.json`, `missables.json`, `m1-underground.jpg` | delete or leave; 0 player value | **S** |

**Not unused** despite surface appearance: `wiki/pages-*.json`, `wiki/search-*.json`
(dynamic), `open/text/*` (dynamic `gameText.ts`), `open/paramdex/*` (extractor), `open/fanapi/*`
(dynamic 14-set loader), `images/**` (image index), `guide/regions/*` (redundant, not missing).
`world-lots.json`, `npc-placements.json`, `gathering-nodes.json`, `regulation-*.json` all have a
live consumer — they are "barely used", not unused.

### 1c. er-mcp.db table census (current)

| used? | tables |
|---|---|
| **used** (`scripts/export-mcp-db.py` reads them) | `pages` 4,939 · `sections` 21,885 · `acquisition` 2,609 → `open/acquisition.json` · `quests` 341 → `open/npc-quests.json` |
| **unused** | `redirects` 2,730 · `bosses` 165 · `spells` 213 · `armor` 680 · `talismans` 156 · `weapons` 480 · `entities` 1,694 · `dlc_categories` 127 · `dlc_report` 7 · `sync_state` 1 · `extract_failures` 0 · `sections_fts`+4 shadow tables |
| **location note** | `data/raw/README.md` expects `data/raw/er-mcp.db`; the actual file present is `.scratch/er-mcp.db` (both gitignored). |

`export-mcp-db.py` joins only `pages`/`sections`/`acquisition`/`quests` (verified at
`scripts/export-mcp-db.py:46,67,87,113,130,133`), so the six parsed tables and `redirects` are dead
weight the app never sees.

---

## 2. Built but unreachable

### 2a. Dead components / modules (imported by nothing in the app)

Verified by case-sensitive import scan over all of `src/`:

| file | export | status |
|---|---|---|
| `src/Reckon.tsx` | `ReckonWorkspace` | imported only by `src/shell/coverage.test.tsx:18` as a **mock**; App routes `me/setup` → `MeSetup`. The old Reckon screen is dead. |
| `src/EntityActions.tsx` | `EntityActions` | no importer, not even a test. The four-action row it defines (Show on map / Mark done / Ask Gideon / Open in Library) is re-implemented in the entity panel. |
| `src/WeaponStats.tsx` | `WeaponStatsSection` | no importer; `src/lib/weaponStats.ts` **is** used, only the rendering section is orphaned. |
| `src/lib/hosted.ts` | `hosted` | no importer anywhere; external-source URL constants (FanAPI, Paramdex, Carian-Archive, BuLEEto). |

### 2b. Exported symbols nothing calls

Token scan over all of `src/` + `scripts/` + tests (a symbol with zero references outside its own
definition): **62 symbols**. Grouped:

- **Dead UI sections never mounted:** `BossDropsSection`, `EngineItemSection`, `ErclSection`,
  `MedusaSection`, `MetaBuildsSection`, `NpcPlacementSection` (`src/PackData.tsx`);
  `QuestStepsSection`, `AcquisitionSection` (`src/CodexData.tsx`); `PickupBar`, `RegionMeter`,
  `RegionSeal`, `StatEdit`, `WhisperGrace` (`src/QoL.tsx`); `EntityActions`; `WeaponStatsSection`.
- **Dead logic helpers:** `achievementSummary`, `bossRosterTotal`, `rosterForRegion`, `findEnding`,
  `findNpcDisplay`, `remembranceCount`, `completionRules`, `enemyCombatFor`, `matchAmmos`,
  `matchClasses`, `matchCreatures`, `useHunts`, `useOpenData`, `useGraceRegions`, `buildChestFacts`,
  `useChests`-adjacent `matchChests` callers, `graceBySlug`, `graceWorld`, `routeIndexFor`,
  `visibleMarkers`, `fetchEngineState`, `resetCharacter`, `importPacketIntoVault`, `diffPackets`,
  `resetGideonSession`, `canonicalNameCount`, `entityIndexMeta`, `loadGameTextManifest`,
  `loadSaveIds`, `matchGuide`, `browserCacheLookup`, `terminateOcr`, `scanImage`, `wordCenterY`,
  `statLabel`, `omniboxCommands`, `JOURNAL_FILTERS`, `EMPTY_CATALOG_INPUT`, `SOURCE_FOLDERS`,
  `categoryMeta`, `awesomeByRole`, `mechanicsBodies`-type audit helpers, `clahe`/`contrastStretch`/
  `isGrayImage` (`ps5Image`, superseded), `buildReferenceFromPlate`, `referenceFromGray`.
- **Fixture-only:** `SCENARIO_REVEALED_REGIONS` (`__fixtures__/scenarios/urmummytoilet.ts`).

Most are low-risk dead code; the six `PackData` sections are the most misleading (they look like
features). Whether to delete or resurrect is an owner call.

### 2c. Feature flags

Only one real on/off feature flag: **`VITE_GIDEON_WEB_SEARCH`** (`src/lib/gideonAgent.ts:28,123`) —
off unless the env var is `'1'`; when on it prepends the `web_search` tool (still bounded by
`MAX_GIDEON_TOOLS`). The other env reads are configuration defaults, not flags:
`VITE_GIDEON_PROVIDER` / `VITE_GIDEON_BASE_URL` / `VITE_GIDEON_MODEL` (`gideonProvider.ts:305-339`),
`VITE_MAP_ENGINE` (`mapEngine.ts:13`), `VITE_GIDEON_API_KEY` (`muse.ts:45`). `FEATURE_LENGTH` in
`ps5Icons.ts` is a constant, not a flag.

### 2d. Unmerged branches (none of these are in `master`)

`git branch --no-merged master`: **task-141, task-143, task-147, task-157, task-161**.

| branch | ahead of master | contains |
|---|---:|---|
| **task-141** | 1 | WIP grace-blob circularity measure in `ps5MapGraces.ts` (**not yet used for snapping**) + a 255-line `ps5MapDiag.ocr.test.ts` + test-timeout tweaks. |
| **task-143** | 6 | **The big one** — planning task with 5 shipped-but-unmerged sections (below). |
| **task-147** | 1 | read-only data-completeness audit report (this is the source of several §1/§3 numbers). |
| **task-157** | 5 | read-only links/inference/dead-end/duplicate audit report. |
| **task-161** | 2 | UX/layout/inference review proposal (docs only). |

**task-143 content** (27 files, +1,942/-41; new files are absent from the current tree):

| § | feature | new files | touches |
|---|---|---|---|
| 1 | **Goal stack** — ordered goals (ending / boss / item / questline / build), vault-persisted, "Add goal" everywhere, Now shows next step | `src/lib/goals.ts` (+test), `src/shell/GoalsCard.tsx` | `types.ts` (Goal/GoalKind), `state.tsx`, `EntityPanel`, `EntityOverlay`, `LibraryBrowser`, `JourneyNow` |
| 2 | **Route optimiser** — pure `routePlan`, orders open to-dos by region adjacency + prerequisites + lockouts, emits reasoned legs; Now route card | `src/lib/routePlan.ts` (+test), `src/shell/RouteCard.tsx` | `JourneyNow`, `index.css` |
| 3 | **Ending chooser** — per-ending remaining requirements, what it locks, side-by-side compare, Set as goal | `src/lib/endingChoice.ts` (+test), `src/shell/EndingsChooser.tsx` | `Quests.tsx` |
| 4 | **NG+ planner** — carry/reset rules, missed vs at-risk (from gates/loot), checklist | `src/lib/ngPlusPlan.ts` (+test), `src/knowledge/ngPlus.ts`, `src/shell/NgPlusCard.tsx` | `JourneyNow` |
| 5 | **Route on map** — optimiser route drawn on the static plate + live engine (postMessage), numbered stops | `src/lib/routeMap.ts` (+test) | `Atlas.tsx`, `vendor/elden-ring-map/web/js/app.js` |

Because task-143 forked from an old `master`, merging needs a rebase onto current `master`; its five
sections are complete and self-contained (each has tests). Second candidate: task-141's grace-blob
snapping aid.

---

## 3. Gaps per kind (coverage now → on-disk fill)

Coverage from `entity-index.json` (n = records; "pic" = non-placeholder image; "ph-pic" = generic
pack-icon placeholder):

| kind | n | desc | pic (real) | ph-pic | coords | drops | strategy/sections | stats | main on-disk fill |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| boss | 281 | 269 (95%) | 68 (24%) | **208 (74%)** | 244 (86%) | 273 (97%) | 276 (98%) | 280 (99%) | `open/boss-images.json` 46, `images/bosses` 146, `open/boss-pins.json` 197, `boss-xyz.json` 209; `bosses-fextralife` bodies |
| enemy | 613 | 530 (86%) | 173 (28%) | 0 | **0 (0%)** | 348 (56%) | 1 (0%) | 588 (95%) | `enemy-drops.json` 4,086, `msb-enemies.json` 31,388 placements, `images/creatures` 109 + FanAPI 115 |
| npc | 188 | 188 (100%) | 61 (32%) | 0 | **58 (30%)** | 0 | 38 (20%) | 166 (88%) | `npc-placements.json` 1,331 rows (111 talkers), `images/npcs` 55, wiki-db/npc |
| item (generic) | 1184 | 1182 | 1,149 | 0 | 0 | 0 | 1 | 1,011 | `guide/items.json`, `open/text/Goods*`, wiki-db/item |
| weapon | 439 | 438 | 420 | 0 | 0 | 0 | 0 | 439 | `images/weapons` 307; 19 missing pics |
| armor | 751 | 751 | 748 | 0 | 0 | 0 | 0 | 686 | `images/armors` 543; 3 missing |
| talisman | 158 | 158 | 155 | 0 | 0 | 0 | 0 | 156 | `images/talismans` 87; 3 missing |
| spell | 218 | 218 | 217 | 0 | 0 | 0 | 0 | 217 | `images/{sorceries,incantations}` 168; 1 missing |
| ash | 125 | 125 | 125 | 0 | 0 | 0 | 0 | 107 | `images/ashes` 80 — **all have pics** |
| spirit | 80 | 80 | 80 | 0 | 0 | 0 | 0 | 79 | `images/spirits` 64 |
| shield | 69 | 69 | 69 | 0 | 0 | 0 | 0 | 69 | `images/shields` 69 |
| region | 295 | 256 (86%) | **0 (0%)** | 0 | **13 (4%)** | 0 | 36 (12%) | 1 | `images/locations` 172, FanAPI locations 177, `map-regions.json` 1,637, `map-extras` locations 313 |
| grace | 417 | **17 (4%)** | 0 | 50 | 417 (100%) | 0 | 0 | 417 | `open/text/PlaceName.json` 1,006, wiki-db/location |
| dungeon | 119 | 115 | 0 | 118 | 119 (100%) | 0 | 11 (9%) | 0 | `images/locations` pack icons (already used), wiki-db/dungeon |
| quest | 467 | 400 (85%) | 27 (5%) | 0 | 0 | 1 | 55 (11%) | 1 | `storylines.ts` + `npc-quests.json` 68/341; `images/npcs` |
| merchant | 80 | 71 | 13 | 0 | 30 | 0 | 11 | 31 | `merchants.ts` stock, `images/npcs` |
| mechanic / build / ending / gate / material | 65/28/5/10/3 | 100% | low | 0 | 0 | 0 | 0 | 0 | authored; pictures not needed |

Per requested field, the biggest fillable gaps:

- **Description:** boss 12 empty (Bell-Bearing Hunters), enemy 83 (e.g. `enemy:aging-untouchable`,
  `enemy:amy-third-sister`), region 39, quest 67 (`line:ymir`, `quest:alexander:*`), grace 400,
  dungeon 4, merchant 9 → wiki-db `*/**.json` + `sections` prose + `open/text` captions.
- **Picture:** boss **208** placeholders → 146 local + 46 `boss-images` (FanAPI predates SotE, so
  DLC bosses stay glyph-only); enemy 440 missing → `images/creatures` 109 (DLC still unfillable);
  npc 127 → `images/npcs` 55; region 295 → `images/locations` 172; grace has only a generic icon
  (no real picture on disk; local `game-icons` could supply sigils).
- **Coords:** enemy 0 → `msb-enemies`/`enemy-combat.placements` centroids; region 4% →
  `map-regions`/`map-extras`; npc 30% → `npc-placements` (fills the remaining ~17 per Task 147 §2);
  boss 86% → `boss-pins`/`boss-xyz`/`coords`; grace/dungeon already 100%.
- **Drops/runes:** boss drops 8 missing, runes 55 missing → `er-mcp.db bosses.runes` fills 28 +
  `bosses-fextralife` per-location runes; enemy drops 265 missing → `enemy-drops.json`.
  (`er-mcp.db bosses.drops` is not named-matched to the index by Task 147 → S.)
- **Phases/strategy:** only **boss** carries strategy/sections (276/281), sourced from
  `bosses-fextralife.json` page bodies. Enemy/region/dungeon have **no strategy field and no on-disk
  source** except `open/gapfill.json` (54 hand-authored records) → not fillable without new scraping.
  No per-phase breakdown exists anywhere on disk; "phases" is not a stored field.

---

## 4. Outbound links (owner rule: no wiki links when we have the data)

### 4a. Every external URL the UI actually renders

Case-sensitive scan of `src/**` for `href=` / `https?://` (non-test): **8 render sites**.

| # | link | render site | target content | on disk? | integrate instead |
|---|---|---|---|---|---|
| 1 | Boss "Full fight guide" | `src/library/BossFacts.tsx:304` (`fext.url`) | Fextralife boss page (strategy/combat/lore/video) | **yes** — `open/bosses-fextralife.json` sections already embedded (276/281 have strategy) | hide the link when stored sections exist; keep only as fallback |
| 2 | "Open full guide" (Guides corpus) | `src/PackData.tsx:238` (`g.url`) | Fextralife guide page | **yes** — `open/guides-fextralife.json` (27 pages / 376 sections) is the excerpt source | render the full stored section; drop the link |
| 3 | GuidesFor cross-link chip | `src/PackData.tsx:279` (`g.url`) | same | **yes** | same |
| 4 | Wiki page chip | `src/library/WikiTab.tsx:43` (`page.url`) | Fandom page | **yes** — `wiki/pages-*.json` + `open/wiki-sections.json` | the tab already renders the sections; the external chip is redundant |
| 5 | Meta-build page link | `src/Build.tsx:192` (`p.url`) | Fextralife build page | **yes** — `open/builds-fextralife.json` (23 pages) | render stored headings/body instead |
| 6 | 4 hardcoded PvP/mechanics links | `src/Build.tsx:289,294,299,304` | Fextralife `PvP_Builds`, `PvP`, `Poise`, `Patch+Notes` | **partly** — Poise/status are in `guides-fextralife` / `builds-fextralife`; patch notes are not on disk | replace present ones; drop the rest |
| 7 | Community resources | `src/library/Guides.tsx:63` (`r.href`) | 25 curated external tools (github ×6, Google Docs ×4, YouTube ×4, Fextralife ×2, FanAPI, Discord…) | **no** (by design, `awesome.ts`) | **keep** — these are curated community links, not wiki data we hold |
| 8 | Gideon answer sources | `src/GideonAnswer.tsx:81` (`s.url`) | provider/web-search citation | mixed | prefer on-disk ids; only when web search was actually used |

Total **UI-rendered external links: 8 sites**, of which **6 point at wiki/guide pages whose text is
already on disk** (← the owner-rule violations), 1 is curated community links (keep), 1 is
model-supplied citations.

### 4b. Data fields that carry URLs but are **not** rendered as links

| field | rows | host | where it would surface |
|---|---:|---|---|
| `entity-index.json` `sourceUrl` | **3,451** (armor 683, item 965, weapon 432, region 249, spell 211, npc 168, talisman 156, …) | `eldenring.fandom.com` | entity panel (no `sourceUrl` reference anywhere in `*.tsx`) |
| `guide/items.json` `wikiUrl` | **2,490** | `eldenring.wiki.gg` | guide cards |
| `open/acquisition.json` `url` | **2,609** | fandom | acquisition lines |
| `wiki/manifest.json` page `url` | **4,939** | fandom | wiki tab metadata |
| `open/npc-quests.json` `url` | 68 | fandom | quest steps |
| `open/bosses-fextralife.json` `url` | 163 | fextralife | boss pages (already linked, #1) |
| `open/guides-fextralife.json` `url` | 27 | fextralife | guides (#2/#3) |
| `open/builds-fextralife.json` `url` | 23 | fextralife | meta builds (#5) |

~13,800 dormant URL values; ~11,300 of them are fandom/fextralife/wiki.gg targets whose prose **is**
already in the entity index / wiki corpus. Rendering any of them would add wiki links the owner rule
forbids while the data is on disk. The right move is to consume the stored prose, not the URL.

Other hosts found only inside section prose (not rendered as links because `WikiMarkdown`/`WikiText`
turn `[[id|label]]` into internal `EntityLink`s): `eldenringpvp.net`, `web.archive.org`,
`en.wikipedia.org`, `store.bandainamcoent.*`, `fcld.ly`, `help.steampowered.com`, `jisho.org`,
`imdb.com`. No UI href.

---

## 5. Ranked build plan — data/feature → where it goes → effort → player value

Ranked by player value per unit effort. Each **batch is file-disjoint** so batches can run in
parallel worktrees without conflict.

**Batch A — Finish the offline player-answer stack (high value).**
1. `player-questions.json` → wire the top "worth filling" clusters (build recommender, PvP level
   reference, beginner primer, pacing) into Library/Gideon. Files: `src/lib/advisor.ts`,
   `src/library/BuildPlanner.tsx`, `src/knowledge/`. **S–M · high.**
2. Owner-review the 239 useful `player-knowledge.json` rows → new `src/knowledge/playerTips.ts` +
   item/mechanic/boss "Player tips" callouts + Gideon retrieval. Files: new module,
   `src/library/EntityKinds.tsx`, `src/lib/gideonTools.ts`. **M · high.**
3. `er-mcp.db redirects` → alias generator. Files: `scripts/gen-aliases.mjs`,
   `scripts/build-entity-index.mjs`. **S · medium.**

**Batch B — Close kind gaps with data already on disk (high value).**
4. Boss/enemy/npc pictures: consume `boss-images.json` (46), `images/bosses` (146),
   `images/creatures` (109), `images/locations` (172), `images/npcs` (55). File:
   `src/lib/entityIndexBuild.ts` + `src/lib/fanImage.ts`. **S–M · high.**
5. Enemy coords: derive centroids from `enemy-combat.placements` / `msb-enemies.json`. File:
   `src/lib/entityIndexBuild.ts`. **M · medium.**
6. Boss runes: mine `er-mcp.db bosses.runes` (fills 28) into the index. File:
   `src/lib/entityIndexBuild.ts`. **S · medium.**

**Batch C — Surface barely-used sources (medium value).**
7. `npc-placements.json` coords on NPC pages (fills ~17 NPCs). Files:
   `src/lib/npcPlacements.ts`, `src/library/EntityPanel.tsx`. **S · medium.**
8. `world-lots.json` chest pins / "where to find" on the atlas. Files: `src/lib/chestFacts.ts`,
   `src/Atlas.tsx`, `src/lib/coords.ts`. **M · medium.**
9. Regulation `statusSpEffectParams`/`calcCorrectGraphs` beyond AR (status/poise panels). Files:
   `src/lib/ar.ts`, `src/lib/weaponStats.ts`. **M · medium.**

**Batch D — Outbound-link cleanup (low effort, owner rule).**
10. Replace the 6 wiki/guide hrefs (#1–#6) with stored on-disk prose; keep community links (#7).
    Files: `src/library/BossFacts.tsx`, `src/PackData.tsx`, `src/library/WikiTab.tsx`,
    `src/Build.tsx`. **S · medium (compliance).**
11. Decide the `sourceUrl` policy (render a single "source" line, or drop the fields). Files:
    `src/lib/entityIndexBuild.ts`, `src/library/EntityPanel.tsx`. **S · low.**

**Batch E — Dead-code + branch cleanup (maintenance).**
12. Remove/relocate the 4 dead modules and triage the 62 unused exports. Files: `src/Reckon.tsx`,
    `src/EntityActions.tsx`, `src/WeaponStats.tsx`, `src/lib/hosted.ts`, `src/PackData.tsx`,
    `src/CodexData.tsx`, `src/QoL.tsx`. **S · none directly.**
13. Rebase + merge **task-143** (goal stack, route optimiser, ending chooser, NG+ planner, route on
    map). Files: the 27-file set in §2d. **L · high.** Second: task-141 grace-blob snapping. **M.**

---

## ASSUMPTIONS

- "Used" = referenced by `src/` or `scripts/` code, matching `docs/DATA-CATALOG.md` methodology, but
  I corrected it for **dynamic loaders** (`wikiSearch.ts`, `gameText.ts`, the FanAPI 14-set loader),
  which the catalog missed for `wiki/pages-*` and `wiki/search-*`.
- Coverage is measured on `entity-index.json` (generated 2026-10-08), not on the runtime panel
  model; a record can have a field the panel still does not render.
- "Placeholder picture" = an `image` pointing at `/sourced/pack-icons/*`; a real picture is any other
  `image` value (local `/sourced/images/**` or FanAPI URL). A "real" URL is not proof the remote file
  loads.
- The 62-symbol dead-export list comes from token-presence across `src`+`scripts` (tests included);
  it cannot see re-exports through `export *` (there are none) or reflection.
- Effort S ≈ ≤½ day, M ≈ 1–2 days, L ≈ 3–5 days; ratings are my judgement.
- `player-questions.json` was already fully documented by Task 179; I did not re-cluster it.
- Link counts are render *sites*, not instances (one site renders once per record/row).

## Not done

- No app, generator, data or generated file was changed (READ-ONLY per the brief); nothing imported
  or deleted.
- Full gates were **not** run: the brief is read-only and no `src/`/script/test changed, so there is
  nothing for `npm test` / `tsc` / build to validate. Helper scripts were run via `python` only.
- `docs/DATA-CATALOG.md` and `docs/ENTITY-COVERAGE.md` were not regenerated (would need the heavy
  generators; the brief says not to regenerate generated files).
- I did not open `.env` / `.env.local`.

## Brief checklist

- [x] 1. Unused data: every source kind covered — `player-knowledge.json` (5,718 rows / 239 useful), `player-questions.json` (6,581), wiki redirects (2,730 / ~2,073 new aliases), dialogue (TalkMsg 9,818, 2,083 attributable), NPC placements (1,331), gathering nodes (20,222), world lots (3,458), regulation params; all 21 er-mcp.db tables classified; counts, target page/feature and S/M/L effort per row
- [x] 2. Built but unreachable: 4 dead modules (`Reckon.tsx`, `EntityActions.tsx`, `WeaponStats.tsx`, `lib/hosted.ts`), 62 zero-reference exports, the 1 real feature flag (`VITE_GIDEON_WEB_SEARCH`), and all 5 unmerged branches with task-143's 5 sections itemised
- [x] 3. Gaps per kind (boss/enemy/npc/item kinds/region/grace/dungeon/quest): description, picture, coords, drops/runes, strategy coverage table + the named on-disk fill source and whether a fill exists
- [x] 4. Outbound links: all 8 UI render sites counted with target, on-disk availability (file/table cited) and integration path; plus the ~13,800 dormant URL values in data fields
- [x] 5. This report: ranked "data/feature → where it goes → effort → player value" grouped into file-disjoint batches A–E (3–6 items each), with assumptions, not-done and this checklist

ALL ITEMS DONE
