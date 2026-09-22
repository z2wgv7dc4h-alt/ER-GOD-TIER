# Claude / DeepSeek — complete handoff

You are continuing **All-Knowing**, a local-first PWA meant to be the best Elden Ring workspace (base + Shadow of the Erdtree + Tarnished Pack). Wyatt’s bar: interactive, intuitive, PS5-first state capture, PC save optional, Gideon as planner, one shared character.

This file is the briefing. Code contracts are also in `HANDOFF.md`. Data inventory is `DATA.md`. Do not throw away the kernel.

---

## 1. Product (what Wyatt asked for)

A single tool that beats wiki tabs + MapGenie + spreadsheet trackers.

**Must**
- One character state shared by map, build lab, quest graph, item codex, Gideon.
- PS5 players can get current without a `.sl2`: interview + screenshots + typed names.
- PC players can drop a save or live-sync EldenRingMap.
- “I want X ending. What next?” — Gideon answers from *this* character (locks, level, detours), can pin the atlas and list steps.
- Blitz (shortest Elden Lord) or a named storyline; mid-run “what is still available.”
- OP builds; spell/item locations; “I’m done” ticks the current beat.
- Persistent profiles (save/load, packet file).
- Base + SotE + Tarnished Pack. Not Nightreign in v1.

**Tone / UI**
- Dark ER: gold on soot, three columns (Identity / Stage / Guide).
- Sit mode for TV / phone / PS5 companion.
- Gideon is Gideon Ofnir, not a generic chatbot.

**Non-goals**
- No uploading saves or shots.
- No save editing / cheating.
- No shipping FromSoftware map archives you don’t already have locally.
- Do not invent attack rating.
- Do not treat Fextralife HTML as param truth.

---

## 2. What exists (skeleton — treat as real)

Repo: `artifacts/all-knowing`

```
Identity 220 │ Stage │ Gideon 320
Rooms: Reckoning, Atlas, Build lab, Quest graph, Codex
```

**Kernel**
- `src/types.ts` — Character, facts, shots, modules
- `src/state.tsx` — workspace + vault persist (`all-knowing.vault.v1`)
- `src/lib/infer.ts` — apply/deny/clear, `closeWorld` (catalog `implies` + Task 54 chains), `knownFactIds`, **`prefixKind`** for dump ids
- `src/lib/merge.ts` — union characters
- `src/lib/vault.ts` / `packet.ts` — profiles + export file
- `src/lib/gideon.ts` + `Gideon.tsx` — `askGideon` → `GideonAct`
- `src/lib/search.ts` — `searchSync` (command bar, Gideon log, Reckon extra, fallback)
- `src/lib/aliases.ts` — Paramdex 418 warps + name link to seed slugs
- `src/lib/mapEngine.ts` — EldenRingMap SSE (`/er-map` in dev)
- `src/lib/coords.ts` — loads guide pins + boss pins
- `src/lib/openData.ts` / `guide.ts` — async dumps for Codex
- `src/lib/gatePins.ts` — binds approaching gates' locks onto the Atlas plate (existing frames only)
- `src/lib/ocr.ts` — **real Tesseract.js OCR** (worker, local-first; low-confidence stays unknown; inferred extras returned as `alsoMarked`)
- `src/lib/save.ts` — **not a real .sl2 parser**

**Knowledge (authored, small)**
`src/knowledge/{catalog,endings,storylines,loot,builds,graces,collectibles,completion,gates,inferChains,medusa,missables,merchants,bossPins,awesome}.ts`

**Shell**
`App.tsx` is a god file (~27k). Split rooms when you touch UI.

**Vendor**
`vendor/elden-ring-map` — egormagurin/EldenRingMap. `npm start` / `npm run map`. Tiles/markers from a **local game install**, not shipped.

---

## 3. Data on disk (`public/sourced/`)

### Maps
- `maps/m0-overworld.jpg` — Elden Armory plate (~2 MB), not the official 176 MB mosaic
- `maps/m1-underground.jpg` (+ hi / armory variants)

### Guide (aether-auto/er-guide)
- `guide/items.json` — 2437 items, acquisition text, missable/quest, map lat/lng
- `guide/catalog.json` — slim
- `guide/regions/` — 25 routes (01-limgrave … 24-ashen-capital + unsorted)
- `guide/legs.json` — 124 grace→grace legs
- `guide/missables.json` + `missable-index.json`
- `guide/map-extras.json` — graces/locations/stones with lat/lng

### Open dumps
| Path | Contents |
|---|---|
| `open/names.json` | ~8770 EN FMG names, base + SotE + Tarnished Pack (`scripts/extract-fmg-names.py`) |
| `open/shops.json` | 1261 ShopLineup rows |
| `open/world-lots.json` | 10011 unique lots: flag, lot, map, x/y/z, name |
| `open/boss-xyz.json` | 215 named bosses + clear/kill flags + XYZ |
| `open/boss-pins.json` | 109 projected onto overworld/shadow plates |
| `open/enemies.json` | 520 EN names |
| `open/msb-enemies.json` | 8827 placed enemies — **not loaded at runtime** |
| `open/game-areas.json` | 210 GameAreaParam |
| `open/map-points.json` | 471 WorldMapPoint names |
| `open/magic.json` | 317 spells |
| `open/ashes.json` | 90 spirit ashes |
| `open/grace-xyz.json` | grace position index |
| `open/coords.json` | ~2045 guide pins (percent) |
| `open/paramdex/` | soulsmods Names txt (goods, weapons, lots, shops, NPC, …) |
| `src/knowledge/merchants.ts` | 106 vendors, full stock |
| `src/knowledge/bossPins.ts` | sync pins for Gideon |

### FanAPI / checklists
`checklists/{weapons,armors,ashes,spirits,items,ammos,shields,classes,creatures,bosses,locations,sorceries,incantations,talismans,npcs,graces,hunts}.json`

- `open/fanapi/*.json` — **Task 67/68** structured FanAPI fields (armor poise/negation, talisman
  effects, spell cost/requires, Ash of War skill, spirit FP/HP, boss HP/drops, item effects, class
  stats, …); refreshed by `node scripts/ingest-fanapi.mjs`.
- `graces.json` — 418 BonfireWarpParam
- `hunts.json` — ~207 field bosses + event flags (BuLEEto)

### Icons / chrome
- `pack-icons/` — Nexus 960 glyphs
- `map-icons/` — wiki grace/boss etc.
- `public/art/` — generated seals, room icons, pins
- `armory-weapons.json` / `armory-bosses.json`

### Refresh
```
bash scripts/ingest-open.sh
python3 scripts/slim-lots.py
node scripts/ingest-fanapi.mjs
```
Clones: er-guide, eldenring-api, Paramdex ER/Names, ERR-MapForGoblins-DLL data.

