# Task 60 — Scadutree + Revered Ash meters

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` §7, `src/knowledge/collectibles.ts`,
`src/lib/achievements.ts`, `src/Codex.tsx`, `src/lib/ar.ts` (read only).

**This brief supersedes `46-sote-completion-meters.md`.** Do not run 46 and 60. If 46 already
landed, audit it and only fill gaps (especially the "do not invent the blessing table" rule and
the AR honesty note).

Independent of Tasks 52–59.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Treat Scadutree fragments and Revered Spirit Ashes like Task 29 cookbooks: N/total + derived
level. The number the player cares about is Blessing level, because that is DLC difficulty.

## Requirements

- Verify real totals against in-repo data first (`collectibles.ts` + guide catalog + any open
  dump). Cite the count in a code comment. Do not guess 50 if the in-repo list is incomplete —
  if incomplete, show N/known and label "list incomplete", do not fake the missing pins.
- Blessing level table must be cited (comment + source name). If you cannot find a reliable
  table in-repo or in a permitted open source already listed in `DATA.md` / `awesome.ts`,
  implement count-only and report the missing table instead of inventing thresholds.
- Codex section: "Blessing Lv X  (Y/Z fragments)" and the ash equivalent.
- Progress keys off `character.collectedItems` using the existing `prefixKind` item bucket.
- Build lab AR: **do not change formulas**. If `effectiveDamage` ignores blessing, add a
  one-line note in the Build lab UI when campaign is `sote`: "AR is base-game; Scadutree
  Blessing not applied." Honest is the house style.

## Explicit exclusions

- No AR formula edits.
- No Gideon rewrite.
- No map engine.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- Tests for level-from-count if you implemented a table; otherwise a test that incomplete lists
  do not claim 100%.
