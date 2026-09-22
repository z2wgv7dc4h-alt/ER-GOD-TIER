# Map engine — egormagurin/EldenRingMap

Vendored at `vendor/elden-ring-map`. Upstream:
https://github.com/egormagurin/EldenRingMap

This is the atlas. All-Knowing does not grow a second map.

## What we took, what we did not

Took:

- Tile extract (`tools/extract_tiles.py`) — archives → DCX/Oodle → TPF/BC7 → pyramid
- Marker extract (`tools/build_markers.py`, `extract_items.py`) — 864 MSB files + params
- World → pixel (`server/lib/project.js`, `WorldMapLegacyConvParam`)
- Save decode (`server/lib/saveParser.js`, `slotWalk.js`, `bnd4.js`)
- Event flags via `data/eventflag_bst.txt` (from ER-Save-Lib)
- Watcher + SSE (`/api/events`)
- Canvas map (`web/js/map.js`) and category UI (`web/js/app.js`)
- Optional live position (`tools/live_memory.py`) — **not** wired as default

Did not take:

- Their standalone window as the product chrome
- Wiki tip scraping (`tools/fetch_tips.py`) as a required path
- Any generated tiles or names committed into git

## API the workspace uses

| Endpoint | Role |
|---|---|
| `GET /api/state` | last snapshot: characters, found ids, live status |
| `GET /api/markers` | `{ locales, markers[] }` |
| `GET /api/events` | SSE `state`, `pos`, `checked`, `error` |
| `GET/POST /api/saves` | switch `.sl2` / `.err` and slot |
| `POST /api/check` | manual override (local user-state.json) |
| `GET /?embed=1` | map canvas without their sidebar |

`?embed=1` hides `#sidebar` entirely, so any control that lives only inside it is unreachable in
Atlas. Task 59 (which supersedes Task 43) audited every user-facing control and gave the floating,
embed-mode-only copies below. The pattern is always the same: the builders/wiring populate **every
element sharing a class**, never one id, so the sidebar's copy and the embed copy stay in sync.
All floating embed controls are phone-sized (≥40px). The bottom-anchored ones sit inside the
iframe; All-Knowing's mobile tab bar is its own grid row, so it does not overlap the embedded map
and no iframe padding was needed.

### Embed-mode control audit (Task 59)

| Control | Where it lives | Visible in `?embed=1` before | What Task 59 did |
|---|---|---|---|
| World / plate switch (overworld, underground, shadow, ashen) | `#layer-buttons` (sidebar) | No | Floating `#embed-layer-buttons`; `buildLayerButtons()` populates every `.layer-buttons`. *(Landed before 59.)* |
| Category filter checkboxes (~50) | `#category-list` (sidebar) | No | Floating `#embed-cat-toggle` + `#embed-categories`; `buildCategories()` populates every `.category-list`; `.toggle-all-btn` bound to every copy; `refreshCounts()` now updates every `.cat[data-cat]` row. *(Landed before 59; counts generalised in 59.)* |
| Search / find marker | `#search` + `#search-results` | No | Generalised `.marker-search` / `.search-results`; floating copy `#embed-search` / `#embed-search-results` in `#embed-tools`; `bindSearch()` binds every pair; click-away, Escape and `/` act on every copy. |
| Save type + character (slot) picker | `#save-extension` / `#save-character` (`.save-picker`) | No | Generalised `.save-picker` / `.save-extension` / `.save-character`; floating copy in `#embed-tools`; `buildSavePicker` / `syncSavePicker` / `selectPickerOption` drive every copy. |
| Character / live indicator | `#char-name` / `#char-meta` / `#char-where` | No | Generalised `.char-name` / `.char-meta` / `.char-where`; `renderCharacter` / `renderWhere` / `applyState` update every copy (floating copy in `#embed-tools`). |
| Progress (overall found / total) | `#progress-label` / `#progress-fill` | No | Generalised `.progress-label` / `.progress-fill`; `refreshCounts()` updates every copy, including the `#embed-tools` bar. |
| Display options (hide found / labels / icons) | `#hide-found` / `#show-labels` / `#show-icons` | No | Generalised `[data-option]`; floating copies in `#embed-tools`; one shared `state` flag, all copies kept in sync via `setOptionInputs()`. |
| Language switch | `#lang-switch` (`.lang-switch`) | No | `buildLangSwitch()` populates every `.lang-switch`; floating copy in `#embed-tools`. |
| Zoom + / − / fit / centre-on-player | `#zoom-controls` (`#stage`) | **Yes** — never was in the sidebar | No move needed; embed buttons grown to 40×40 for touch. |
| Drag-pan / pinch-zoom | canvas pointer handlers (`map.js`) | **Yes** | `touch-action:none` + two-finger pinch (fixed before 59); unchanged. |
| Collapse / expand sidebar | `#sb-collapse` / `#sb-expand` | N/A (no sidebar in embed) | Hidden in embed; no floating copy needed. |

