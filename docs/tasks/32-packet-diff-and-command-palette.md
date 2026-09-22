# Task 32 — Packet diff surfacing + command palette source grouping

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md`, `src/lib/packet.ts`,
and `src/lib/search.ts` first. Two small, real, bundled gaps from `HANDOFF-CLAUDE.md` §6 P3:
- #31 "Packet diff surfacing — not addressed." `packet.ts` exports/imports a character packet
  (QR/file share between devices, per `SCOPE.md` #4) but there's no UI showing *what changed*
  when importing a packet that conflicts with local state.
- #33 "Command palette grouping by source — not addressed." The search/command palette
  (`Ctrl+K`, per `src/QoL.tsx`/`search.ts`) returns results but doesn't group them by where they
  came from (grace/boss/item/alias/etc.), making a long result list harder to scan.
Scratch work → `./.scratch/` (gitignored). Personal project — no license-gating.

## Objective
1. When importing a packet, show a real diff (what facts would be added/changed/lost) before
   committing it, using the conflict-resolution machinery Task 24 already built
   (`src/lib/conflict.ts`) rather than a silent overwrite.
2. Group command palette results by source/kind in the UI so a search returns organized sections,
   not one flat list.

## Requirements
- Packet diff: reuse `resolveClaim`/`resolveConflict` from `conflict.ts` — don't build a second
  conflict system. Show the user new facts, facts that would flip, and facts where the imported
  packet loses to existing higher-authority evidence, before they confirm the import.
- Command palette: group by `searchSync`'s existing result `module`/source field (check its
  actual shape first) — headers like "Bosses", "Items", "Quests" etc.

## Explicit exclusions
Don't touch OCR, save parser, Gideon, map engine, or `conflict.ts`'s actual resolution logic —
reuse it, don't modify it unless you find a real bug while using it (report if so).

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Real tests: import a packet with a genuine conflict
against local state, assert the diff correctly identifies winner/loser per Task 24's rules.
`npm run dev`: demonstrate both features working.
