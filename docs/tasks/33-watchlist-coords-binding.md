# Task 33 — Bind the watchlist/leftovers list to the Atlas coords layer

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md`,
`src/lib/leftovers.ts`, and `src/Atlas.tsx` first. `HANDOFF-CLAUDE.md` §6 P3 #34: "Watchlist /
leftovers → coords layer binding — not addressed." `leftovers.ts` computes what a character hasn't
picked up yet (a real, working "what am I missing" list), but Atlas doesn't visually surface those
items as pins on the map — the watchlist and the map are two disconnected views today. Scratch
work → `./.scratch/` (gitignored). Personal project — no license-gating.

## Objective
Wire `leftovers.ts`'s output onto the Atlas map as a real, toggleable pin layer, so a player can
see where their outstanding items/bosses/graces actually are, not just read a text list.

## Requirements
- Reuse the existing coordinate system (`src/lib/coords.ts`, the two-frame architecture documented
  in `ARCHITECTURE.md` "Two map frames (do not mix)") — do not invent a third coordinate scheme.
- A toggle to show/hide the leftovers layer on Atlas, consistent with the existing filter-chip
  pattern already in that room (grace/boss/item/etc chips).
- Tapping/clicking a leftover pin should do something useful — navigate to it, show its detail,
  or similar, consistent with how other pins already behave.

## Explicit exclusions
Don't touch OCR, save parser, Gideon, map engine, or `leftovers.ts`'s actual computation logic.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Real tests: a character with known-missing facts
produces the expected pin set on the layer. `npm run dev`: demonstrate toggling the layer and
tapping a pin.
