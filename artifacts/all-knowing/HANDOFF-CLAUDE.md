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
- `src/lib/infer.ts` — apply/deny/clear, `closeWorld`, **`prefixKind`** for dump ids
- `src/lib/merge.ts` — union characters
- `src/lib/vault.ts` / `packet.ts` — profiles + export file
- `src/lib/gideon.ts` + `Gideon.tsx` — `askGideon` → `GideonAct`
- `src/lib/search.ts` — `searchSync` (command bar, Gideon log, Reckon extra, fallback)
- `src/lib/aliases.ts` — Paramdex 418 warps + name link to seed slugs
- `src/lib/mapEngine.ts` — EldenRingMap SSE (`/er-map` in dev)
- `src/lib/coords.ts` — loads guide pins + boss pins
- `src/lib/openData.ts` / `guide.ts` — async dumps for Codex
- `src/lib/ocr.ts` — **empty stub**
- `src/lib/save.ts` — **not a real .sl2 parser**

**Knowledge (authored, small)**
`src/knowledge/{catalog,endings,storylines,loot,builds,graces,collectibles,completion,medusa,missables,merchants,bossPins,awesome}.ts`

**Shell**
`App.tsx` is a god file (~27k). Split rooms when you touch UI.

**Vendor**
`vendor/elden-ring-map` — egormagurin/EldenRingMap. `npm run map`. Tiles/markers from a **local game install**, not shipped.

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
| `open/names.json` | ~6820 EN FMG names (Text Explorer, JP stripped) |
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
Close seed `implies`. Store on lists by catalog kind **or** prefix: `grace|point` → graces; `boss|hunt|bossflag|area` → bosses; `quest|line` → quests; else items.

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

### P0 — must for “not a demo”
1. **Alias table** — engine grace ids, Paramdex warpId, seed slugs, `boss-xyz.kill` ↔ `boss:slug`.
2. **Split `App.tsx`** into room files.
3. **Tests** — `prefixKind`, `searchSync`, `planRoute` lockouts, vault round-trip.
4. **Typecheck in CI** — this environment often lacked `node_modules/.bin`.
5. Honest empty states: OCR off, save parser off, engine offline.

### P1 — PS5 state
6. Wire Tesseract in Reckon **or** delete `ocr.ts` pretence.
7. Warp-list paste UX: one name per line, show unmatched tokens.
8. Interview coverage for SotE / Tarnished Pack starts.
9. Clipboard screenshots already hooked (`useClipboardShots`) — confirm they hit Reckon.

### P1 — Atlas
10. Pick **one** projection for lots or leave lots off the JPG.
11. SotE + ashen **plates** missing (only overworld + underground jpgs).
12. Engine iframe vs plate: don’t draw both sets of pins in conflicting space.
13. Dungeon bosses have XYZ only (Stormveil etc.) — interior maps not plated.

### P1 — Gideon / planner
14. DeepSeek behind `GideonAct` with grounding pack (stillAvailable + planRoute + searchSync + top catalog).
15. “I’m done” already ticks `plan.current.factId` — extend to dump ids.
16. Detours use level only loosely — use Armory boss resists when “stuck”.
17. 100% spine is Medusa **chapter titles**, not a real checklist.

### P2 — data
18. Parse `ItemLotParam_*` + flags into chest facts (Names txt has no coords; use `world-lots.json`).
19. Query-load `msb-enemies.json`.
20. Gathering nodes 21k — nameless AEG until mapped.
21. FanAPI images via `fanImage()` — Codex cards still text-first.
22. Sacred tear / golden seed list is a **starter**, not 30+30 complete.
23. Two hunt lists: tiny `fieldHunts` vs `hunts.json` — merge.
24. `items.json` 2.4 MB in guide folder — runtime uses `catalog.json`.
25. vawser event-flag dump not ingested (huge unstructured).
26. Full Carian JP + dialog not in PWA (size).

### P2 — PC
27. Real Compass-style TS `.sl2` parser **in browser**, flags → our ids.
28. `canonicalFactId` is name-equality only.
29. Live-memory mode is offline / no EAC only (document in UI).

### P3 — product polish
30. Multi-profile UX in the rail (vault API exists).
31. Packet diff exists in QoL — surface it.
32. PWA service worker / offline cache of `sourced/` — not done.
33. Command palette grouping by source.
34. Watchlist / leftovers — exists; bind to coords layer.
35. Build lab AR: embed Clark calculator, don’t guess.
36. Quest DAG lockout edges incomplete vs real flags.
37. Nightreign: out of v1.

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
| OCR | Returns `''`. |
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
npm run dev          # Vite PWA
npm run map          # EldenRingMap :8099
```

Wyatt is in Perth, PS5-primary, wants this to feel inevitable for a mid-run Tarnished holding a phone next to the TV. Optimize for that, then PC niceties.

When in doubt: one Character, one Act, one searchSync, two map frames documented, no new kernel.