---

## 4. Live / remote sources to leverage

**Sources policy.** External research is allowed without restriction. Facts, locations-in-prose, build ideas, one-line citations, and source data may be fetched, scraped, or downloaded from anywhere on the internet — wiki.gg, Fextralife, MapGenie, YouTube, Discord, patch notes, wherever. Each row should still carry its source (a title or URL is enough).

Accuracy rules still apply, because they are about correctness, not permission:
- Param, AR, soft caps, item names-as-ids, and pin coordinates come only from in-repo regulation / names.json / coords / loot / catalog. Wiki numbers do not override the Clark formula or regulation.bin extracts.
- Do not invent lat/lng, event flags, or lockouts.

| Source | URL / note |
|---|---|
| EldenRingMap | https://github.com/egormagurin/EldenRingMap — engine; tiles from install |
| Awesome list | https://github.com/EanNewton/Awesome-Elden-Ring-Resources — catalogued in `awesome.ts` + `docs/AWESOME-RESOURCES.md` |
| Carian Archive | https://github.com/AsteriskAmpersand/Carian-Archive — full FMG |
| Elden Refs | https://ihascats.github.io/Elden-Text/ |
| Text Explorer | https://github.com/EldenRingExplorer/EldenRingTextExplorer — `elden_ring_text.json` (~9 MB, we slimmed EN) |
| Paramdex | https://github.com/soulsmods/Paramdex/tree/master/ER/Names |
| FanAPI | https://eldenring.fanapis.com + `deliton/eldenring-api` JSON |
| Goblins dump | https://github.com/VirusAlex/ERR-MapForGoblins-DLL/tree/master/data — lots, MSB, WMPP, gathering nodes |
| er-guide | https://github.com/aether-auto/er-guide — items + routes + map degrees |
| BuLEEto hunts | bosses.json + flags |
| vawser | https://github.com/vawser/ER-Documentation — event flag dumps, map ref |
| ERDB | https://github.com/EldenRingDatabase/erdb — generate from install / public API if up |
| Compass | https://github.com/EthanShoeDev/elden-ring-compass — TS save parser ideas |
| Thomas Clark AR | Awesome list — link or WASM, don’t invent numbers |
| Zullie NPC sheets | Awesome list |
| Progress tracker sheet | EanNewton Google sheet in Awesome list |
| RubyRed icons Drive | user-linked; do not bulk-ship copyrighted dumps |
| Ashelian assets Drive | same |
| Wiki.gg FilePath | item icons by name |
| 9974 Nexus | location/field boss completion **rules** (ruins=chest, cave=last boss) — in `completion.ts`. regulation.bin needs Oodle; we did not unpack |
| Elden Armory / Medusa / COMPLETE pack | user zips; Medusa **titles only**; Armory plate + weapon/boss scraps |
| Souls Modding wiki | item lots, shops, entity ids |
| ER-save-Reader geography | flag families (76xxx graces, 62xxx landmarks, 1XXYYZZZZ pickups) |

`src/lib/hosted.ts` lists refresh URLs.

---

## 5. Contracts

### Character
`source`, `platform`, stats, loadout, `defeatedBosses[]`, `discoveredGraces[]`, `collectedItems[]`, `completedQuestSteps[]`, `deniedFacts[]`, `answers`, `evidence[]`, `shots[]` (blob URLs, stripped on vault write).

### GideonAct
```
{ say, module?, factId?, buildId?, offer?: {label, prompt}, goal?, navigateNow? }
```
Shell: always `setModule(act.module)`. Pin if `navigateNow` or module is map.

### searchSync
Seed catalog + warps + loot + shops + boss pins + missables. Cap ~16. Do not put 10k lots in here.

### applyFacts
Close seed `implies` **and** the `inferChains` table (`closeWorld(ids, knownFacts?)`), all as `source: 'inference'`. Store on lists by catalog kind **or** prefix: `grace|point` → graces; `boss|hunt|bossflag|area` → bosses; `quest|line` → quests; else items.

### Two map frames
1. er-guide lat/lng → `coords.json` percent  
2. `m60_GX_GZ * 256 + local xz` → `boss-pins.json`  
**Do not average.**

### Fact id dialects
- Authored: `boss:godrick`, `grace:elleh`, `item:fingerslayer`, `hunt:agheel`, `frag:…`
- Engine: `grace:{paramRow}` until aliased
- Dumps: `bossflag:530100`, `shop:100056`, `lot:10007850`, guide `weapon-bolt-of-gransax`

---

## 6. Gaps and TODOs (ordered)

**Status pass 2026-09-22** — a large batch of DeepSeek-driven task work landed since this list
was written (`../docs/tasks/06-*.md` through `20-*.md` in the outer project, each independently
re-verified by Claude before merge — see `git log` for the full trail). Markers below: ✅ done,
🔄 in progress, ⬜ still open/untouched.

### P0 — must for “not a demo”
1. ✅ **Alias table** — engine grace ids, Paramdex warpId, seed slugs, `boss-xyz.kill` ↔
   `boss:slug`. (Task 06 — boss side; graces already existed.)
2. ✅ **Split `App.tsx`** into room files. (Task 07 — split 776 → 272 lines, queued right
   after Task 06 but deferred for the parallel batch 08-20; finally run as part of a full
   review/critique pass.)
