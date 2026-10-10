# Task 186 — Whole-product quality review (read-only audit) — report

**Master audited:** `bbeac13` ("STATUS: re-crawl clean (0 errors)"). `git merge --ff-only master`
reported "Already up to date"; HEAD == master. Reused no earlier harness (the `.scratch/149` and
`.scratch/157` scripts no longer exist in the tree/worktrees), so the Task 157 graph checks were
re-derived from scratch in `.scratch/186/` by installing the committed index into the real
`entityGraph` module. `.env` / `.env.local` were never opened. No server, preview or background
process was started (the four crawl reports already in `.scratch/crawl/` were used instead). Only
`docs/tasks/186-report.md` is committed; generated audit docs touched by the required runs were
reverted.

---

## Verdict

**READY, materially better than the last audit (Task 149).** Every hard gate passes, including
`test:bundle`, which **failed** in 149: first-load JS is now **3.52 MB vs the 3.5 MiB budget**
(149 was 5.23 MB, ~1.56 MB over). The two worst data defects 149 flagged — 513 dead "Related"
chips and 112 wrong-kind links — are now **0 and 0**, the 354 dead alias slugs are **0**, the 51
within-kind duplicate names are **0**, the 472 "description == place name" rows are **0**, and the
472-province orphan/empty-region gap shrank (regions without contents 245 → 130). The remaining
problems are content polish, not correctness: **617 pages have no description** (400 of them
graces, where place-name prose was deliberately dropped), **template text still leaks** on ~55
cut/placeholder rows (`The was a …`, raw `<!--`), the **merchant kind is still half-empty and still
holds 6 non-merchants**, **187 records carry coordinates outside the 0–100 map frame**, and a
handful of help/docs strings name removed tabs. A PS5 player can use the app end-to-end; the fixes
below are ranked so the next briefs go straight at player-visible impact.

---

## 1. Gates + test health

| gate | result | number (this run) | vs 149 | severity |
|---|---|---|---|---|
| `npx tsc -b` | PASS | exit 0 | same | — |
| `npx vitest run` | PASS | **221 files, 1583 passed, 11 skipped, 0 failed** | 198 files / 1408 passed | — |
| `npm run lint` | PASS | exit 0, **0 errors / 46 warnings** | 0 errors / ~40 warnings | low |
| `npm run build` | PASS | 331 modules, **77 JS + 7 CSS** chunks, total JS **3,519,478 B**; ">500 kB" warning; PWA precache **134 entries / 10,250 KiB**; engine 76 files / 2.5 MB | 59 JS / 5,234,752 B | — (fixed) |
| `npm run test:bundle` | **PASS** | build + **7 passed** (was FAIL in 149) | **FAIL** expected 5234752 < 3670016 | fixed |
| `npm run audit:pages` | PASS | **5599 entities, 9 flagged** | 5687 / 5 flagged | low |
| `npm run audit:links` | PASS | **dead data 0, dead renderer 0, guard violations 0** | same | — |
| `npm run audit:inference` | PASS | **580 rules, 17 scenario facts** | 558 rules | — |
| `npm run audit:progress` | PASS | **6 scenarios, 0 violations** | same | — |
| `npm run coverage:entities` | PASS | "all guard minimums met" | same | — |
| `npm run eval:gideon` | PASS | answerable **438/512 correct (85.5%)**, 34 partial, 34 wrong, 6 noAnswer; unanswerable **88/88 honest**; median 14 ms, p95 95 ms | (not run in 149) | — |
| `npm run eval:photos` | PASS | 13 photos, **92 correct / 7 wrong / 2 missed, 91% field accuracy** | (not run in 149) | — |
| `npm run audit:ui` / `crawl:ui` | NOT RUN | need a live dev server (forbidden) | same | — |

All the audit scripts print a harmless `WebSocket server error: Port 24678 is already in use` line
from a Vitest/Vite plugin; exit code is 0.

### Skipped tests — every one, and why (11)