`#embed-tools` is collapsed by default (it holds search, character/save, options, progress and the
language switch) so it never covers the map until the player opens it.

Marker ids are stable enough to key Character fields: `grace:{row}`, `boss:{row}`.

Character snapshot fields we map:

```
name, level
stats.{vigor,mind,endurance,strength,dexterity,intelligence,faith,arcane}
found[]          → defeatedBosses / discoveredGraces / collectedItems
mapPixel         → follow / “where am I”
deaths, secondsPlayed, lastRestedGrace
```

Inventory loadout is **not** in this snapshot. That is a later slot-walk
extension, not something to scrape off a wiki.

## Coordinate model (do not reinvent)

```
S      = 256
worldX = gridX*S + S/2 + posX
worldZ = gridZ*S + S/2 + posZ
px     = worldX - 7168
py     = 16640 - worldZ
```

Legacy dungeons chain through `WorldMapLegacyConvParam`. Farum Azula,
Haligtree, Finger Birthing Grounds must pick one row per block
(`isBasePoint`, then non-origin anchor) or the region tears.

Tiles: pick the variant in `71_maptile.mtmskbnd` per
`lod*10000 + col*100 + row`. “Most bits set” is wrong on 247 cells.

## Local setup

Needs the game directory (`eldenring.exe` + `regulation.bin`), Node 18,
Python 3.9, and on Linux an Oodle shim against `oo2core_6_win64.dll`.

```
npm run map:setup                        # extract tiles + markers from your install
npm run map:merge                        # fold our NPCs + pack markers into the engine feed
npm start                                # from All-Knowing root: engine + Vite together
# or just the engine:  npm run map       (npm run dev runs Vite separately)
```

After a game patch, run setup again. Cache invalidation is their problem
and they already solved it.

## All-Knowing additions to the engine

**The engine now runs inside our own dev/preview server** — no second process, no
`npm run map`. The tiled map is static (`web/` + `web/tiles/` + a markers JSON), so
`vite.config.ts`'s `all-knowing-map-engine` plugin serves `/engine/**` and answers the
`/api/{markers,state,events,saves}` the engine's frontend calls (markers from the
generated `data/*.json`; state/saves empty). `MAP_ENGINE_BASE` is `/engine` in dev, so the
Atlas iframe and the marker bridge are same-origin. `npm run dev` alone shows the live
tiled map — on the phone too, because the PC serves it over the LAN.

Only the **live save reader and live player dot** need the Node engine (`node
server/index.js`, `npm run map`) — those are PC-only and are *not* required for the map.
The browser already parses `.sl2` itself (`src/lib/save.ts`).

The engine is absorbed as a plain runtime dependency here: `erlib` lives under `scripts/erlib/`
(our extractors import it; the engine tools carry a one-line path shim), the upstream repo shell
(README/`Setup.bat`/docs/`package.json`) is gone, and `server/package.json` marks the runtime CJS so
Node does not treat `require`-style server files as ESM.

