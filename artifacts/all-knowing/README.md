# All-Knowing

<p align="center">
  <img src="public/art/all-knowing-cover.jpg" alt="All-Knowing — tarnished facing a hollow-helm beast in the snow, Haligtree burning on the horizon" width="100%">
</p>

Local-first Elden Ring workspace. One character. Five rooms. Gideon.

Base + Shadow of the Erdtree + Tarnished Pack. No server. No accounts. Saves and shots stay on the box.

The atlas is [egormagurin/EldenRingMap](https://github.com/egormagurin/EldenRingMap) rewired into this shell when you have extracted tiles from *your* install. Without that, the plates still work.

---

## Features

**Play shell** — desktop is a 280px Now strip beside the stage; a phone gets three tabs, Map / Now / Kit. The identity rail is a sheet behind your name, and the old lean-back toggle is gone.  
**Reckoning** — interview, warp-list paste, on-device Tesseract, inference with undo.  
**Atlas** — plates or live engine, leftover / gate / hunt pins, phone job chips. Plates also carry our grounded EldenRingMap-pack pins (dungeons, merchants, night bosses, collectibles). Fails closed: if the engine is down or the embed fails it shows the plate and a banner, never a blank iframe. The live engine has marker **search**, per-category toggles (all/none) and hide-found/labels/icons; our NPC placements sit under a dedicated **NPCs** category that defaults off.  
**Build lab** — Clark AR, soft caps, a one-AR first paint with the active hunt (missing pieces ordered by the kit's route) and the OP/PvP list, AR detail, matchup and `akb1.` codes behind one `Kits…` drawer. Show on map targets the first pinnable missing piece.  
**Goods paste** — paste an item list; one confident catalog/loot hit per line marks, anything else stays unknown (no OCR).  
**Quests** — the same `allLines()` graph Gideon plans, incl. the remaining companion lines; confirm before a lockout. Now's “N open · M locked” line opens this archive.  
**Codex** — guide, chests, merchants, achievement-shaped sets, SotE meters — plus the data pass: **full game text** with verbatim **dialogue** search + per-speaker cards, **weapon requirements/scaling/attack**, **EldenRingMap locations**, the **ER Checklist** item lists, **Medusa's 100% route** steps, **NPC placements**, and **boss drops** (163 bosses, base + SotE). Opened from the Tarnished sheet or a `/` search hit, never a tab.  
**Gideon** — router, Now strip (current beat · one gate · Show/Done), co-op toggle, idle chips, command palette. Quotes **verbatim dialogue** for a named speaker, answers **Medusa route** steps, and falls back to **placed-NPC maps**. Optional local LLM behind an env key.  
**Companions** — where-is-it locator for eight NPCs, region “what did I miss here”, a Stormveil checklist, and a co-op mode that drops Mimic / Torrent advice.  
**Vault** — profiles, packet copy/paste/QR, PWA offline shell.  
**Alias plane** — every warp-list grace canonicalises to a slug: authored where one exists, else a name-derived stub (no invented pin).

Live status and task history: `HANDOFF-CLAUDE.md`. Data inventory: `DATA.md`. Kernel: `ARCHITECTURE.md`.

---

## What you run

```bash
npm install    # once
npm start      # map engine (:8099) + workspace (:5173)
```

Open the Vite URL. If the engine is not set up, Atlas uses static plates and says so.

```bash
npm run map:setup   # one-time: extract tiles + markers from your local install
npm run map:merge   # fold our NPCs + pack markers into the engine's feed
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

The three play tabs are **Map / Now / Kit**. Everything else opens from the Tarnished sheet (or the
`1–5` keys / search).

| Room | Job |
|---|---|
| Map (Atlas) | Where to walk, what locks, what is still on the ground |
| Now (Gideon) | The current beat, one gate, Show / Done — ask it |
| Kit (Build lab) | Whether the numbers are real |
| Reckoning | How this Tarnished entered the world (sheet link) |
| Quests | Which line you are on, and what a tick would kill (sheet link) |
| Codex | The warehouse (sheet link or `/` search hit) |

---

*All things conjoined.*