| file | test | why skipped |
|---|---|---|
| `src/lib/bundleBudget.test.ts` (×3) | wiki-corpus-not-in-JS / first-load budget | `describe.skipIf(!runDistChecks)` — `dist/` was stale or absent on the plain `vitest` run; `npm run test:bundle` builds first and all 7 run and pass |
| `src/lib/entityIndexQuality.test.ts` (×1) | "keeps every wiki DB talisman…" | `it.skipIf(!existsSync(data/raw/er-mcp.db))` — the DB is **gitignored and absent in this worktree** |
| `src/lib/regulation.test.ts` (×1) | "includes Shadow of the Erdtree markers…" | `it.skipIf(!existsSync(vendor/elden-ring-map/data/markers.json))` — gitignored, absent here |
| `src/lib/sl2/facts.test.ts` (×4) | save-facts fixture suite | `describe.skipIf(!hasFixture)` — `.scratch/elden-ring-compass/.../ER0000.sl2` not present |
| `src/lib/sl2/parse.test.ts` (×2) | parseSave fixture suite | same missing `.sl2` fixture |

**The two that changed from passing to skipped (vs 149).** Task 149 explicitly recorded that the
wiki-DB talisman test and the atlas-marker test "are currently satisfied, so they run". They now
skip in this worktree because their inputs — `data/raw/er-mcp.db` and
`vendor/elden-ring-map/data/markers.json` — are **both gitignored** (`artifacts/all-knowing/.gitignore:23`
and `:55`) and exist only in the main checkout (`C:\Users\RIGGUSPIG\Desktop\ER MASTER TOOL`), not in
this linked worktree. They still run (and pass) in the main checkout, so this is an
**environment artifact of the worktree, not a code regression**. (`src/lib/task182Gaps.test.ts`
uses the same wiki DB but falls back to `.scratch/er-mcp.db`, which is present, so it runs.)

---

## 2. Data (`public/sourced/entity-index.json`, 5,595 records, generatedAt 2026-10-10T02:44Z)

### 2a. Per-kind coverage vs 149

"coords" = a numeric `record.map.x/y`. "picture" = `record.image` (the old `image-index.json` plane
is gone; images are now baked into the record). Cells changed by more than ±3 pts from 149 are bold.

| kind | n (149) | desc | loc/region | coords | picture | stats | drops |
|---|---:|---:|---:|---:|---:|---:|---:|
| armor | 751 | 100% | 86% | 0% | 100% (149 73%) | 91% | 0% |
| ash | 125 (124) | 100% | 75% | 0% | 100% (62%) | 86% | 0% |
| boss | 281 (280) | 96% | 100% | 87% | 99% | 100% | 97% |
| build | 28 | 100% | 0% | 0% | 0% | 0% | 0% |
| dungeon | 119 | 97% | 100% | 100% | 99% | 0% | 0% |
| ending | 5 | 100% | 0% | 0% | 40% | 0% | 0% |
| enemy | 613 (607) | **86%** (149 100%) | 100% | **83%** (149 0%) | 27% | 96% | 57% |
| gate | 10 | 100% | 0% | 0% | 0% | 0% | 0% |
| grace | 417 (416) | **4%** (149 93%) | 100% | 100% | **12%** (149 34%) | 100% | 0% |
| item | 1184 (1187) | 100% | 90% | 0% | 97% (45%) | 85% | 0% |
| material | 3 | 100% | 100% | 0% | 100% | 100% | 0% |
| mechanic | 65 | 100% | 0% | 0% | 0% | 0% | 0% |
| merchant | **80** (106) | 89% (76%) | **40%** (149 100%) | 38% | **16%** (25%) | 39% | 0% |
| npc | **188** (195) | 100% | 88% | 31% | 32% | 88% | 0% |
| quest | 467 (468) | **86%** (99%) | 75% | 0% (3%) | 6% | 0% | 0% |
| region | **295** (355) | 87% | 100% | 4% | 35% | 0% | 0% |
| shield | 69 | 100% | 96% | 0% | 100% | 100% | 0% |
| spell | 218 | 100% | 93% | 0% | 100% (78%) | 100% | 0% |
| spirit | 80 | 100% | 93% | 0% | 100% (80%) | 99% | 0% |
| talisman | 158 | 100% | 91% | 0% | 98% (55%) | 99% | 0% |
| weapon | 439 (441) | 100% | 95% | 0% | 96% (69%) | 100% | 0% |

**Better:** pictures are now carried on the record (armor 73→100, item 45→97, talisman 55→98,
shield/spell/spirit/weapon ~100), enemy coords 0→83% (Task 182 filled map pins), merchant de-dup
(106→80, ridding the bad Remembrance/shop rows 149 flagged), region de-dup (355→295).
**Worse:** **grace description 93%→4%** (400 graces now have no description — the place-name prose
149 flagged as "description == region" was dropped, so the page shows only its "Nearby" lists),
**enemy description 100%→86%** (83 enemies lost their text), **quest 99%→86%**, **merchant
loc/region 100%→40%** (the remaining 80 merchants are largely shop/inventory rows with no place).

