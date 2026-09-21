# All-Knowing

Local-first Elden Ring workspace. One character. Three rooms. Map, build, quests.

The atlas is not a sketch waiting to be replaced later. It is
**[egormagurin/EldenRingMap](https://github.com/egormagurin/EldenRingMap)**
rewired into this shell: tiles and markers generated from *your* game install,
save watched on disk, progress pushed over SSE.

## What you run

Two processes on your machine. Nothing is uploaded.

```bash
# 1. once per game patch, from a PC that has Elden Ring installed
cd vendor/elden-ring-map
# Windows: Setup.bat
# Linux:   ./setup-linux.sh

# 2. map engine (watches ER0000.sl2, serves tiles + /api/*)
npm run map          # from this repo root → http://127.0.0.1:8099

# 3. workspace
npm install
npm run dev          # Vite on :5173, proxies /er-map → :8099
```

Open the Vite URL. The Atlas pane embeds the live map (`/?embed=1`). Stats,
found flags, and marker lists flow into Build lab and Quests through one
`Character` object.

`npm run map:live` is the optional memory reader (offline / no EAC only).

## Why this map, not MapGenie

| | Hosted wiki maps | EldenRingMap |
|---|---|---|
| Art | someone else's tiles | `71_maptile.tpfbhd` from your install |
| Markers | hand-placed | MSB + ItemLotParam + BonfireWarpParam |
| Progress | checkboxes | event flags in the save |
| Live position | no | optional read-only process attach |
| Legal | grey | generated files stay on your disk |

We do not ship tiles or `markers.json`. Those are FromSoftware’s art and must
be extracted locally. The vendor copy is code + paramdefs + the flag block table.

## How the rewire works

```
game install ──extract_tiles / build_markers──► vendor/.../data + web/tiles
ER0000.sl2  ──SaveReader + fs.watchFile──────► /api/state  /api/events
                                                    │
                          Vite /er-map proxy        │
                                                    ▼
                     All-Knowing  Character  ◄── EngineBridge
                           │
              Atlas iframe    Build lab    Quest graph
```

Contracts live in `src/lib/mapEngine.ts`. The engine snapshot’s `found[]`
ids (`grace:…`, `boss:…`, item categories) become
`discoveredGraces` / `defeatedBosses` / `collectedItems`. Eight stats come
from the same slot walk EldenRingMap already does.

Patches we made in the vendor tree (keep these if you pull upstream):

- CORS on `/api/*` so the workspace can read the engine cross-origin
- `?embed=1` hides EldenRingMap’s own sidebar
- `OPTIONS` preflight

Details: `docs/MAP-ENGINE.md` and their own `vendor/elden-ring-map/docs/HOW-IT-WORKS.md`.

## Scope

v1 worlds: base game + Shadow of the Erdtree + Tarnished Pack.
Nightreign is a later campaign tab.

Still to land on top of this engine: Thomas Clark AR math, a real quest DAG
tied to flag ids, inventory from the slot (not just flags).

## Rules

- Save is read-only. No editor in this product.
- Live memory mode is offline-only.
- Do not commit `web/tiles`, `data/markers.json`, `data/items.json`.
- Non-commercial fan project. FromSoftware / Bandai Namco own the work.
