# Task 62 — Gathering nodes stay off the player map

## Context

Repo root is `artifacts/all-knowing/`. Read `src/lib/gatheringNodes.ts`, `src/Atlas.tsx`,
`src/Codex.tsx`, and the gathering section of `DATA.md`.

Task 41 ingested ~21.8k AEG placements. They have model codes, not item names. Plotting them on
the JPG would make the atlas unusable. A world-classification heuristic already mislabeled area
60 once.

Independent of other 52+ briefs.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Codex may list gathering nodes as "unverified placement, model code only".
Atlas must not draw them.
Gideon must not answer "where is smithing stone 2" from this dump.

## Requirements

- Add a guard test: Atlas pin sources list does not include `gathering-nodes.json`.
- Comment at the top of `gatheringNodes.ts` stating they are not map-complete until an item
  field exists.
- If Atlas or Gideon already consume this dump as pins or location answers, remove that path.
  Codex listing with an honest label is fine.

## Explicit exclusions

- Do not invent material names for AEG codes.
- Do not delete the dump.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- Test that pin assembly ignores gathering nodes.