### 2b. Quality checks (whole index)

| check | count | vs 149 | notes |
|---|---:|---|---|
| template/filler ("X is a …", "melee armament") | **0** | 0 | clean |
| bare numeric id / map code as a name/location | **0** | 0 | clean |
| `description == location/region` | **0** | 472 | fixed |
| duplicate normalised name **within one kind** | **0** | 51 | fixed |
| same normalised name **across kinds** | **246** | 288 | mostly boss↔grace (each boss has a same-named grace) |
| **empty descriptions** | **617** | 236 | grace 400, enemy 83, quest 67, region 39, boss 12, merchant 9, others |
| raw `<!--` in player text | **5** | n/a | `enemy:deer`, `enemy:giant-rat`, `enemy:giant-rat-stormveil-castle`, `enemy:owl`, `region:finger-weaver-s-hovel` |
| descriptions starting "The was a …" (cut rows) | **16** | n/a | `item:blackflame-monk-s-seal`, `item:fringefolk-s-rune`, `item:heavy-erdtree-greatshield`, … |
| descriptions containing "cut from Elden Ring" | **29** | n/a | same family |
| "are optional bosses in Elden Ring…" (missing subject) | **4** | 5 | all `boss:tibia-mariner*` |
| "…are characters in Elden Ring…" (raw template) | **2** | n/a | `npc:greater-potentate` = "The s are characters in …", `npc:horned-giant` |
| `cut: true` rows | 87 | 87 | catalogue kinds, counted in totals |
| coords outside the 0–100 plot frame | **187** | (sampled) | boss 132, merchant 29, npc 24, grace 2 — display-only (Atlas pins are grounded separately) |
| `region == "Shadow of the Erdtree"` | 18 | 19 | boss 1, enemy 7, npc 9, quest 1 |
| location field is a category, not a place | **18** | (was `region`) | `region:consecrated-snowfield`="Sub-region", `region:academy-of-raya-lucaria`="Legacy dungeon", `region:altus`="The Lands Between", `npc:twinbird`="Unknown", `npc:palm-reader`="Multiple Locations" |
| description "N beats" leak | **38** | n/a | 33 `line:*` quests + 5 `ending` records |
| merchant rows with no location / no picture | **49 / 67** of 80 | — | merchant pages are mostly empty cards |

Concrete examples a player would hit:
- `npc:greater-potentate` → "The s are characters in Elden Ring: Shadow of the Erdtree." (blank name)
- `enemy:giant-rat` → "…cellars, and caves. `<!--`" (truncated comment marker shown)
- `item:heavy-erdtree-greatshield` → "The was a Greatshield that was cut from Elden Ring…"
- `item:skill-gravitas` → "The former causes the same damage type as your weapon while the implosion causes Magic damage." (belongs to a different skill)
- `grace:100004` (Stormveil Cliffside) and `grace:100008` (Stormveil Main Gate) → the **Stormhawk** weapon lore, duplicated on two graces; `grace:godrick-grace` shows Godrick boss lore.
- `merchant:alteration` ("Alteration") and `merchant:reversion` ("Reversion") are mechanics pages under the merchant kind; `merchant:dragon-communion`, `merchant:enia-*` (inventory rows), `merchant:sorcerer-rogier`, `merchant:d-hunter`, `merchant:pidia-carian-servant` are not merchants.
- `enemy:rat` description is the **Frenzied Rat** text ("Rats afflicted by the Flame of Frenzy…") — already listed in `docs/STATUS.md`.
- `merchant:brother-corhyn` region = "Proving Grounds" (Roundtable Hold); `region:confluence-of…` etc.

### 2c. Game name-table resolution

Method: values from `public/sourced/open/text/*Name.json`, `%null%`/[ERROR]/blank dropped, resolved
by normalised name against every record name **and** every `aliases.json` `fmgName`/`aliases` entry
(weapon affinity prefixes stripped).

