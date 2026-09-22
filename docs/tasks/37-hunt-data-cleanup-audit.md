# Task 37 — Merge duplicate hunt data + audit event-flag source coverage

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md` first, plus
`src/knowledge/` for `fieldHunts` and `public/sourced/checklists/hunts.json`. Two small real
cleanup/audit items from `HANDOFF-CLAUDE.md` §6 P2:
- #23 "Merge `fieldHunts` and `hunts.json` — not addressed." There appear to be two overlapping
  field-hunt data sources; confirm whether they're genuinely duplicative or serve different
  purposes before merging anything.
- #25 "vawser event-flag dump — not ingested (Task 11 generated its *own* smaller event-flag table
  from an original save-format implementation, a different source, for a narrower need)." Audit
  whether the vawser dump would add real coverage Task 11's table is missing, or whether (like
  Task 14's FMG finding) it turns out redundant — report honestly either way, don't force an
  ingestion that adds nothing.
Scratch work → `./.scratch/` (gitignored). Personal project — no license-gating.

## Objective
Resolve the `fieldHunts`/`hunts.json` duplication cleanly, and produce a real, evidence-based
verdict on whether the vawser event-flag dump is worth ingesting.

## Requirements
- Trace every consumer of both `fieldHunts` and `hunts.json` before touching either — don't break
  a working code path. If they're genuinely the same data in two shapes, pick one canonical source
  and have the other derive from it (or delete the redundant one) — don't just leave both existing
  independently.
- For the vawser audit: compare actual flag coverage against Task 11's existing table with real
  numbers (X flags in vawser's dump, Y already covered, Z genuinely new), the same rigor Task 14
  used for the FMG-name comparison. If genuinely new and useful, ingest it; if redundant, close it
  with the same honest "nothing to add" verdict Task 14 used, and say why.

## Explicit exclusions
Don't touch OCR, save parser (beyond the flag-table question above), Gideon, or map engine.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Report the real relationship found between
`fieldHunts`/`hunts.json` and what you did about it, plus the vawser coverage comparison with
real numbers and your verdict.
