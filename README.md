# ER GOD TIER

<p align="center">
  <img src="artifacts/all-knowing/public/art/all-knowing-cover.jpg" alt="All-Knowing — tarnished facing a hollow-helm beast in the snow, Haligtree burning on the horizon" width="100%">
</p>

**All-Knowing** is a local-first Elden Ring companion for a mid-run Tarnished. One character. One atlas. One planner. Base game, Shadow of the Erdtree, Tarnished Pack.

No account. No upload. Saves and screenshots never leave the machine.

The app lives in [`artifacts/all-knowing/`](artifacts/all-knowing/). That folder’s `HANDOFF-CLAUDE.md` is the live engineering brief. This page is the product.

---

## Why it exists

Wiki tabs, a map site, a spreadsheet, and a chat that does not know what you have already burned. This repo is the attempt to put that on one desk — and on a phone next to the TV.

Gideon answers from **this** character: what is next, what locks if you keep walking, where the kit pieces are, what the warp list actually said.

---

## Features

### Play shell
The product is three surfaces: **Map / Now / Kit**. A phone shows them as bottom tabs; desktop is a 280px **Now** strip beside the stage, with no identity column. Your name opens the **Tarnished sheet** — profiles, packet, save drop, recents, the full character card and the five room links. Reckon / Quests / Codex are links in that sheet, not tabs.

### One character
Interview, PS5 screenshots (on-device OCR), warp-list paste, PC `.sl2` drop, or a live map-engine save. Profiles in the Tarnished sheet. Packet file + QR to move a run between boxes. Nothing is posted anywhere.

### Reckoning
Answer the basics. Starting class, DLC, goal. Paste a Site of Grace list. Drop a menu shot. Low-confidence OCR stays unknown. Inference chains close the world (Fingerslayer → Nokron, Great Rune → its shardbearer) with undo.

### Atlas
Static plates when you are on a phone or the engine is down. Full EldenRingMap embed when you have run extract on a PC with the game installed. It fails closed: if `:8099` is down or the embed fails, you get the plate and a banner — never a silent blank iframe. Leftover pins, missable-gate layer, hunt-list pins for a selected kit. On a phone: Missing only / leftovers / locks sit on the map; pin kinds hide under **layers**.

### Kit (Build lab)
First paint is stats, **one AR**, and the active hunt — or “Pick a kit…”. Attack rating is the vendored 1.17 regulation math (Clark); soft-cap marks sit on the stat card. The OP/PvP chips, the full AR detail, the NpcParam matchup, the side-by-side weapon compare and the shareable `akb1.` build codes all live behind one closed **Kits…** drawer. A hunt names the pieces you still lack, ordered along the kit's route, and pins the ones that already have a grace; Show on map targets the first pinnable one. Scadutree blessing is counted, not faked into AR.

### Goods paste
Paste a list of item names (in the Tarnished sheet). A line is marked only when it is one confident catalog/loot hit; anything else stays unknown. No OCR, no invented ids.

### Quests
One graph. Quests and Gideon tick the same `factId`s. Lockout confirm before a tick that would kill a line you started. The Now strip’s “N open · M locked” line opens the archive. Eight lockable spines in the planner (Ranni, Millicent, Fia, Dung Eater, Tanith, Leda, Sellen, Ymir) plus gates for Forge, Maliketh, Sealing Tree, frenzy, Seluvis, Volcano, Millicent’s fork, Varré — and the companion pass (Alexander, Patches, Nepheli, Roderika & Hewg, Boc, Hyetta, Irina, Diallos, Igon) on the same graph.

### Codex
The warehouse: guide items, chests, merchants, cookbooks, bell bearings, whetblades, and the SotE fragment / revered-ash meters (count only). It is not a tab — open it from the Tarnished sheet or a `/` search hit. Gathering nodes are listed as unverified model codes and are not dumped on the player map.

### Now (Gideon)
The Now strip shows the current beat, one gate or nothing, **Show** (only when an existing pin resolves) and **Done** (through the lockout confirm), plus the open · locked line into the Quests archive. The router is deterministic first: “what next”, “if I keep going”, “wear Rivers”, “where is Blaidd”, “what did I miss here”, “I’m done”. Idle suggestion chips, a co-op toggle that drops Mimic / Torrent advice, and a command palette (`/` or Ctrl+K) with live results and arrow keys. Optional Muse / env-key LLM only after the router misses — and only if you configured it locally.

### Phone / PWA
Install from the browser, self-hosted fonts, offline shell. Map engine is optional. The live-memory player-dot is opt-in and off by default.

---

## Run

```bash
cd artifacts/all-knowing
npm install
npm start          # map engine :8099 + Vite together
```

Open the Vite URL. Atlas embeds `/?embed=1` when the engine is up; otherwise you get the plates and a banner that says so.

```bash
# first time on a PC that has the game
cd vendor/elden-ring-map
# Windows: Setup.bat
# Linux:   ./setup-linux.sh
```

Two terminals still work: `npm run map` and `npm run dev`.  
`npm start:live` / `npm run map:live` reads process memory for a player dot. Read the live-memory section in `artifacts/all-knowing/README.md` before you touch that.

---

## This repo

| Path | What it is |
|---|---|
| `artifacts/all-knowing/` | The product |
| `artifacts/all-knowing/HANDOFF-CLAUDE.md` | What is built, what is still open |
| `artifacts/all-knowing/DATA.md` | Every dump on disk |
| `artifacts/all-knowing/ARCHITECTURE.md` | Kernel contracts |
| `docs/tasks/` | Agent briefs this tree was built through |

Nightreign is out of scope. The app does not edit saves, ship FromSoftware archives, or invent attack rating.

---

*All things conjoined.*