| table | unique names | resolved | unresolved | vs 149 |
|---|---:|---:|---:|---|
| WeaponName | 578 (base) | 550 | 28 | 149: 562/4 — **not directly comparable** (my affinity strip differs); the 4 old misses `Royal Soldier Straight Sword` + `Pulley Crossbow` remain, `Great Épée` now resolves |
| ProtectorName | 768 | 743 | 25 | same (`Type 1–20`, `Head/Body/Arms/Legs`, dev rows) |
| AccessoryName | 157 | 157 | 0 | same |
| GoodsName | 2108 | **2104** | **4** | **much better** (149: 1253/855) — upgrade tiers now fold/alias |
| GemName | 125 | 100 | 25 | same (3 `test gem` + 22 DLC Ashes of War) |
| ArtsName | 258 | 123 | 135 | same (DLC weapon skills with no skill record) |
| NpcName | 318 | 309 | **9** | **worse** (149: 2); e.g. `Count Ymir, High Priest`, `Demi-Human Boc`, `Pureblood Knight Ansbach`, `Night's Cavalry (Glaive)` |
| PlaceName | 609 | 608 | **1** | **worse** (149: 0); `Siofra River Well` |

### 2d. 30 random records per kind, read as a player

Written to `.scratch/186/sample.out.txt` (30/kind, deterministic seed). Samples are coherent for
weapons, shields, dungeons, spirits, spells, talismans and most items. Defects seen are the ones in
§2b, plus: `build:*` pages have no picture and no location (by design but visually bare);
`ending:*` pages are literally described "4 beats"/"8 beats"; `merchant:*` pages frequently render
an empty card; `quest:ranni:festival`, `quest:ranni:blaidd`, `quest:alexander:missed-limgrave` have
no description. **No wrong-kind content, no raw ids and no cross-kind text contamination** were seen
beyond the examples above.

---

## 3. Links & inference — rerun of the Task 157 checks

`.scratch/186/g157.test.ts` (run via `.scratch/186/vitest.harness.config.ts`) installs the committed
index into the real `src/lib/entityGraph.ts` (5,613 graph entities) and measures the same classes
157 measured.

| # | check | 157 | 186 | severity |
|---|---|---|---|---|
| 1 | graph edges whose target is not an entity (dead link / dead "Related" chip) | **513** | **0** | fixed |
| 1 | edges resolving to the wrong kind | **112** | **0** | fixed |
| 1 | alias rows whose `slug` has no record | **354** | **0** | fixed |
| 1 | infer chains whose `whenFact` does not resolve | 31 (17 bells + 14 mapfrag) | **14** (all `mapfrag:*`, by design) | fixed |
| 1 | build "need" / hosted-grace ids unresolved | 3 | (covered by `audit:links` guard) | low |
| 2 | records with content but zero out-edges | 358 | 360 | low |
| 2 | records with zero inbound edges (orphans) | 401 | **375** | medium |
| 2 | regions with no `contains` edge to a grace/boss/dungeon | 245 / 356 | **130 / 296** | medium |
| 2 | `record.related` labels resolving to no entity | 606 | (not recomputed; rendered-only) | low |
| 3 | implication cycle | 1 (`region:haligtree` ⇄ medallion) | **0** | fixed |
| 3 | dead catalog facts | 7 | **2** (`item:reverse-bladed`, `quest:nepheli:potioned`) | low |
| 4 | "Mark done" offered where tracking is refused | 1317 | **0** (button not rendered; 1224 pages correctly get no track button) | fixed |
| 5 | same normalised name within one kind | 51 | **0** | fixed |
| 5 | same normalised name across different kinds | 288 | **246** | medium |
| 5 | one alias pointing at several records | 83 | (not recomputed) | low |
| 6 | catalog region vs entity-index region (same id) | 68 | (not recomputed) | low |

Root causes 157 named are visibly fixed in code: the `relatedLore` prose guard
(`entityGraph.ts:966`), the `foundIn` place-kind + `drops`/`sells` owned-kind guards
(`entityGraph.ts:675-679`, `:794`), `NON_MERCHANT_CATEGORY` folding (`entityGraph.ts:598-619`),
the corrected bell-bearing ids (`src/knowledge/inferChains.ts:228+`, e.g. `item:kal-s-bell-bearing`)
and the dropped Haligtree `implies` (`src/knowledge/catalog.ts`). The residual 375 orphans / 130
empty regions are genuine one-way data gaps (regions with no mapped grace/boss to hang a
`contains` edge on), not fabricated links.