3. ✅ **Tests** — `prefixKind`, `searchSync`, `planRoute` lockouts, vault round-trip. (Task 06,
   substantially extended by 11/12/15's own test additions — 44 tests total as of Task 18.)
4. ✅ **Typecheck in CI** — `.github/workflows/ci.yml` now exists (Task 06).
5. ✅ Honest empty states: OCR off, save parser off (now real, see #27), engine offline. (Task 06)

### P1 — PS5 state
6. ✅ Wire Tesseract in Reckon. (Task 21 — real `tesseract.js` worker in `ocr.ts`; Reckon's
   drop/paste/upload path OCRs on-device, feeds names through `aliases`/`searchSync`, and records
   `source: 'screenshot'` evidence. Low-confidence or unmatched reads are surfaced but never
   turned into facts. Verified end-to-end in a headless browser against generated menu shots.)
7. ✅ Warp-list paste UX — per-line bulk warp-list matching wired. (Task 34 — DLC-aware
   interview seeding + per-line bulk warp-list matching in Reckon.)
8. ✅ Interview coverage for SotE / Tarnished Pack starts — now seeded with DLC-aware
   interview questions. (Task 34.)
9. ✅ Clipboard screenshots → Reckon — wired real Tesseract.js OCR. (Task 21 — OCR drops
   into Reckon's clipboard paste path; low-confidence reads are surfaced but not turned
   into facts.)

### P1 — Atlas
10. 🔄 Pick **one** projection for lots or leave lots off the JPG — Task 09 Part C, in progress
    (retrying after an earlier run hung on `Setup.bat`'s interactive prompt in headless mode).
11. ✅ SotE + ashen **plates** — both now exist (`m-ashen.jpg`, `m-shadow.jpg`, AI-generated
    stand-in art wired into `graces.ts`'s `worlds` array; visually confirmed rendering with pins).
    Real assembled map art for overworld/underground specifically is still Task 09's job.
12. 🔄 Engine iframe vs plate pin conflict — Task 09 Part C, in progress.
13. ⬜ Dungeon bosses XYZ-only, no interior maps — explicitly deferred, still open.

### P1 — Gideon / planner
14. ✅ DeepSeek behind `GideonAct` → **Meta Muse Spark 1.3 Contributor** (router-first, optional).
    `src/lib/muse.ts` reads `VITE_GIDEON_API_KEY` only, tries `/chat/completions` then `/responses`,
    and runs behind the dev Vite proxy `/gideon-llm` so CORS does not block it. Grounding pack +
    hallucination guard live in `src/lib/gideonLlm.ts`; any sentence naming an ungrounded id is
    stripped before the act is used. No key ⇒ router only, no fetch.
15. ✅ “I’m done” → extend to dump ids — multi-id plan-step completion now resolves steps
    against a set of acceptable dump ids. (Task 35 — fixes 5 stalling questline beats.)
16. 🔄 Detours use real boss resists — Task 19, queued behind Task 17 (needs real `NpcParam`
    data first) and Task 20 (shares `gideon.ts`, run sequentially not in parallel).
17. 🔄 100% spine real checklist — Task 19, same queue position as #16.

### P2 — data
18. ✅ `ItemLotParam_*` chest facts from `world-lots.json` — Task 22: `src/lib/chestFacts.ts`
    groups the 4018 treasure rows into 3401 chest/pickup facts (one per event flag, items unioned,
    nearest-region label from `grace-xyz.json`, catalog-id dedupe), surfaced in the Codex.
19. ✅ Query-load `msb-enemies.json` — Task 22: placements joined to real `NpcParam` via the MSB
    enemy `NPCParamID`, producing `public/sourced/enemy-combat.json` (2271 non-boss enemies with
    absorb/poise/resistances), consumed by the Build lab through the same interface as the boss
    table.
20. ⬜ Gathering nodes (21k, nameless AEG) — not addressed (the source `all_gathering_nodes_final.json`
    exists in the Goblins dump but is still un-ingested).
21. ✅ FanAPI images via `fanImage()` — Task 36. No stub existed; built `src/lib/fanImage.ts`
    over a generated `src/data/image-index.json` and 2,244 cached 160 px WebP thumbnails under
    `public/sourced/images/` (`scripts/ingest-images.py`). Wired into the Codex (guide, loot,
    collectible, armory, hunt and catalog cards). Base-game only: FanAPI predates SotE, so DLC
    entries fall back to the category glyph. Coverage reported in `DATA.md`.
22. ✅ Sacred tear / golden seed starter → more complete. (Task 16: golden seeds 7→42, sacred
    tears confirmed matching the authoritative pack at 12/12, plus a new `gesture` category and
    3 crystal-tear entries filled in from the same pass.)
23. ✅ Merge `fieldHunts` and `hunts.json` — resolved (Task 37): `hunts.json` is the single
    canonical source; `fieldHunts` is now a 22-entry curated alias layer derived from it, the
    redundant `src/data/hunt-flags.json` copy is deleted, and one id dialect is shared by
    Gideon, Codex and the save parser. See `docs/research/hunt-data-cleanup.md`.
24. ⬜ `items.json` vs `catalog.json` size note — informational, not actioned.
25. ✅ vawser event-flag dump — audited (Task 37) and closed as "new family, nothing to add for
    the current need": 0 of its 480 named flags overlap Task 11's 642, but its payload is
    item-acquisition/great-rune flags with no consumer, its 25 boss flags duplicate bosses
    already tracked (24/25), and 132/480 aren't even addressable in the save bitfield. See
    `docs/research/vawser-event-flags-audit.md`.
26. ✅ Carian JP / dialog — investigated (Task 14): both Elden Refs and Carian Archive turned out
    to be a strict subset of `names.json` already in-repo (same corpus, EN names identical, 0
    diff across 34 FMG sections); the only non-redundant payload was JP text with no consumer
    anywhere in the app. Correctly closed as “nothing to add” rather than forced into the repo.

### P2 — PC
27. ✅ Real `.sl2` parser in-browser, flags → our ids. (Task 11 — original TypeScript
    implementation, *not* vendored from Compass: that repo turned out to have no license at all,
    so only its publicly-documented save-format understanding was used, not its code. Validated
    byte-for-byte against Compass's own upstream test fixture. Runs in a Web Worker, read-only.)
28. 🔄 `canonicalFactId` name-equality only → improved for bosses (Task 06 added id-based
    matching, not just name equality, mirroring the grace pattern) but not audited across every
    fact category.
29. ✅ Live-memory / EAC caution documentation — Task 38: README "Live memory mode — read
    this before you enable it" section (accurate `PROCESS_VM_READ` mechanism, EAC risk, opt-in
    default) plus an expanded `docs/MAP-ENGINE.md` Safety section. No in-app toggle exists, so
    no UI warning copy was needed; no functional change.

### P3 — product polish
30. ✅ Multi-profile UX in the rail — real ProfileSwitcher component in the rail. (Task 30
    — fixes a real cross-profile recentFacts leak.)
31. ✅ Packet diff surfacing — real UI diff before import. (Task 32 — mergePacket/diffPacket
    with UI surfacing.)
32. ✅ **PWA service worker / offline cache of `sourced/`** — Task 28: `vite-plugin-pwa`
   (`generateSW`) emits `sw.js` + a real manifest. App shell + art + a small critical
   `sourced/` JSON set are precached; the rest of `sourced/` is runtime-cached lazily
   (JSON stale-while-revalidate, media cache-first). The live map engine is `NetworkOnly`
   so Task 06's offline detection still sees real failures. Verified offline in headless
   Edge against `vite preview` (12/12 checks). See `src/lib/pwa.ts` + `src/lib/pwa.test.ts`.
33. ✅ Command palette grouping by source — now groups hits by source. (Task 32 — groupHits
    in search.ts.)
34. ✅ Watchlist / leftovers → coords layer binding — toggleable leftover pin layer on the
    Atlas. (Task 33.)
35. ✅ Build lab AR: real numbers, not guessed. (Task 10 — ported `ThomasJClark/elden-ring-
    weapon-calculator`'s formula, verified to the decimal against 8 real cases including
    two-handing by bundling and running Clark's own upstream code against the same vendored
    regulation data.)
36. ✅ Quest DAG lockout edges — no longer prose. (Task 12: 11 lines → 24, 42 → 87 steps, 0 → 223
    real `requires`/`grants`/`lockouts` edges; `planRoute` rebuilt to actually traverse them.
    Not yet cross-verified against real game event-flag data specifically — the edges are
    author-encoded from game knowledge, not extracted from `regulation.bin`.)
37. Nightreign: out of v1 — unchanged, correctly still out of scope.

### Also new since this list was written (not in the original numbering)

**Task 21–40 batch summary** (large parallel work landed 2026-09-22, each independently re-verified before merge):

- **Data/content**: Task 22 added 3401 chest facts + 2271 enemy combat rows. Task 23 generated the aliases plane. Task 27 fixed vanilla/Tarnished-Pack regulation mismatch (2 of 3 sources). Task 29 added conditional merchant stock + achievement sets. Task 36 wired 2244 FanAPI item/boss thumbnails into the Codex.
- **Gideon**: Task 21 wired real Tesseract.js OCR into Reckon (clipboard paste path). Task 25 deepened Gideon questline coverage (10 new companion lines, Enia table, comparisons). Task 40 added OP builds (6→14), PvP builds/matchups, and tips.
- **UX/mobile**: Task 26 shipped real mobile-first layout (bottom tab bar, map 73-77% of screen at <700px). Task 30 surfaced multi-profile switching in the rail. Task 31 made every real shortcut/gesture discoverable in-app. Task 32 added packet diff surfacing + command palette source grouping. Task 33 bound leftovers/watchlist to a toggleable Atlas layer.
- **Infrastructure**: Task 28 added installable offline PWA (service worker + lazy runtime cache). Task 34 added DLC-aware interview starts + per-line bulk warp-list matching. Task 35 resolved plan steps against acceptable dump ids (fixes 5 stalling questline beats). Task 37 consolidated field-hunt data into one canonical source (fixes 3-dialect id drift). Task 38 documented live-memory / EAC caution accurately. Task 39 added real cross-linking index between items, bosses, quests, locations.

**Task 41 + direct fixes** (landed after the Task 21–40 batch, same review standard):

- Task 41 ingested gathering nodes (`public/sourced/open/gathering-nodes.json`, ~21.8k real AEG
  placements) into `src/lib/gatheringNodes.ts`, surfaced in the Codex. Its own world-classification
  heuristic was wrong (guessed area 60 was "Ashen Capital" — actually the base-game overworld,
  65% of all nodes mislabeled) and was corrected by Claude before merge, cross-checked against
  this repo's own established `m60`/`m61` world-tile grid architecture; no area is claimed
  "ashen" without real evidence.
- Fixed a latent CI-breaking bug in `regulation.test.ts`: a runtime `if (existsSync(...))` around
  an `it()` call left the suite with zero registered tests on any fresh checkout (which never has
  the gitignored, game-derived marker file) — switched to `it.skipIf()`.
- Fixed two real mobile bugs in `vendor/elden-ring-map`, both the same root cause repeated: a
  real control existed and worked, but lived inside `#sidebar`, which `?embed=1` (the mode
  All-Knowing's Atlas always uses) hides entirely. (1) Pinch-to-zoom zoomed the whole page — the
  canvas had no touch/pinch handling at all; added real two-finger pinch alongside the existing
  pointer-based pan. (2) The world-switcher (Underground/Realm of Shadow/etc.) and the ~50
  category filter checkboxes were both unreachable — added floating embed-mode-only copies of
  both, generalizing `buildLayerButtons()`/`buildCategories()` to populate every matching element
  instead of one sidebar id. **Task 59 (superseding the queued Task 43) has now audited the rest of
  the sidebar for the same pattern** — see its status block below and `docs/MAP-ENGINE.md`.
- Extended the Gideon router (`src/lib/gideon.ts`): "what should I do now" now matches the
  existing "what next" handling (it fell through to the generic catch-all before). "I've done X" /
  "I killed X" is now parsed as a completion report — the router resolves X, answers "what next"
  as if it were already applied, and returns `markDone` so `Gideon.tsx` actually persists the fact
  via `applyFacts`; previously this was silently ignored and the router could tell a player to go
  kill something they'd just said they killed. Unresolvable reports get a real clarifying
  question. Code-split the five rooms + Gideon via `React.lazy()` (main bundle 914KB → ~512KB).
- Wrote up 10 more task briefs (`docs/tasks/42-51`) for the next DeepSeek batch, not yet run.

- Catalog fact count: 89 → 226 (Task 18, closing gaps a diff against the EanNewton tracker
  found — see `docs/research/eannewton-catalog-diff.md`). Added a new `invader:` fact-id prefix
  (mapped to the `boss` bucket in `prefixKind`, a documented decision, not an oversight).
- `vendor/elden-ring-map` is now actually cloned in and CORS/embed-patched (Task 09, in
  progress) — a real local Elden Ring install exists on this dev machine as of 2026-09-22
  (`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\`), which this list's authors
  did not have when they wrote “SOURCE-PACK.md: the PC in this house does not have Elden Ring.”
  That constraint is gone; treat any doc still citing it as outdated for extraction-related work.

**Task 52 — missable gate overlay** (landed after 41, verified against the brief):

- New `src/knowledge/gates.ts` + `gates.test.ts`: a first-class `Gate` model
  (triggerFacts / approachingWhen / locks / stillOk) for ten world-state tripwires — the Forge,
  Maliketh, the Sealing Tree, the Ranni / frenzy / dung-eater ending commits, Seluvis's potion,
  Volcano Manor, Millicent's Elphael fork, and Varré. Lock lists are deliberately short and
  verifiable; Ranni / Millicent / Rya / Varré are recorded as `stillOk` at the Forge rather than
  as false lockouts.
- `planRoute` now returns `approachingGates` + `gateWarning`, and `stillAvailable` returns
  `gates`. The router answers "if I keep going / what do I miss / before the forge|maliketh|shadow
  keep / am I locking" and puts the lock list ahead of a walk-forward beat.
- Atlas: a toggleable "locks if you continue" pin layer (`src/lib/gatePins.ts`) reusing the
  existing loot→grace and `coords.json` frames only; locks with no pin are listed in the side
  panel instead of given an invented position.
- Follow-up fix (mandated before 53): `gate:forge.triggerFacts = ['quest:erdtree-burned']` only.
  The Fire Giant kill and the Forge grace are `approachingWhen`, because killing him does not
  burn the tree. Six catalog items the gate names were added (`bolt-of-gransax`,
  `sanctified-whetblade`, `blessed-dew-talisman`, `black-whetblade`,
  `rotten-winged-sword-insignia`, `millicent-prosthesis`).

**Task 53 — wiki-grade lockable lines** (landed after 52; `storylines.test.ts` added):

- Expanded the eight lockable lines in place to 7–8 steps each: `ranni` (added as a traversable
  line that shares the `stars` ending's step array **by reference**, so there is one lockout
  graph, not two that disagree), `millicent`, `fia`, `dung-eater`, `tanith`, `leda`, `sellen`,
  and `ymir` (new). Millicent's Elphael aid/betray are terminal steps with mutual lockouts
  (Rotten Winged Sword Insignia vs Millicent's Prosthesis); Leda is one beat per invitation
  window.
- Added 54 catalog facts: 49 `quest:` state ids, 4 key items (Seedbed Curse, Drawing-Room Key,
  Iris of Grace, Iris of Occultation) and `boss:metyr`. Catalog row count 226 → 286. Quest facts
  carry `implies: []` where a beat does not prove an earlier one — no invented event flags.
- Golden-fixture test: Radahn dead + Ranni's service + Rogier's knifeprint ⇒
  `planRoute(ranni)` nexts the Fingerslayer hand-in (not "meet Ranni"); `planRoute(millicent)`
  nexts Gowry's Unalloyed needle; Gideon with goal `ranni` names Fingerslayer and offers Show it.

**Task 54 — screenshot / paste inference chains** (landed after 53; `inferChains.test.ts` added):

- New `src/knowledge/inferChains.ts`: an authored `{ whenFact, implies, allOf?, unless?, confidence,
  why }` table so a named read (OCR hit, warp paste, typed item) closes the world through real
  implications. Applied **through** `closeWorld`/`applyFacts` — not a second closer — so every
  derived id is `source: 'inference'` and Task 24 conflicts still let a save flag or explicit deny win.
- Chains: Fingerslayer → Ranni Nokron beat; the Great Runes → their own boss only; knifeprint →
  Rogier's beat; Pureblood Medal → Varré cloth; Mimic Tear Ashes → Mimic Tear; Black Whetblade →
  Night's Sacred Ground; Twinned set → Fia's dagger; Haligtree medallion halves → the whole only
  when **both** are held (compound `allOf`).
- Reckon: a batch read now surfaces its inferred extras as an "Also marked" list with per-row undo.
  Low-confidence OCR still makes zero facts. Three real item rows added (`mimic-tear-ashes`,
  `haligtree-medallion-left/-right`) from `open/names.json`.
- **Hotfix before 55:** `item:black-whetblade` no longer implies `boss:radahn` (chains to the
  dump-verified `grace:night-sacred-ground`); `item:twinned-armor` no longer implies
  `quest:d:brother` (chains to `quest:fia:dagger`). Test asserts zero such rows.

**Task 55 — finished alias plane** (landed after 54):

- `node scripts/gen-aliases.mjs` now runs under Node 24 (the one required specifier was made
  explicit in `catalog.ts`) and is deterministic — a second run is byte-identical. It reads only
  in-repo dumps: `checklists/graces.json`, `open/boss-xyz.json`, `checklists/hunts.json`,
  `open/names.json`, paramdex, `npc-combat`.
- Adds `hunt` rows and maps warps to authored **catalog** graces when no `graces.ts` seed exists
  (`grace:120208` → `grace:night-sacred-ground`); strict parenthetical-preserving item matching
  makes `goods:8175/8176` resolve to the medallion **halves**. 856 rows, 188 KB, both copies identical.
- Engine-backed by catalog prefix: grace 25/25, boss 87/88, item 84/86, invader 22/24. Honest
  unmatched counts: 360/418 warps and 79/215 bosses have no slug and are reported, never dropped.
  `searchSync("church of elleh")` / `("elleh")` both hit `grace:elleh`.

**Task 56 — one-command start + honest engine banner** (landed after 55):

- `package.json` gains `start` (`node scripts/dev-stack.mjs`: map engine + Vite together,
  cross-platform, no process-manager dep) and `start:live` (same + `--live-memory`, printing the
  existing EAC warning to the terminal first). The supervisor keeps Vite alive on the static plates
  if the engine is not set up or stops.
- `engineBanner()` / `engineChipLabel()` in `src/lib/mapEngine.ts`: **connected** / **offline —
  using static plates** / **live-memory on only when the API reports `state.live.enabled`**.
  Surfaced in the Atlas side panel and as a compact rail chip. Offline copy never says "error";
  live memory stays off by default.

**Task 58 — self-hosted fonts + real-phone PWA offline** (landed after 56):

- Cinzel + Source Sans 3 (both OFL) are self-hosted: 6 woff2 under `public/fonts/` (latin +
  latin-ext; both families are variable, so one file per family/style/subset), declared with
  `@font-face { font-display: swap }` in `src/index.css`. The `<link>`/`preconnect` to Google
  Fonts are gone from `index.html`; no cross-origin font request at runtime. OFL notice in
  `THIRD_PARTY_NOTICES.md`.
- Service worker: the cross-origin Google Fonts runtime rules were removed; woff2 is precached by
  the existing output glob (precache 61 → 67 entries) while `**/sourced/**` stays runtime-only.
- The Help sheet gained an "Install / available offline" note. Verified with `vite preview` + a
  node fetch (headless), not a physical phone.

**Task 59 — embed-mode control audit (vendor map)** (landed after 58; supersedes Task 43):

- Every sidebar-only control is now reachable in `?embed=1` (Atlas always embeds). The existing
  world-switch and category-filter fixes were joined by a floating `#embed-tools` panel covering
  search, the save/character picker, the character/live indicator, progress, the hide-found/labels/
  icons options, and the language switch. Zoom + drag/pinch were already in `#stage`; embed zoom
  buttons grew to 40×40.
- The pattern is uniform: builders/wiring populate **every element sharing a class**, never one id
  (`buildLangSwitch`, `buildSavePicker`/`syncSavePicker`, `renderCharacter`/`renderWhere`,
  `refreshCounts`, `bindSearch`, `[data-option]` options), so the sidebar and embed copies share one
  state and can't drift. Touch targets on the floating copies are ≥40px.
- No iframe padding was needed — All-Knowing's mobile tab bar is its own grid row, not an overlay
  on the map stage.
- Verified with a headless-Edge `--dump-dom` against the running map server at `?embed=1` (DOM
  after JS ran), not a physical device. Full table in `docs/MAP-ENGINE.md`.

**Task 60 — Scadutree + Revered Ash meters** (landed after 59; supersedes Task 46):

- `src/lib/blessings.ts` gives the two DLC blessings an N/total meter like the Task 29 cookbook
  sets, surfaced in the Codex: `Scadutree Blessing Lv — (Y/50 fragments)` and
  `Revered Spirit Ash Blessing Lv — (Y/25 ashes)`, with the real remaining guide rows and Mark
  buttons.
- Totals are the guide catalog's own row counts (`public/sourced/guide/catalog.json` categories
  `scadutree-fragment` = 50, `revered-spirit-ash` = 25), cited in the module. The partial
  `collectibles.ts` `frag:*` map-pin list is deliberately **not** used, so a mid-run never shows a
  false 100%.
- Blessing **level** now comes from the cited per-level tables (Scadutree Fragment + Revered Spirit
  Ash Fextralife pages, patch 1.12.2 / 1.12): `blessings.ts` stores the cumulative counts
  (`thresholds`) and `levelFromCount` picks the highest level met. No wiki HTML is committed.
- Build lab: the AR math is unchanged and ignores blessing, so a SotE run now shows the honest
  one-liner "AR is base-game; Scadutree Blessing not applied."

**Task 42 — proactive suggestions + live search** (landed after 60):

- `src/lib/suggestions.ts` — `idleSuggestions(character)`: 2–3 real next actions from
  `stillAvailable()` / `approachingGates()` / `nextMoves()` / `leftovers()`, deduped, shown as a
  small dismissible `.gideon-suggest` strip when Gideon's input is idle. Each chip runs the existing
  `run(prompt)` path — no parallel suggestion engine.
- `CommandHits` debounces the query 175 ms and renders `groupHits(searchSync(q))` live as you type;
  the existing 2-char floor is kept (no new matcher).

**Task 50 — confirm-before-tick lockout warnings** (landed after 42):

- `src/lib/lockWarnings.ts` reuses `planRoute`/`applyFacts` (no second DAG walker): it simulates the
  tick, diffs each line's `foreclosed` set, and reports only lines the character has started (≥1
  step done) or is currently chasing (`answers.gideonGoal`).
- `src/LockoutPrompt.tsx` is the confirm modal; it gates **both** completion paths — `Quests.tsx`'s
  mark-done and Gideon's `markDone` (done-report) and "I'm done". Nothing is applied until confirmed.
  Fingerslayer on the golden fixture does not warn (no false Leyndell lock).

**Task 57 — packet share UX** (landed after 50):

- `PacketBar`: primary **Copy packet** (async Clipboard API + textarea fallback) with a visible
  toast; secondary **Save file**; **Load file**, a **Paste** textarea / clipboard read, and
  drag-and-drop. Task 32's diff-before-import is unchanged, and Confirm reports "Merged N facts."
- `src/lib/packet.ts` gained `packetJson` / `packetFileName` / `packetHash` / `copyPacket`.
  `*.all-knowing.json` stays the source of truth; no screenshot blobs, no accounts/server.

**Task 63 — scannable packet QR** (landed after 57):

- `src/lib/packetQr.ts` uses `uqr` 0.1.3 (MIT, zero deps, pinned dependency) for `encode` +
  `renderSVG`. `packet` mode when the compact JSON is ≤ 2953 bytes; otherwise a 5-line
  `ALL-KNOWING-HANDOFF` card (filename + `sha256` + bytes) — never truncated, gzipped, multi-tiled,
  or put in a URL.
- PacketBar renders a 192 px high-contrast SVG (tap-to-enlarge). `@paulmillr/qr` 0.3.0 is a
  **devDependency** used only in `packetQr.test.ts` to decode both modes (no BarcodeDetector; the
  decoder is not in the app bundle).

**Task 62 — gathering nodes stay off the player map** (landed after 63):

- Confirmed Atlas and Gideon never consumed `open/gathering-nodes.json`; only the Codex lists them,
  now labelled "unverified placement, model code only" (the "Show on map" affordance was removed).
  `src/lib/gatheringNodes.ts` header states they are NOT MAP-COMPLETE until an item field exists.
- `src/lib/gatheringNodes.guard.test.ts` pins it: Atlas and every pin layer
  (`leftoverPins`/`gatePins`/`coords`/`mapEngine`/`graces`/`bossPins`) plus `gideon.ts`/`Gideon.tsx`/
  `search.ts` never reference the dump; only the Codex may list it. No AEG names invented; dump kept.

**Task 44 — real soft-cap markers on the Build stat card** (landed after 62):

- One table in `src/lib/softCaps.ts` (QoL.tsx re-exports `softCapMark`, so `App.tsx` is unchanged):
  Vigor/Mind 40/60, Endurance 30/50 (community HP/FP/stamina), and Str/Dex/Int/Fai/Arc 20/60/80 read
  from the game's own scaling-curve stages in the vendored 1.17 regulation data (Task 10's Clark
  source). The old `55` second cap was corrected to `60`; the alternate graph's `50` is documented
  in the comment.
- `Build.tsx` shows per-stat dot tiers inline (filled as reached, both/three tiers — not a
  capped/not boolean). `softCaps.test.ts` covers Vigor, Mind, Endurance and all five offensive stats.

**Task 47 — shareable build codes** (landed after 44):

- `src/lib/buildCode.ts`: `akb1.` + base64url of a small JSON `{ l, s, k, n? }` (level, the 8 stats,
  loadout rows, optional short build label). Deliberately not the Task 32 packet — no progress or
  evidence. `Build.tsx` "Export build" copies the code (with a toast); "Import build code" applies
  through the same `setCharacter({ ...character, stats, level, loadout })` path the OP/PvP chips use.
  Malformed input shows a visible error and changes nothing. The optional name is the **build's**,
  never the Tarnished's — importing cannot rename a character.

**Task 48 — side-by-side weapon comparison** (landed after 47):

- `src/lib/weaponCompare.ts` + `src/WeaponCompare.tsx`: two weapon/affinity/upgrade pickers, real AR
  per side via `attackRatingForSlot` (no second engine), per-side two-handing, live on the current
  stats, and `effectiveDamage` vs the selected target. Additive — the single-weapon flow is untouched.

**Task 49 — command-palette keyboard navigation** (landed after 48):

- `src/lib/palette.ts`: `flattenHits`, a **wrapping** `moveActive`, and `resolvePaletteKey` that only
  fires while the command search is focused with results open. `CommandHits` highlights the active
  row (`.palette-active`, gold like `.chip.on`), reuses one `choose()` handler for click and Enter,
  and Escape clears/closes. Registered in `src/lib/shortcuts.ts` so it shows in the `?` overlay.

**Task 51 — recently-viewed / quick-nav history** (landed after 49):

- Audit: every real navigation already went through `setSelectedMarkerId`, so the recorder covered
  Atlas, Codex, Related, Gideon, Reckon, Thread and the palette — the gap was that `Recents` was
  never rendered. `src/lib/recent.ts` now holds `RECENT_CAP = 12`, `pushRecent` (newest-first,
  deduped, bounded) and `recentAfterProfileSwitch`; `Recents` is a real rail panel (last 12, named,
  one-click jump). Cap raised 8 → 12. Per-profile isolation kept: history is cleared on switch and is
  not part of the persisted `VaultUi`.

**Task 20 — Gideon optional LLM = Meta Muse Spark 1.3 Contributor** (landed after 51):

- `src/lib/muse.ts` replaces the old `deepseek.ts` transport. Hard-coded defaults: base
  `https://api.meta.ai/v1`, model `muse-spark-1.3-contributor`, key **only** from
  `VITE_GIDEON_API_KEY` (`VITE_GIDEON_BASE_URL` / `VITE_GIDEON_MODEL` override). `POST
  {base}/chat/completions` first, `POST {base}/responses` (Meta `input` body) on a 404; no third
  shape guessed. Any other non-OK response throws.
- Router-first: no key ⇒ no `fetch`; a fast lookup or a rejected act stays on the deterministic
  router. `validateGideonAct` runs `stripUngroundedSentences`, so a sentence naming an id outside
  catalog/aliases is dropped before the act is used.
- Dev goes through the Vite proxy `/gideon-llm` → `api.meta.ai`; `.env.example` ships an empty key
  and `.env.local` stays gitignored. `Gideon.tsx` shows one muted line ("Muse 1.3 contributor
  (optional)" / "router only") and never the key. Brief 20's tests + endpoint fallback are mocked.

**Task 64 — build hunt pins** (landed after 20):

- `src/lib/buildHunt.ts` → `buildHunt(character, build, coords?)` returning
  `{ have, missing, pins, unresolved }`. Resolver order: one explicit display-slug/dangling-id
  table, then exact loot id, exact catalog id, then name match in `loot.ts`, the catalog, and the
  generated alias plane. Pure — it never marks a kit's gear as collected.
- Pins reuse the Task 33 leftover layer (`lootPin`, same grace/coords frames) — no third pin system
  and no invented coordinates. `Build.tsx` shows the selected kit's missing pieces with
  **Mark** / **Show on map**; "Show on map" adds the loot id to the watchlist. Chips still only set
  stats + loadout + the selected-kit marker.
- Gideon answers "how do I build X" / "show the X kit" (the act gained `watch[]`; the UI enables the
  leftovers layer and pins). Tests: `src/lib/buildHunt.test.ts`.

**Task 65 — OP + PvP library** (landed after 64):

- opBuilds 14 → **28**, pvpBuilds 6 → **16**, pvpMatchups 6 → **12**. Every new build carries
  `kit[]`, `need[]` of real fact ids, one original `why`, `patch`
  (`still-strong | nerfed-but-works | sote | pre-1.08-dead`) and `source`. Stats stay target spreads
  (no AR invented); an RL30 kit is tested not to carry an RL125 spread.
- 50 new `loot.ts` rows (total 87), each added **only** where the English name exists in
  `public/sourced/open/names.json`, with one original `how`; no lat/lng and no invented grace slug.
  `build:blackflame`'s dangling `boss:godskin` fixed to the real `boss:godskin-apostle`. After the
  new rows, **zero** `need[]` ids remain unresolved.
- Skipped "Poison flower" (no `names.json` name). New `src/knowledge/buildLibrary.test.ts`.

**Sources policy patch** (docs only, after 65):

- Replaced the old "do not scrape Fextralife / MapGenie" standing ban with a permissive policy in
  `HANDOFF-CLAUDE.md` §4, `ARCHITECTURE.md`, `HANDOFF.md`, `docs/tasks/00-README.md`, briefs 52–53,
  and the outer `PROJECT_BRIEF.md` + `docs/research/nexus-packs-analysis.md`: facts, locations,
  build ideas and citations may come from anywhere (in-repo dumps, the run, Fextra, wiki.gg,
  YouTube, Discord, patch notes). Accuracy rules still apply — param/AR/soft caps/ids/pin coords
  come only from in-repo regulation / names.json / coords / loot / catalog, and no lat/lng, event
  flags, or lockouts are invented.

**Task 66 — gap pass: kit rows, exact locations, blessing levels** (landed after the policy patch):

- `src/lib/buildHunt.ts` `norm()` now drops apostrophes/quotes instead of turning them into spaces,
  so `Lion’s Claw` matches the `lions claw` alias. Every kit and need id in the library now resolves
  — `buildLibrary.test.ts` asserts `hunt.unresolved` is empty for all 28 OP + 16 PvP builds.
- 20 new `loot.ts` rows for the kit items Task 64 left unresolved (Lusat's, Staff of Loss, Carian
  Regal Scepter, Azur's, Dragon King's Cragblade, Fire/Lightning Scorpion Charm, Curved Sword
  Talisman, Greyoll's Roar, Rotten Breath, Faithful's Canvas, Warhawk's Talon, Cane Sword, Pulley
  Crossbow, Radagon's Soreseal, Okina Mask, Swift Glintstone Shard, Stargazer Heirloom, Bull-Goat
  Armor, Dagger). Each English name verified in `public/sourced/open/names.json`.
- Exact locations for the 5 rows that had said `region: 'various'` (Giant-Crusher, Dragon Communion
  Seal, Axe / Greatshield / Spear Talisman), read off the Fextralife pages — only the fact is stored,
  no page HTML committed.
- `src/lib/blessings.ts`: cited per-level thresholds for Scadutree (0–50) and Revered Spirit Ash
  (0–25) plus `levelFromCount`, so `blessingLine` prints a real level instead of `Lv —`.

**Task 67 — FanAPI structured reference data** (landed after 66):

- `scripts/ingest-fanapi.mjs` pulls the FanAPI JSON (the source already named in §4 and
  `awesome.ts`) into `public/sourced/open/fanapi/`: `armors.json` (568 — poise, negation,
  resistance, weight), `talismans.json` (87 effects), `spells.json` (169 sorceries + incantations
  with cost/slots/requires/effect), `ashes.json` (90 Ashes of War skill/affinity), `spirits.json`
  (64 spirit ashes FP/HP/effect). Name-sorted so a re-run is byte-identical; only structured fields
  are committed — no article bodies or images.
- `src/lib/fanapiData.ts` loads them lazily and matches by name; the Codex gained Talismans /
  Spells / Ashes of War / Armor reference sections. Weapon and shield attack numbers are
  deliberately **not** ingested — AR stays on the in-repo regulation source. Base-game only
  (FanAPI predates SotE).

**Task 67b — rest of the FanAPI categories** (landed after 67):

- Extended `scripts/ingest-fanapi.mjs` to pull every remaining category: `items.json` (462),
  `locations.json` (177), `creatures.json` (115), `bosses.json` (106 — region/location/HP/drops),
  `npcs.json` (55 — location/role), `ammos.json` (53), `classes.json` (14 — level/stats),
  `weapons.json` (307) + `shields.json` (69 — **category/weight only**; attack/defence numbers are
  deliberately dropped so nothing here competes with the in-repo regulation AR source).
- `src/lib/fanapiData.ts` + `Codex.tsx` now cover all 14 sets through one generic `RefSection`
  renderer; `Open` codex search matches Items, Locations, Bosses, Field enemies, NPCs, Ammunition,
  Classes, Weapons and Shields.

**Task 68 — Quests renders the one graph** (landed after 67b):

- The bug: `Quests.tsx` rendered `data/seed.ts`'s `quests[]` while Gideon / `planRoute` /
  `lockoutWarnings` use `knowledge/storylines.ts` `allLines()`, so ticking one graph never moved the
  other. `QuestWorkspace` now lists and ticks `allLines()` only.
- Done state is the character's known facts on a beat's `factId` (`isStepDone`), not seed
  `completedQuestSteps` ids. Tick / untick run `applyFacts` / `clearFact` on that fact id;
  `LockoutPrompt` + `lockoutWarnings` are keyed to the fact id; `selectedMarkerId` opens the line
  whose step `factId` matches; the current beat comes from `planRoute`. `stepFact()` /
  `currentStepId()` are exported for the golden-fixture test.
- Deleted the seed `quests` array (Quests was its only consumer) and the now-unused `Questline`
  import. `planRoute` and the line steps are untouched. Covered by `src/Quests.test.ts`: the Task 53
  fixture puts Ranni on the Fingerslayer hand-in (`item:fingerslayer`, not `quest:ranni:elleh`), and
  ticking writes the catalog fact with no `alexander-1` written.

**Task 69 — phone Atlas layer chips** (landed after 68):

- The bug: `@media (max-width: 700px)` hid `.topbar .toggles`, so Missing only / leftovers / locks
  and the seven pin kinds were unreachable on a phone. `AtlasWorkspace` now renders a `.atlas-jobs`
  chip bar over the map under 700px — the three job chips always visible, the seven kinds
  (grace / boss / item / npc / fragment / spirit-ash / dungeon) collapsed into one `layers` overflow
  (`#atlas-layers`). The duplicated `.side-controls` block in the map side panel was removed, so
  there is one Atlas control surface per viewport. Desktop keeps the topbar toggles; the engine
  iframe's own `?embed=1` controls are untouched; no third pin system; all chips ≥ 38px. Covered by
  `src/Atlas.test.tsx`, which renders the workspace and pins the three job controls in the tree.
  See `docs/MAP-ENGINE.md`.

**Task 70 — loot table grounding** (landed after 69):

- `loot:golden-vow` no longer carries `grace:ergtree-grazing`: the id is a misspelling of the game's
  "Erdtree-Gazing Hill" and is not this row's location, so the grace field was dropped rather than
  point at an invented slug. The old `loot:poleblade` row named two weapons ("Loretta's War Sickle /
  Ensis"); it was split into `loot:rellanas-twin-blades` and `loot:lorettas-war-sickle`, both English
  names checked against `open/names.json` (nothing else referenced the old id).
- `buildHunt` over all 44 OP + PvP builds: 82 distinct `need[]` ids, all resolve; 0 unresolved
  (unchanged — Task 65/66 had already closed them). `src/knowledge/loot.test.ts` pins no typo grace
  slug, every loot grace slug existing in graces / catalog / aliases, no two-weapon name, and three
  formerly-unresolved kit ids resolving with their names in `names.json`.

**Task 71 — Build preview no longer fakes defense** (landed after 70):

- `estimateDefense()` in `Build.tsx` used to invent poise (a class-based constant) and equip load
  (`48 + endurance`) and render them beside the real Clark attack rating, so they read like
  regulation data. It now returns only the armament label; the two meters were replaced by an
  explicit "estimates only" note. No new formula, no second AR engine (the in-repo regulation extract
  computes attack rating only). `src/Build.preview.test.ts` asserts the function returns no numeric
  `poise`/`load` and that the old constants are gone from `Build.tsx`.

---

## 7. Product ideas still valid (not built)

From Wyatt, keep on the roadmap:

- “I want Age of Stars” → Gideon: not locked; next beat; optional grind; **Show it** on map.
- Blitz Elden Lord vs full NPC lines (Ranni, Millicent, Leda, Alexander, Boc…).
- Mid-playthrough pickup: Active / Open / Locked / Done.
- Screenshot of inventory / Great Runes / grace list / map fog → infer shardbearers and gates.
- Bonfire list screenshot populates discovered graces.
- Item screenshot ⇒ “you have done X” (Fingerslayer → Nokron opened, etc.).
- Field hunt completion (9974 rules: cave = last boss, ruins = chest).
- ✅ Scadutree fragments + Revered ashes as first-class SotE meters. (Task 60 — Codex meters; Task 66
  added the cited per-level thresholds so the level is real, not count-only.)
- Cookbook / bell bearing / whetblade / crystal tear sets (achievement-shaped).
- Merchant “who sells X after I give Y scroll.”
- Rememberance shop (Enia) as a table.
- ✅ Soft caps already marked on the stat card. (Task 44 — real per-stat dot tiers in `Build.tsx`.)
- Sit / lean-back UI for the living room.
- Profiles per Tarnished, packet to a friend or another device.

---

## 8. Ideas that look done but aren’t

| Claim | Reality |
|---|---|
| Knows everything | Seed catalog + dumps. Not full param/MSB. |
| Live map sync | Only if `npm run map` + game install + PC. |
| OCR | Real (Task 21), but accuracy on stylized in-game fonts is untested against real PS5 captures; low confidence is refused by design. |
| Save drop | Demo / error path. |
| 100% | Chapter titles + partial collectibles. |
| Unified pins | Two calibrations. |
| 9974 zip | Rules + public flags, not regulation.bin. |
| Medusa pack | Index; walkthrough prose can be ingested with the source noted. |

---

## 9. How to work

- New matcher? Add to `searchSync` **or** a Codex hook, not a sixth search box.
- New dump? `scripts/ingest-open.sh` + slim; document in `DATA.md`.
- New room? Not a fourth column. Sit stacks Guide.
- LLM? Wrap `askGideon`, same Act.
- Style: existing `index.css` tokens (gold, soot, display serif). Art in `public/art` + `src/art.ts`.

## 10. Run

```
cd artifacts/all-knowing
npm install
npm start            # map engine (:8099) + Vite PWA together — Task 56
# two terminals still fine:  npm run map  |  npm run dev
# npm start:live / npm run map:live  → optional live-memory, prints the EAC warning first
```

Wyatt is in Perth, PS5-primary, wants this to feel inevitable for a mid-run Tarnished holding a phone next to the TV. Optimize for that, then PC niceties.

When in doubt: one Character, one Act, one searchSync, two map frames documented, no new kernel.
