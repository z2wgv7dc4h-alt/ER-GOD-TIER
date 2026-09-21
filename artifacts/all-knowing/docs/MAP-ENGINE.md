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
vendor/elden-ring-map/Setup.bat          # Windows
vendor/elden-ring-map/setup-linux.sh     # Proton
npm run map                              # from All-Knowing root
```

After a game patch, run setup again. Cache invalidation is their problem
and they already solved it.

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
