# Task 34 — Warp-list paste UX + SotE/Tarnished-Pack interview coverage

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md`,
`src/FirstSit.tsx`, and `src/Reckon.tsx` first. Two related, still-open PS5-onboarding gaps from
`HANDOFF-CLAUDE.md` §6 P1:
- #7 "Warp-list paste UX — not directly touched by name" — a PS5 player photographing their full
  warp/grace list and pasting the read text in should get a fast, forgiving bulk-match experience;
  not verified as good UX even though the underlying OCR (Task 21) and alias matching (Task 23)
  now both work.
- #8 "Interview coverage for SotE / Tarnished Pack starts — not addressed" — `FirstSit.tsx`'s
  onboarding questions (`applyAnswers` in `src/lib/infer.ts`) seed starting regions from DLC
  choice, but check whether the interview actually asks about SotE/Tarnished-Pack-specific starts
  (a player who begins post-Radahn with the DLC already unlocked) as opposed to just base-game
  progress markers.
Scratch work → `./.scratch/` (gitignored). Personal project — no license-gating.

## Objective
Make the first-sit interview and warp-list paste flow actually handle DLC-aware starts and bulk
name-list input well.

## Requirements
- Audit `FirstSit.tsx`'s actual questions against `applyAnswers` in `infer.ts` — confirm SotE/
  Tarnished Pack starting states are askable and correctly seed `region:shadow` and related facts.
  Add what's missing.
- Warp-list paste: verify the OCR/paste-names path (Task 21) handles a full multi-line list
  pasted or photographed at once — bulk matching, clear per-line match/no-match feedback, not just
  a single best guess. Fix if it's currently thin.

## Explicit exclusions
Don't touch the map engine, Gideon's LLM path, or the save parser. Don't rebuild Task 21's OCR
pipeline — extend/fix the bulk-list UX around it.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Real tests for DLC-start seeding and bulk warp-list
matching. `npm run dev`: demonstrate pasting a 10+ line warp list and seeing real per-line results.
