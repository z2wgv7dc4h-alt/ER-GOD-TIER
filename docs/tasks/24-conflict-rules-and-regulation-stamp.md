# Task 24 — Audit conflict rules + add the regulation stamp

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first, plus
`SCOPE.md` items #5 and #6 in full. Two smaller, related architecture gaps bundled into one task
since both are audits/small additions rather than big builds:

**#5 Conflict rules — ⬜ not audited.** `src/lib/infer.ts`'s `Evidence` shape already carries a
confidence score (0.94 direct / 0.72 inferred, per Task 06) which is adjacent to this, but the
specific winner-table below has never been verified against the actual code path for two sources
conflicting on the same fact:

| Winner | When |
|---|---|
| save flag | PC parser trusted |
| later screenshot + matching name | PS5, no save |
| explicit answer | user overrides inference |
| inference | never beats a direct source |

"Record the loser on `evidence[]`. Do not silently drop it."

**#6 Regulation stamp — ⬜ not done.** Task 10 documented which regulation line the Build lab's AR
data comes from (`regulation-vanilla-v1.17.json`) but never added a `regulation` field to
`Character`/catalog. "Character and catalog both carry `regulation: '1.17-tarnished-pack'`. Clark
AR, marker extract, and FMG dump must be the same stamp or the lab lies."

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

1. Trace and verify (or fix) the actual conflict-resolution behavior when two `Evidence` entries
   disagree on the same fact, against the winner-table above. Write real tests proving the table
   holds for each of its four rows. If the current code doesn't actually implement one of the
   rows, implement it — don't just document the gap.
2. Add a `regulation` field to `Character` and to the catalog, stamp it with the actual regulation
   version this repo's data was extracted against, and verify the Build lab AR data, the marker
   extract (`vendor/elden-ring-map`), and the FMG dump are all consistent with that stamp — flag
   (don't silently ignore) if any of them turn out to be on a different regulation version than
   the others.

## Requirements

- `evidence[]` must retain the losing entry when a conflict is resolved, not discard it — verify
  this is actually true today; it may already be correct (Task 06's confidence-score work may have
  already handled this) or may need a real fix.
- The four-row winner table needs real test coverage: construct two conflicting `Evidence` entries
  for each row's scenario (save-vs-inference, screenshot-vs-nothing, explicit-answer-vs-inference,
  inference-never-beats-direct) and assert the correct one wins and the other is preserved in
  `evidence[]`.
- `regulation` field: check what regulation version each existing data source actually claims
  (`regulation-vanilla-v1.17.json`'s own header/commit, `vendor/elden-ring-map`'s extraction
  version, any FMG dump's source version) before picking the stamp value — don't just copy
  `SCOPE.md`'s example string (`'1.17-tarnished-pack'`) without confirming it's actually correct
  for what's in this repo right now.

## Explicit exclusions

- Don't touch OCR, the save parser's byte-level format handling, the map engine, or Gideon/LLM
  code beyond reading `regulation` if it's naturally relevant.
- Don't re-extract or re-vendor any data source just to check its regulation version — read
  existing docs/commit references first (Task 10's report should already name the exact upstream
  commit it used).

## Acceptance criteria

- `npx tsc -b` and `npm run lint` pass.
- New tests for the conflict-resolution table (all four rows) and for the regulation stamp being
  present and consistent.
- Report explicitly: does the current codebase's data all share one regulation version, or is
  there a real mismatch? If there's a mismatch, report it clearly rather than papering over it
  with a stamp that isn't actually true.