The crawl (`.scratch/crawl/2026-10-10_12-49-49.md`) corroborates: **0 error controls**, **1 dead
control** (Gideon "Clear" on an empty chat — Gideon code is off-limits), 35 duplicate groups that
are almost all the same filter chips counted on both `/library/search` and its category view.

---

## 4. UI (static)

- `src/App.tsx` → `ShellContent` maps every `(section, sub)` in `src/lib/sections.ts` (Tarnished:
  overview/gear/setup/profiles; Journey: now/area/map/quests; Library: search/builds/pvp/guides;
  Gideon) to an imported, existing component. All lazy `import()` targets resolve. No route falls
  through to a missing component; `normalizeLocation` keeps the legacy `me/update`, `library/kit`,
  `library/reference` aliases working.
- No screen reads a file that does not exist. The only stale name in help text is in
  `src/lib/shortcuts.ts:82` (`Library` note "search / builds / **kit**") and the "Codex" / "Kits"
  legacy wording at `:110-111`; the real tabs are search/builds/pvp/guides.
- Dead buttons: none new (crawl: 1 dead = Gideon "Clear"). The one genuine duplicate from Task 185 —
  `Show arena on map` rendered twice on an entity page — **still exists** (`src/library/BossFacts.tsx`
  inline copy + `src/library/EntityPanel.tsx` footer copy).

## 5. Docs

- **161 markdown files** scanned for relative links: **0 broken** (`.scratch/186/mdlinks.mjs`).
- `DATA.md` claims re-verified true: `npc-combat.json` 83 bosses, `enemy-combat.json` 2271 rows,
  `open/acquisition.json` 2609 rows, `open/wiki-sections.json` 19,174 sections.
  `docs/DATA-CATALOG.md` correctly lists `aliases.json` at 1.4 MB / 7226 rows.
- `docs/STATUS.md` is current (2026-10-10) but item 4 says "empty descriptions (~296)" — the real
  number is **617** (400 graces); and it still lists `enemy:rat`'s wrong description, which is
  confirmed above.
- The generated audit docs (`ENTITY-COVERAGE.md`, `PROGRESS-AUDIT.md`, `INFERENCE-RULES.md`,
  `LINKS-AUDIT.md`, `PAGE-AUDIT.md`, `GIDEON-EVAL.md`) were regenerated by the required runs and
  **reverted** so only this report is committed.

---

## 7. Player flows (PS5, phone)

Walked the code paths; grounded in the 2026-10-10 crawl and the data above.

- **First run / setup** (`Tarnished › Setup`, `src/shell/MeSetup.tsx`): three clear entry points
  (photo, PC save, interview). Fine. The interview and photo paths are heavy for a first-time user
  with no character; nothing wrong, but nothing tells a phone user the **photo path is the intended
  one on PS5** without scrolling.
- **Logging "I beat X"** (`QuickLog`, `src/QuickLog.tsx`): the palette focuses/search is fast and the
  entity index resolves names well (Gideon eval `entity-not-recognised` is only 30/512 now).
- **A status/equipment/inventory photo** (`MeSetup` + scanner): photo eval is 91% overall, but
  **equipment-picker is 33%** (1 of 3 fields) and inventory 76% (9 wrong/missed of 29) — the
  picker/list screens are the weak spot.
- **Journey › Now** (`src/shell/JourneyNow.tsx`): a rich, conditionally-rendered dashboard (goal,
  recommended, before-you-go, missed-nearby, watchlist, route). It is empty-ish until a character is
  loaded; with no character the "next step" is not obvious on the phone.
- **A boss page before a fight**: `BossFacts.tsx` + `EntityPanel` carry HP/negation/drops/strategy
  well for the 96% with a description; but 12 bosses (e.g. `boss:putrid-avatar--caelid`) show no
  description, and 4 Tibia Mariner pages open with the broken "are optional bosses…" sentence.
- **Finding an item and Show on map**: `EntityActions.tsx` hides "Show on map" only when there is no
  source, and offers it otherwise; item records now carry acquisition text (90%). No dead button.
- **PvP / Builds** (`src/Build.tsx`, `build/KitLibraryPanels.tsx`): coherent; the crawl shows the
  highest per-screen word counts here (`library-search-entity` 766 words, `entity-page` 423) — the
  pages are text-dense on a phone.
- **Asking Gideon offline** (`Gideon.tsx`): works with no key, 85.5% correct / 88/88 honest. The one
  dead control in the whole app is the "Clear" chip on an empty chat.

