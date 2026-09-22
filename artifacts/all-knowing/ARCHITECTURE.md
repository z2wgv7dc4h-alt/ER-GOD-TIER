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

## Persistence

`all-knowing.vault.v1` — profiles + UI (room, sit, selected pin).
Packet `*.all-knowing.json` — character only, no shots.

## Hosted data

See `src/lib/hosted.ts`. Cached under `public/sourced/checklists/`.
Maps under `public/sourced/maps/`. Refresh with raw GitHub / fanapi; do not scrape MapGenie tiles.

## Refused

Uploads, save edits, bundling FromSoftware archives, inventing AR, Nightreign in v1.
