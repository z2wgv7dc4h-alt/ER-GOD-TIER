# All-Knowing architecture (kernel)

> Current, full-app architecture is `docs/ARCHITECTURE.md`. This file is kept as the
> kernel-only note: the invariant core code must not drift from. For the shell,
> AI/provider wiring, the data plane, the atlas and tooling, see `docs/ARCHITECTURE.md`
> and `docs/MAP-ENGINE.md`.

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
alias plane (`scripts/gen-aliases.mjs` → `aliases.json`; see `docs/ALIAS-PLANE.md`). Every
`BonfireWarpParam` warp resolves through it: an authored slug where one exists, otherwise a
name-derived `grace:{slug}` stub with no catalog fact, no pin and no implications (Task 73).

## Persistence

`all-knowing.vault.v1` — profiles + UI (room, missingOnly, selected pin).
Packet `*.all-knowing.json` — character only, no shots. PacketBar shares it by clipboard/download
and a scannable QR: the full JSON when ≤ 2953 bytes, else a filename + SHA-256 handoff card
(`src/lib/packetQr.ts`, `uqr`).
Build codes (`src/lib/buildCode.ts`, `akb1.…`) are a separate, smaller concern — stats + level +
loadout only, for pasting into chat. They are not the packet and carry no run progress.

## Refused

Uploads, save edits, bundling FromSoftware archives, inventing AR, Nightreign in v1.