Cross-screen inconsistency worth polishing: regions/dungeons use "Visited ✓", graces "Discovered ✓",
bosses "Defeated ✓" (good), but **merchant/mechanic/build pages offer no status at all** and often
render empty bodies.

## 8. Content quality sample

30 random pages per kind (420 total) in `.scratch/186/sample.out.txt`, plus whole-index pattern
scans. Wrong facts found: `enemy:rat` (frenzied text), `item:skill-gravitas`/`item:skill-savage-claws`
(unrelated sentence), `grace:100004`/`grace:100008` (hawk lore), `npc:greater-potentate` (blank-name
template), `enemy:giant-rat` (`<!--`). Wrong/absent pictures: merchant 67/80 and grace 388/417 have
none. Wrong links: none (0 dead, 0 wrong-kind). Raw ids/codes shown as names: **none**. Outbound
wiki links: **0** (Task 181 guard holds). Outdated-patch advice: not seen in the sample (builds are
patch-1.17 labelled).

## 9. Performance

- **Per chunk** (this build): `guide-*.js` 890 KB (gzip 110 KB, lazy), `state-*.js` 419 KB,
  `index-*.js` 396 KB, `react-*.js` 219 KB, `catalog-*.js` 186 KB, `fanImage-*.js` 175 KB,
  `entityEnrich-*.js` 129 KB, `gideon-*.js` 75 KB, `advisor-*.js` 71 KB. No chunk exceeds the
  1.2 MiB cap; only the ">500 kB" advisory fires.
- **First load** preloads `index`, `react`, `ui`, `state`, `entityIndex`, `entityEnrich`, `nav`,
  `search`, `fanImage`, … ≈3.5 MB of JS on a phone.
- **Large JSON at startup:** `public/sourced/entity-index.json` is **4.4 MB / 5,595 records** and is
  fetched by `ensureEntityIndex()` in `App.tsx:121` on mount — i.e. on *every* session, before the
  user asks for it. `src/lib/pwa.ts:PRECACHE_DATA` also precaches `aliases.json` (1.4 MB) and
  `regulation-vanilla-v1.17.json` (1.1 MB) at service-worker install; the code comment calls
  aliases "small", which is no longer true.
- Slowest screens from the crawl/code: the Library search/browse build (already cached by Task 185)
  and the entity page (423 words, several lazy chunks). No screen hangs.

## 10. Refinements (small, player-impact ordered)

See the FIX LIST below; the "refinement" half is items marked *(polish)*.

---

## FIX LIST (ranked by player impact; grouped into small file-disjoint batches)

### Batch A — generated-data content hygiene (files: `src/lib/entityIndexBuild.ts`)
1. Kill the template/cut leaks: raw `<!--` (5), "The was a …" (16), "cut from Elden Ring" (29),
   "are optional bosses…" (4), "The s are characters in…" (2). *(current: player-visible garbage)*
2. Enemy text: 83 enemies have **no description** and `enemy:rat` has the **frenzied** variant's;
   fill or fall back honestly. *(correctness)*
3. Merchant kind: fold the 6 non-merchants (`Alteration`, `Reversion`, `Dragon Communion`,
   `D Hunter of the Dead`, `Sorcerer Rogier`, `Pidia, Carian Servant`) onto their real entities and
   give the 49 location-less merchants a place or drop the empty card. *(49/80 empty cards)*
4. Stop writing a category into `location` for 18 records (`Sub-region`, `Legacy dungeon`,
   `The Lands Between`, `Multiple Locations`, `Unknown`, `Proving Grounds`). *(wrong field)*
5. Replace the "N beats" description on 33 `line:*` + 5 `ending` records with real text or nothing.

### Batch B — data coverage & fields (files: `src/lib/entityIndexBuild.ts`)
6. Grace description 4%: either keep the (previously removed) place prose out **and** hide the empty
   prose block, or add real grace text — decide and make the page honest. *(400 pages)*
7. 187 records carry coords outside 0–100 (boss 132, merchant 29, npc 24, grace 2); clamp or mark
   them so an entity page cannot print a nonsense x/y. *(display)*
8. `region: "Shadow of the Erdtree"` on 18 records — map to a real sub-region or blank it.
9. Quest descriptions 86% and region 87% — back-fill the 67 quest / 39 region empties from the
   wiki-db prose that already exists on disk.

