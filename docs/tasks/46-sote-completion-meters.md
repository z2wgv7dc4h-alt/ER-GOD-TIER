# Task 46 — Scadutree fragments + Revered ashes as first-class SotE completion meters

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` §7 first — "Scadutree fragments +
Revered ashes as first-class SotE meters" is listed as a valid, not-yet-built idea. Read
`src/knowledge/collectibles.ts` (`scadutreeFragments`, `flaskUpgrades`, `mapFragments` already
exist per Task 22/41's Codex wiring — check `git log` / `Codex.tsx` for "Scadutree / map
fragments" section) and Task 16's golden-seed/sacred-tear completion-set pattern
(`src/lib/achievements.ts` from Task 29 — read this closely, it's your template).

Scadutree fragments and Revered Spirit Ashes are Shadow of the Erdtree's power-scaling currency
(each raises the Scadutree Blessing / Revered Ash level, which scales the player's damage/defense
in the DLC area) — distinct from a simple collectible count, since what matters to a player is
"what level am I at" not just "how many have I found." Check whether that leveling logic already
exists anywhere in this repo (search for "blessing" or "scadutree level") before building it.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Give Scadutree fragments and Revered Spirit Ashes the same first-class completion-set treatment
Task 29 gave cookbooks/bell-bearings/whetblades: real N/total tracking, real locations, and —
specifically for these two — the actual resulting blessing/ash level the player is at, since
that's the number that matters for DLC difficulty tuning.

## Requirements

- Real total counts (verify against actual game data — Scadutree fragments and Revered Ashes both
  have a fixed real total in the base DLC).
- Real per-fragment location data (should already partially exist in `collectibles.ts` — verify
  completeness, don't just trust it blindly).
- Compute and display the resulting blessing/ash level from the count the player has collected —
  this requires the real level-per-count-threshold table; research and cite it, don't guess.
- Wire into the Codex (extend the existing "Scadutree / map fragments" section or add an
  achievement-set entry via `achievements.ts`'s pattern — your call which fits better) so the
  player can see both "X/Y fragments found" and "Blessing level N" together.
- Consider whether the Build lab's damage calculations should reflect the player's actual
  Scadutree/Revered Ash level when they're in a DLC area — check if `attackRatingForSlot`/
  `effectiveDamage` already account for this scaling; if not, note it as a real, separate gap in
  your report rather than trying to also fix the AR math in this task (scope discipline).

## Explicit exclusions

- Don't touch OCR, save parser, Gideon, or the map engine.
- Don't modify the AR/damage calculation formulas — flag Scadutree/Ash scaling as a follow-up if
  you find it's missing there, don't attempt to fix it in this pass.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: known fragment/ash counts produce the correct real blessing/ash level.
- Report the real total counts and level-threshold table you used, with sourcing.
