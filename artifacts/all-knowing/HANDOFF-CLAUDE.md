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
```
Clones: er-guide, eldenring-api, Paramdex ER/Names, ERR-MapForGoblins-DLL data.

---

## 4. Live / remote sources to leverage (do not scrape MapGenie)

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
14. 🔄 DeepSeek behind `GideonAct` — Task 20, in progress (a prior attempt died on the same
    scratch-directory permission issue that hit several other tasks; fixed and retrying).
    Grounding pack + hallucination-guard validation are in the task's requirements.
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
  instead of one sidebar id. **Task 43 is queued to systematically audit the rest of the sidebar
  for the same pattern** rather than fixing the next instance reactively.
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
- Scadutree fragments + Revered ashes as first-class SotE meters.
- Cookbook / bell bearing / whetblade / crystal tear sets (achievement-shaped).
- Merchant “who sells X after I give Y scroll.”
- Rememberance shop (Enia) as a table.
- Soft caps already marked on the stat card.
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
| Medusa pack | Index only, no scraped walkthrough text (copyright). |

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
