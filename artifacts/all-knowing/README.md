# All-Knowing

<p align="center">
  <img src="public/art/all-knowing-cover.jpg" alt="All-Knowing — tarnished facing a hollow-helm beast in the snow, Haligtree burning on the horizon" width="100%">
</p>

Local-first Elden Ring workspace. One character. Five rooms. Gideon.

Base + Shadow of the Erdtree + Tarnished Pack. No server. No accounts. Saves and shots stay on the box.

The atlas is [egormagurin/EldenRingMap](https://github.com/egormagurin/EldenRingMap) rewired into this shell when you have extracted tiles from *your* install. Without that, the plates still work.

---

## Features

**Reckoning** — interview, warp-list paste, on-device Tesseract, inference with undo.  
**Atlas** — plates or live engine, leftover / gate / hunt pins, phone job chips.  
**Build lab** — Clark AR, soft caps, compare, OP/PvP hunt list, `akb1.` codes.  
**Quests** — the same `allLines()` graph Gideon plans; confirm before a lockout.  
**Codex** — guide, chests, merchants, achievement-shaped sets, SotE meters.  
**Gideon** — router, idle chips, command palette. Optional local LLM behind an env key.  
**Vault** — profiles, packet copy/paste/QR, PWA offline shell.

Live status and task history: `HANDOFF-CLAUDE.md`. Data inventory: `DATA.md`. Kernel: `ARCHITECTURE.md`.

---

## What you run

```bash
npm install    # once
npm start      # map engine (:8099) + workspace (:5173)
```

Open the Vite URL. If the engine is not set up, Atlas uses static plates and says so.

```bash
cd vendor/elden-ring-map
# Windows: Setup.bat
# Linux:   ./setup-linux.sh
```

`npm run map` and `npm run dev` still work as two terminals.  
`npm start:live` / `npm run map:live` is optional process-memory read for a player dot. Off by default. Read the section below before enabling it.

Install from the browser menu when you want it on a phone. Fonts are self-hosted; the shell caches.

---

## Live memory mode — read this before you enable it

Default `npm start` / `npm run map` never touches the game process. It can watch `ER0000.sl2`. That path is not visible to anti-cheat as process injection.

`npm run map:live` is a **separate flag** (`--live-memory`). It opens `eldenring.exe` with **`PROCESS_VM_READ` only** for a map-screen player dot.

- Read only. No write, no DLL, no overlay, no input.
- Needs admin because the game runs elevated.
- Signatures move on patch; it fails closed and the save path still works.
- Localhost only.

If you do not know why you want it, leave it off.

---

## Rooms

| Room | Job |
|---|---|
| Reckoning | How this Tarnished entered the world |
| Atlas | Where to walk, what locks, what is still on the ground |
| Build lab | Whether the numbers are real |
| Quests | Which line you are on, and what a tick would kill |
| Codex | The warehouse |
| Gideon | Ask it |

---

*All things conjoined.*
