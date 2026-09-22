# Task 44 — Soft caps on the Build lab stat card

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` §7 ("Product ideas still valid")
first — "Soft caps already marked on the stat card" is listed there as a valid, not-yet-built
idea. Read `src/Build.tsx` (the stat grid / `patchStat`) and `src/QoL.tsx`'s `softCapMark` — a
`softCapMark` helper already exists and is used on `CharacterCard` in `App.tsx` (search for
`softCapMark(` there), but check whether it's real/complete or a stub before extending it.
Scratch work → `./.scratch/` (gitignored). Personal project — no license-gating.

## Objective

Show real, accurate soft-cap indicators next to each stat in the Build lab's stat editor, using
real Elden Ring soft-cap breakpoints (per-stat, since they differ — e.g. Vigor's breakpoints are
not the same as Strength's), not invented numbers.

## Requirements

- Research and encode real soft-cap breakpoints per stat (Vigor, Mind, Endurance, Strength,
  Dexterity, Intelligence, Faith, Arcane) — these are well-documented, verifiable community
  knowledge (diminishing-returns thresholds for HP/FP/stamina gain per point, or damage-scaling
  breakpoints for the damage stats). Cite your source in a code comment the way other tasks in
  this repo have (e.g. Task 10's Clark AR attribution).
- If `softCapMark` in `QoL.tsx` already has real breakpoint data, verify it's accurate and extend
  it to the Build lab's stat editor rather than duplicating it. If it's a stub or has wrong
  numbers, fix it in place.
- Show the indicator inline next to each stat input in `Build.tsx` (e.g. a small marker/color
  change when a stat is past its first or second soft cap) — don't just add a tooltip nobody sees.
- Be honest about multi-tier soft caps (most stats have a "good" first breakpoint and a "diminishing
  further" second one, e.g. Vigor's well-known ~60 then further returns) — represent both tiers if
  the real data supports it, don't collapse to a single boolean "capped/not capped" if that loses
  real information.

## Explicit exclusions

- Don't touch OCR, save parser, Gideon, or the map engine.
- Don't invent numbers you can't verify — if a specific stat's breakpoints are genuinely disputed
  or unclear in your research, say so in the report rather than picking one arbitrarily.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: known breakpoint values produce the expected soft-cap tier for at least 3 different
  stats.
- `npm run dev`: demonstrate the stat card showing real soft-cap indicators as stat values change
  across a breakpoint.
