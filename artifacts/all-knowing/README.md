# All-Knowing

<p align="center">
  <img src="public/art/all-knowing-cover.jpg" alt="All-Knowing — tarnished facing a hollow-helm beast in the snow, Haligtree burning on the horizon" width="100%">
</p>

Local-first Elden Ring workspace. One character. Four sections. Gideon.

Base + Shadow of the Erdtree + Tarnished Pack. No server. No accounts. Saves and shots stay on the box.

The atlas is [egormagurin/EldenRingMap](https://github.com/egormagurin/EldenRingMap) absorbed into this app: our Vite server serves the live tiled map at `/engine`, so it works on the phone too. If the embed fails, static plates are the fallback.

---

## Features

**Shell** — four sections: **Tarnished** (overview / update / profiles), **Journey** (now / map / quests), **Library** (search / builds / kit) and **Gideon**. A shared header carries the section tabs, command search and character chip; a phone gets four bottom tabs, desktop gets an optional Gideon dock. The old off-canvas Tarnished rail is gone. `#/journey/map` URL hashes keep reload and back working, and every old room still resolves through `setModule`.  
**Reckoning** — interview, warp-list paste, on-device Tesseract, inference with undo.  
**PS5 capture** — no save needed: the setup wizard reads the status screen (level, runes, attributes), the live camera scanner reads the inventory and equipment screens, and the map photo reader reads a photographed map / grace list into discoveries. All OCR runs on-device.  
**Atlas** — plates or live engine, leftover / gate / hunt pins, phone job chips. Plates also carry our grounded EldenRingMap-pack pins (dungeons, merchants, night bosses, collectibles). Fails closed: if the embed fails it shows the plate and a banner, never a blank iframe. The live engine has marker **search**, per-category toggles (all/none) and hide-found/labels/icons; our NPC placements sit under a dedicated **NPCs** category that defaults off.  
**Builds** — Clark AR, soft caps and a one-AR first paint with the active hunt (missing pieces ordered by the kit's route). **Library → Kit** holds the OP/PvP list, AR detail, matchup, broken-tricks tech and `akb1.` codes. Show on map targets the first pinnable missing piece.  
**Goods paste** — paste an item list; one confident catalog/loot hit per line marks, anything else stays unknown (no OCR).  
**Quests** — the same `allLines()` graph Gideon plans, incl. the remaining companion lines; confirm before a lockout. Journey → Now's “N open · M locked” line opens this archive.  
**Codex** — guide, chests, merchants, achievement-shaped sets, SotE meters — plus the data pass: **full game text** with verbatim **dialogue** search + per-speaker cards, **weapon requirements/scaling/attack**, **EldenRingMap locations**, the **ER Checklist** item lists, **Medusa's 100% route** steps, **NPC placements**, and **boss drops** (163 bosses, base + SotE). Opened from Library → Search or a `/` search hit, never its own top tab.  
**Gideon** — router, chat + idle chips + command palette; the current beat · one gate · Show/Done dashboard is Journey → Now, and Gideon also docks on wide desktops. Quotes **verbatim dialogue** for a named speaker, answers **Medusa route** steps, and falls back to **placed-NPC maps**. Optional local LLM behind an env key.  
**Companions** — where-is-it locator for eight NPCs, region “what did I miss here”, a Stormveil checklist, and a co-op mode that drops Mimic / Torrent advice.  
**Vault** — profiles, packet copy/paste/QR, PWA offline shell.  
**Offline everything** — Settings → Tarnished → Profiles → **Data & offline** downloads the whole `public/sourced/**` data plane (entity index, wiki pages + search index, open dumps, images) into a dedicated Cache Storage bucket with a files/MB progress bar. Resumable, removable, and the service worker serves `sourced/**` cache-first from it, so the wiki, search and Gideon's wiki answers work with no connection. Storage used/quota is shown and persistence is requested.  
**Wiki corpus** — the full Fandom snapshot (4,939 pages) plus a prebuilt search index, wired into Library search, entity Lore tabs and Gideon.  
**Alias plane** — every warp-list grace canonicalises to a slug: authored where one exists, else a name-derived stub (no invented pin).

Live status and task history: `HANDOFF-CLAUDE.md`. Data inventory: `docs/DATA-CATALOG.md` (regenerate with `npm run data:catalog`). Current architecture: `docs/ARCHITECTURE.md` (kernel history in the root `ARCHITECTURE.md`).

---

## What you run

```bash
npm install    # once
npm run dev    # workspace + the live map engine at /engine (no second process)
```

Open the Vite URL — the tiled map is served by the app at `/engine`. If the embed fails, Atlas shows the static plates and says so.

```bash
npm run map:setup   # one-time: extract tiles + markers from your local install
npm run map:merge   # fold our NPCs + pack markers into the engine's feed
```

`npm run map` is now only for the PC live save reader / player dot — the map needs no second process.  
`npm start:live` / `npm run map:live` is optional process-memory read for a player dot. Off by default. Read the section below before enabling it.

Install from the browser menu when you want it on a phone. Fonts are self-hosted; the shell caches.

---

## Run it on the phone

1. `npm run cert` once (see below) so the LAN dev server is HTTPS.
2. `npm run dev` on the PC, then open `https://<PC LAN IP>:5173` on the phone and
   accept the certificate warning once (secure context is required for the camera).
3. Install it from the browser menu for the offline shell.
4. Settings → Tarnished → Profiles → **Data & offline** → *Download everything for
   offline* to take the wiki + search corpus with you.

The live map is served same-origin at `/engine`, so no second process is needed
until you want the PC save / player-dot reader (`npm run map:live`).

---

## Gideon AI

Gideon works with no key: the deterministic router answers from the character and
the local corpus. An optional LLM answers open-ended questions. Two providers are
supported, chosen by config with no code change:

| Provider | `VITE_GIDEON_PROVIDER` | Default model | Default base URL | Dev proxy |
|---|---|---|---|---|
| DeepSeek | `deepseek` | `deepseek-chat` | `https://api.deepseek.com/v1` | `/gideon-llm-deepseek` |
| Meta Muse Spark | `meta` (default) | `muse-spark-1.3-contributor` | `https://api.meta.ai/v1` | `/gideon-llm` |

To enable one — **DeepSeek is the documented setup** for this build:

1. Copy `.env.example` to `.env.local` and set `VITE_GIDEON_API_KEY` to your
   DeepSeek key.
2. Set `VITE_GIDEON_PROVIDER=deepseek` (already the value in `.env.example`).
   Set it to `meta` to use Meta Muse Spark instead; a `VITE_GIDEON_BASE_URL`
   containing `deepseek` is detected too.
3. Optional overrides: `VITE_GIDEON_BASE_URL` and `VITE_GIDEON_MODEL`
   (`deepseek-reasoner` is accepted for the reasoning model). Leave both empty
   unless you need them — an explicit URL always wins over the provider, so a
   leftover Meta URL would bypass the DeepSeek proxy; clear it when switching.
4. **Restart the dev server** — Vite only reads `.env.local` at startup.
5. Settings → **Gideon AI key → Test connection** reports the provider, model and
   latency (one ping, the same 45 s timeout as real calls).

In dev the browser calls the provider through our Vite proxy, so the phone never
hits CORS. The key is embedded client-side — this is a local-first, no-backend
PWA, so keep it on your own LAN and never commit `.env.local`. DeepSeek chat has
no image input, so the equipment-screen reader falls back to on-device OCR.

---

## Tooling & audits

```bash
npm run data:catalog     # regenerate docs/DATA-CATALOG.md (every source + consumer)
npm run index:entities   # rebuild public/sourced/entity-index.json
npm run data:offline     # rebuild public/sourced/offline-manifest.json
npm run test:bundle      # build, then run the bundle-budget guards
npm run audit:ui         # static UI audit (needs a running dev server)
npm run crawl:ui         # click-everything crawl → .scratch/ui-crawl/<ts>/crawl.md
npm run test:ocr         # the OCR/scanner suite (vitest.ocr.config.ts)
```

---

## HTTPS on the LAN (needed for the phone camera)

The live inventory scanner uses `getUserMedia`, which browsers only allow in a **secure
context**. A plain `http://192.168.x.x:5173` tab is not secure, so the camera stays blocked.
Generate a self-signed certificate once:

```bash
npm run cert            # uses openssl if installed, else Node's crypto (no new deps)
npm run dev             # Vite now serves https://localhost:5173 and https://<lan-ip>:5173
```

`npm run cert` writes `.cert/key.pem` + `.cert/cert.pem` (gitignored) covering `localhost`
and every LAN IPv4 this PC currently has. On the phone, open `https://<PC LAN IP>:5173` and
**accept the "not private" warning once** (Advanced → Proceed). After that the browser treats
the origin as secure and the camera prompt appears. Re-run `npm run cert -- --force` whenever
the LAN IP changes (new Wi-Fi). Without a `.cert/` folder the dev server stays plain HTTP,
exactly as before.

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

## Sections

Four sections (keys `1`–`4`, or the phone's four bottom tabs). The legacy five rooms still resolve:
`Reckon→Tarnished/Update`, `Atlas→Journey/Map`, `Quests→Journey/Quests`, `Build→Library/Builds`,
`Codex→Library/Search`.

| Section | Sub-views | Job |
|---|---|---|
| Tarnished | Overview · Update · Profiles | Where am I at? Character, progress, saves, profiles |
| Journey | Now · Map · Quests | What now / where / working towards |
| Library | Search · Builds · Kit | What do I know / what should I build |
| Gideon | — | Ask me anything (full chat) |

Every old room still opens through the compat shim, so Cursor/Thread/Related/command-palette links
keep working unchanged.

---

*All things conjoined.*
