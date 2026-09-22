# Task 48 — Side-by-side weapon/build comparison in the Build lab

## Context

Repo root is `artifacts/all-knowing/`. Read `src/Build.tsx` and `src/lib/ar.ts` (the real
attack-rating engine, Task 10's ported Clark calculator) first. Right now the Build lab computes
attack rating for the player's currently equipped loadout, one weapon at a time — there's no way
to compare two weapons (or the same weapon with two different affinities/upgrade levels) side by
side. Gideon's router already has a `compareAct`/comparison handler (Task 25/40 — read
`src/lib/gideon.ts`'s comparison section) for build-vs-build and damage-type-vs-boss comparisons
in chat form; this task is a direct, visual UI equivalent in the Build lab itself, not a router
change.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Let a player pick two weapon configurations (weapon + affinity + upgrade level, or two different
weapons entirely) and see their real attack ratings side by side against the current character
stats, using the same real `attackRatingForSlot`/AR engine already in place — not a second,
parallel calculation.

## Requirements

- Real UI: a comparison panel/mode in `Build.tsx` — two weapon pickers (reuse whatever weapon-
  selection UI already exists for the main loadout, don't build a second one from scratch), each
  computing real AR via the existing `attackRatingForSlot`/`loadWeapons` path.
- Show the real numeric AR breakdown per damage type for both sides, and a clear "which one wins"
  indicator given the current character stats — this should update live as stats change, the same
  way the existing single-weapon AR display already does.
- Handle two-handing correctly for both sides independently (the existing `twoHanding` toggle
  should apply per-comparison-slot, not globally break one side).
- If a boss/enemy target is selected (reusing the existing `useCombatTargets`/target picker), show
  effective damage against that target for both weapons, not just raw AR — this is more useful
  than AR alone and the data/functions for it already exist (`effectiveDamage`).

## Explicit exclusions

- Don't touch OCR, save parser, Gideon's router, or the map engine.
- Don't build a new AR calculation — reuse `src/lib/ar.ts` exactly as-is.
- Don't change the existing single-weapon Build lab flow — this is an additive comparison mode.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: comparing two known weapon configurations produces the correct real AR numbers for
  both (verifiable against the existing single-weapon path's own already-tested output).
- `npm run dev`: demonstrate comparing two weapons and seeing correct, different AR numbers for
  each.