`npm run map:merge` (`scripts/merge-engine-markers.py`) appends our markers to the engine's generated
`data/markers.json`: projected NPC placements plus the EldenRingMap-pack dungeons/merchants/night
bosses/collectibles. They render under dedicated sidebar categories we added to `CATS`
(`npc`, `merchant`, `dungeon`), so each is filterable and `npc` is **off by default**. Re-run the
merge after any `build_markers.py` regeneration (`data/markers.json` is generated/gitignored).

## Safety

Normal mode (`npm run map`, no flag): the server reads `ER0000.sl2` and watches
it for changes. It never writes the save, never opens the game process, and
makes no network calls. There is nothing for anti-cheat to see.

`--live-memory` / `npm run map:live` is **off by default** and strictly
additive. When enabled, the server spawns `tools/live_memory.py`, which:

- opens `eldenring.exe` with `PROCESS_VM_READ` **only** (Windows
  `ReadProcessMemory`, Linux the Proton process's `/proc`) — it can read but
  not modify the game, and never touches the save;
- locates structures by byte-signature scan (`CSMenuManImp`, `WorldChrMan`,
  …), not fixed offsets, so a patch breaks it rather than misreads it;
- needs administrator rights because Elden Ring runs elevated;
- does not inject, overlay, send input, call into the game, or use the
  network — samples go Python → local Node server → browser over localhost;
- falls back silently to save-file mode if Python is missing, the game is
  closed, admin rights are absent, or the signatures stop matching.

**EAC.** Elden Ring uses EasyAntiCheat, launched by
`start_protected_game.exe` for online play. EAC cannot distinguish a
read-only attach from a hostile one — every memory-reading tool (FPS
unlockers, autosplitters, speedrun timers, this reader) looks the same to it.
Attaching while protected play is running risks a ban. Run live mode **offline
only**, or in a modded setup that skips `start_protected_game.exe`. See the
README's "Live memory mode" section for the user-facing warning.

## Pulling upstream

```
git clone https://github.com/egormagurin/EldenRingMap.git /tmp/ERMap
# copy over vendor/elden-ring-map
# re-apply: CORS + OPTIONS + ?embed=1  (search for "All-Knowing")
```

Do not overwrite `data/eventflag_bst.txt` with an empty file.
Do not commit generated `web/tiles`.

## Phone Atlas controls (Task 69)

The desktop Atlas puts its filters in the topbar `.toggles` (Missing only / leftovers / locks /
the seven pin kinds). On a phone that whole bar is `display: none`, which left the three job
controls unreachable. Under `@media (max-width: 700px)` the Atlas now renders its own
`.atlas-jobs` chip bar over the map:

- **Visible on the map:** Missing only, leftovers, locks.
- **One overflow:** a `layers` chip toggles `#atlas-layers`, holding grace / boss / item / npc /
  fragment / spirit-ash / dungeon. This is the only Atlas layer UI under 700px; the old duplicated
  `.side-controls` block in the map side panel was removed (`src/index.css`, `src/Atlas.tsx`).
- Desktop keeps the topbar toggles unchanged; `.atlas-jobs` / `.atlas-layers` are hidden there.
- All chips are ≥ 38px. The engine iframe's own `?embed=1` controls (Task 59) are untouched, and no
  new pin system is introduced.

`src/Atlas.test.tsx` renders the workspace and asserts the three job controls stay in the tree, so a
future JS-side hide (not just a CSS query) fails the suite.

## If the map is blank

`AtlasWorkspace` fails closed (Task 82): it only draws the live `?embed=1` iframe while the engine is
actually up, and otherwise shows the static plate plus a visible banner — never a silent iframe.

1. Engine up? `npm start` starts it on :8099; `npm run map` runs the engine alone.
2. Banner "offline (:8099)": nothing is listening — start it; on a phone the plates are expected.
3. Banner "embed failed": the server answered but the iframe never loaded in 8s — restart, reload.
4. Plate with no pins: the plates need `public/sourced/open/coords.json`; live pins live in the iframe.
5. Tiles missing: run the engine tools (`tools/extract_tiles.py`, `tools/build_markers.py`) once against your install.
6. Tiles are never shipped, and we do not invent them — an unextracted install draws nothing.
7. The banner is a status, not an error wall: the static plate is a supported view, not a failure.
