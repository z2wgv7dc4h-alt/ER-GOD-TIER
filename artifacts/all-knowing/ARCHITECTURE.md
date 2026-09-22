# All-Knowing architecture

## Kernel

One `Character` in `src/state.tsx`. Modules project it. Gideon mutates it only through `setCharacter` / `applyFacts`.

```
PS5  interview + shots ─┐
PC   .sl2 / map SSE    ─┼──► Character ── rooms + Gideon
Vault / packet         ─┘
```

Fact language: `kind:slug`. State: `true | false | unknown`.

Evidence → facts runs through `applyFacts` / `denyFacts` / `closeWorld` (`src/lib/infer.ts`).
`closeWorld` walks `catalog.implies` **and** the authored `inferChains` table, so a named read
(OCR hit, warp paste, typed item) can imply downstream facts. Derived facts are always
`source: 'inference'`; Task 24 conflict rules keep a save flag or an explicit deny winning.
Engine ids (`grace:{row}`, `bossflag:{n}`) canonicalise to authored slugs via the generated
alias plane (`scripts/gen-aliases.mjs` → `aliases.json`; see `docs/ALIAS-PLANE.md`).

## Shell

```
.rail 220px     .stage 1fr      .guide 320px
Identity        current room    Gideon
```

`sit` class: Stage then Guide. Hotkeys in `QoL.tsx` (`/` search, `1–5` rooms, `u` undo, `⌘S` packet).

## AI

Deterministic router `src/lib/gideon.ts` → `GideonAct`.
UI `src/Gideon.tsx` executes the act.

Intents already wired: ending/line plan, blitz, still-available, wear build, loot, warp, hunt, stuck, 100% spine, affirm (“show it”).

Replace the router later; do not replace the act.

Idle proactive chips (`src/lib/suggestions.ts` → `idleSuggestions`) reuse `stillAvailable` /
`nextMoves` / `leftovers` / `approachingGates` and run through the same `run()` path; the command
palette debounces `searchSync`. Before any step is ticked (Quests.tsx or Gideon markDone / “I'm
done”), `src/lib/lockWarnings.ts` confirms via `LockoutPrompt` when `planRoute` would foreclose a
line the character started — no second DAG walker.

## Persistence

`all-knowing.vault.v1` — profiles + UI (room, sit, selected pin).
Packet `*.all-knowing.json` — character only, no shots. PacketBar shares it by clipboard/download
and a scannable QR: the full JSON when ≤ 2953 bytes, else a filename + SHA-256 handoff card
(`src/lib/packetQr.ts`, `uqr`).

## Hosted data

See `src/lib/hosted.ts`. Cached under `public/sourced/checklists/`.
Maps under `public/sourced/maps/`. Refresh with raw GitHub / fanapi; do not scrape MapGenie tiles.

Fonts (Cinzel + Source Sans 3, both OFL) are self-hosted under `public/fonts/` and declared with
`@font-face` in `src/index.css`; the service-worker precache includes them, so the interface works
offline with no cross-origin font request. Dev startup is `npm start` (map engine + Vite together).

## Refused

Uploads, save edits, bundling FromSoftware archives, inventing AR, Nightreign in v1.
