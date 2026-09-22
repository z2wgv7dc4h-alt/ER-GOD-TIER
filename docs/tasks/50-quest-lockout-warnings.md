# Task 50 — Surface quest lockout warnings before the player commits to an action

## Context

Repo root is `artifacts/all-knowing/`. Read `src/knowledge/endings.ts`/`storylines.ts` (real
`requires`/`grants`/`lockouts` edges per step, Task 12's quest DAG plus Task 25's 10 new
companion lines) and `src/Quests.tsx` first. The data already knows exactly which beats foreclose
which other lines (`lockouts[]` on each `PlanStep`, consumed by `planRoute`'s `foreclosed` list) —
but this is currently only shown reactively, after a step is already marked done. A player about
to do something irreversible (e.g. "Alexander in the Limgrave hole" / "Leda's Enir-Ilim
invitations," the two test cases named in `SCOPE.md`) has no warning *before* they commit.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Before a player marks a step done (via Quests.tsx's own UI, or Gideon's "I'm done"/Task 35's
done-report handling), show a real warning if that action would foreclose another line the
character has already started or that's otherwise notable — using the real `lockouts` data, not a
generic "are you sure?" prompt.

## Requirements

- Compute, for a given step about to be marked done, what it would foreclose (reuse
  `planRoute`'s existing logic/`lockouts` data — don't reimplement the DAG traversal).
- Only warn when the foreclosed line is actually relevant to this character — e.g. a line the
  character has already started (has at least one step done) or that's otherwise something the
  player would plausibly care about, not every theoretical lockout in the entire game's DAG
  regardless of relevance (that would be noise, not a warning).
- Wire this into both real completion paths: `Quests.tsx`'s own "mark done" UI and Gideon's
  markDone flow (Task 35's `nextCompletionId`/the router's done-report handler — check
  `src/lib/gideon.ts` and `Gideon.tsx`'s `applyFacts` call for markDone). A warning shown in only
  one of the two paths is an incomplete fix.
- The warning should be a real confirm-before-commit UI (not just a toast after the fact) —
  clicking through should still be one click/action for the common case, just with the real
  consequence visible first.

## Explicit exclusions

- Don't touch OCR, save parser, or the map engine.
- Don't change the underlying `lockouts` data or `planRoute` traversal logic — this is a UI
  surfacing task on top of data/logic that already exists and is already tested.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests using the two named test cases from `SCOPE.md` (Alexander in the Limgrave hole,
  Leda's Enir-Ilim invitations) — confirm the warning fires correctly for a character with the
  relevant line already started, and does not fire spuriously for an unrelated character.
- `npm run dev`: demonstrate the warning appearing before confirming one of the two test-case
  actions.