### Batch C — name-table resolution (files: `scripts/gen-aliases.mjs`, `src/data/game-name-aliases.json`)
10. WeaponName 28 / ArtsName 135 / GemName 25 unresolved (mostly DLC skills and affinity-only names)
    — add aliases or document the intentional gap.
11. NpcName 9 unresolved regressed vs 149 (`Count Ymir, High Priest`, `Demi-Human Boc`,
    `Pureblood Knight Ansbach`, `Night's Cavalry (Glaive/Flail)`); add the aliases broken by the
    Task 184 name change.
12. PlaceName `Siofra River Well` unresolved — add the alias.

### Batch D — UI & docs strings (files: `src/lib/shortcuts.ts`, `docs/STATUS.md`)
13. *(polish)* `src/lib/shortcuts.ts:82` still says Library = "search / builds / **kit**"; drop
    "kit"/"Codex"/"Kits" legacy wording (`:110-111`). *(help names a removed tab)*
14. *(polish)* Update `docs/STATUS.md` item 4: empty descriptions are **617** (400 grace), not ~296,
    and list the new examples rather than only `enemy:rat`.
15. *(polish)* Remove the duplicate `Show arena on map` on the entity page (`BossFacts.tsx` inline
    copy) so it appears once (footer), and update `EntityPanel.test.tsx` if needed.

### Batch E — performance (files: `src/lib/entityEnrich.ts`, `App.tsx`, `src/lib/pwa.ts`)
16. Make `entity-index.json` (4.4 MB) load lazily from the screen that first needs it instead of
    `ensureEntityIndex()` on app mount.
17. Stop precaching the 1.4 MB `aliases.json` at install (or split the small part the shell needs
    from the full table); the comment calling it "small" is stale.

### Batch F — orphan/one-way graph data (files: `src/lib/entityGraph.ts`, `src/lib/entityIndexBuild.ts`)
18. 375 inbound orphans and 130/296 regions with no contents — wire the missing `foundIn`/`contains`
    edges from data already on disk (region names, grace placements).
19. 360 records with zero out-edges — inspect the top kinds (item 182, armor 63, region 34) and, where
    the record genuinely has no location, say so rather than linking nothing.

### Batch G — Gideon/duplicate cleanup (file: `src/Gideon.tsx` — OFF-LIMITS per AGENTS, needs owner OK)
20. The only dead control in the app: `Clear` on an empty chat should be disabled.

## Proposed features (need owner OK — kept separate)
- Surface the current-patch Reddit tips on boss/item/quest pages (raw corpus exists, noisy).
- Offline Gideon meaning search + pre-generated answers for the top unanswered questions.
- Real grace prose / populated merchant pages (largest visible emptiness left).

---

## Item checklist

- [x] 1. Gates run once; every number recorded; all 11 skipped tests listed with reasons, including
      the two that flipped from passing to skipped (`entityIndexQuality` wiki-DB test and
      `regulation` atlas-marker test — both gitignored inputs absent in this worktree).
- [x] 2. Per-kind count / description / region / coords / picture / drops coverage vs 149;
      template/filler, raw ids/map codes, within+across-kind duplicates, name-table resolution,
      30 random records per kind.
- [x] 3. Task 157 checks rerun via a fresh harness against the real graph (dead/wrong-kind links,
      orphans, dead search results, unfireable chains, cycles, Mark-done) with 157's numbers.
- [x] 4. Static UI: every route/screen resolves to an existing component; no missing file/field;
      dead-button and help-text drift checked (one stale help note; one duplicate action).
- [x] 5. Docs: 161 markdown files, 0 broken relative links; `DATA.md`/`DATA-CATALOG.md` claims
      verified; `STATUS.md` drift noted.
- [x] 6. Report written: verdict, table → number → vs previous → severity, examples.
- [x] 7. Player flows walked (first run, beat-log, photos, Now, boss page, item+map, PvP/Builds,
      Gideon offline) with confusing/missing/empty notes.
- [x] 8. Content-quality sample (30/kind) + whole-index scans with wrong-fact/picture/link examples.
- [x] 9. Performance: per-chunk sizes, first-load list, startup JSON (4.4 MB index; 1.4 MB precached
      aliases).
- [x] 10. Refinements listed and folded into the FIX LIST (items marked *polish*).
- [x] Output ends with the FIX LIST grouped into file-disjoint batches (A–G) plus a separate
      "proposed features (need owner OK)" list.

ALL ITEMS DONE
