# All-Knowing

Local-first Elden Ring workspace. One character. Three rooms. Map, build, quests.

The atlas is not a sketch waiting to be replaced later. It is
**[egormagurin/EldenRingMap](https://github.com/egormagurin/EldenRingMap)**
rewired into this shell: tiles and markers generated from *your* game install,
save watched on disk, progress pushed over SSE.

## What you run

One command starts both the local map engine and the workspace. Nothing leaves
your machine.

```bash
npm install    # once
npm start      # map engine (:8099) + workspace (:5173), together
```

Open the Vite URL printed in the terminal. The Atlas embeds the live map
(`/?embed=1`); stats, found flags and marker lists flow into Build lab and Quests
through the one `Character` object.

If the map engine is not set up (or is simply not running), the workspace still
works: the Atlas falls back to the static plates and the banner says so. That is
expected — especially on a phone. The interface — shell, styles and the fonts
(which are self-hosted) — is cached on first load, so you can install it from the
browser menu (“Install” / “Add to Home Screen”) and reopen it with no connection.

One-time, and again after a game patch, generate tiles and markers from a PC that
has Elden Ring installed:

```bash
cd vendor/elden-ring-map
# Windows: Setup.bat
# Linux:   ./setup-linux.sh
```

Prefer two terminals? `npm run map` and `npm run dev` still work individually
(`map:live` is the live-memory variant of the engine).

`npm start:live` / `npm run map:live` is an **optional** add-on that reads the
running game's memory for a live player dot. It is **off by default** and carries
real anti-cheat risk — read [Live memory mode](#live-memory-mode--read-this-before-you-enable-it)
below before you use it.

## Live memory mode — read this before you enable it

The default `npm run map` never touches the game process. It reads
`ER0000.sl2` and watches it for changes; that is the whole mechanism. Nothing
in it is visible to anti-cheat.

`npm run map:live` is a **separate, opt-in flag** (`--live-memory`) that
additionally reads the running game's process memory for a real-time player
dot. Because it is not part of the default map and is not started unless you
pass the flag, a normal install stays on the save-file path.

### What it actually does

- The server spawns `vendor/elden-ring-map/tools/live_memory.py`, which opens
  `eldenring.exe` with **`PROCESS_VM_READ` only** and samples the player's
  map-screen location (and world position for height) about 20 times a second.
- On Windows it reads through `ReadProcessMemory`; on Linux it reads the
  running Proton process's `/proc` entries.
- It finds the game's structures by scanning for byte-signature patterns
  (`CSMenuManImp`, `WorldChrMan`, …) rather than fixed offsets, so a game patch
  usually breaks it rather than making it read the wrong thing.
- It needs administrator rights, because Elden Ring itself runs elevated.
- It is strictly additive: if Python is missing, the game is closed, you are
  not an admin, or a patch moves the signatures, it logs once and the map
  keeps working from the save file alone.

### What it does not do

- It **never writes** to game memory — read access only.
- It never injects a DLL, never draws an overlay, never sends input, and never
  calls into the game.
- It never touches `ER0000.sl2`; the save path is a separate, read-only reader.
- It makes no network calls. Samples go from Python to the local Node server
  to your browser over localhost only.

### The anti-cheat risk

Elden Ring ships **EasyAntiCheat (EAC)**, a kernel-level anti-cheat service
launched by `start_protected_game.exe` for online play. EAC is deliberately
not able to tell an honest read from a malicious one: any process that attaches
to the game and reads its memory looks the same to it, so memory-reading tools
of every kind — FPS unlockers, autosplitters, speedrun timers, this reader —
carry a ban risk when they run alongside EAC. Enabling live mode while
protected online play is running can put your account at risk.

> **Offline only.** Run `npm run map:live` only when EAC is not running — an
> offline session, or a modded setup where you launch the game without
> `start_protected_game.exe`. For normal play, use `npm run map`; progress
> still updates on every save. If you don't understand the tradeoff, don't
> enable it.

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

## Gideon and the optional LLM

Gideon's planner is a deterministic router (`src/lib/gideon.ts`) that returns a
`GideonAct`. When `VITE_DEEPSEEK_API_KEY` is set, open-ended questions are
answered by DeepSeek instead; lookups (a named ending, a warp, a build, "what is
still available") stay on the router for speed and cost. Both paths return the
same act shape, so the UI does not change.

Set the key in `.env.local` (gitignored, matched by `*.local`):

```bash
VITE_DEEPSEEK_API_KEY=sk-...
# optional: VITE_DEEPSEEK_MODEL (default deepseek-flash)
```

The model only sees a grounding pack built from this repo's own structured data
(`stillAvailable`, `planRoute`, `searchSync`, a bounded catalog slice). Every
`factId` / `buildId` / `goal` it returns is validated against that pack before
it is used; an invented id rejects the turn and falls back to the router. With no
key configured the app behaves exactly as before — router only, with one
informational log line.

**Client-side key tradeoff.** This is a local-first PWA with no backend, so the
browser calls DeepSeek directly and the key is present in client code at runtime.
That is accepted because the app runs on its owner's machine and is not a public
multi-tenant service. If the distribution model ever changes, move the call
behind a server proxy and stop shipping the key to the client.

## Rules

- Save is read-only. No editor in this product.
- Live memory is opt-in, read-only, and offline-only. Default `npm run map`
  never opens the game process; `npm run map:live` must not run alongside EAC.
- Do not commit `web/tiles`, `data/markers.json`, `data/items.json`.
- Non-commercial fan project. FromSoftware / Bandai Namco own the work.
