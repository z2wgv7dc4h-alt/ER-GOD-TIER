# Task 27 — Fix the vanilla/Tarnished-Pack regulation mismatch Task 24 found

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `ARCHITECTURE.md`, and
`src/lib/regulation.ts` (Task 24, just landed) first — it added `REGULATION_STAMP =
'1.17-tarnished-pack'` and a `regulationAudit()` that **found and correctly flagged a real
inconsistency, not a fixed one**:

- Build lab AR data (`public/sourced/regulation-vanilla-v1.17.json`) — Tarnished Pack line.
  Consistent.
- Atlas marker extract (`vendor/elden-ring-map/data/*`, generated from this machine's real game
  install) — **vanilla only**. No `boss:leontiel` (a Tarnished Pack boss). Off-stamp.
- FMG name dump (`public/sourced/open/names.json`) — **vanilla only**. Zero Shadow of the Erdtree
  or Tarnished Pack names at all. Off-stamp.
- Paramdex weapon names — same, vanilla only, off-stamp.

So three of four data sources don't actually match the stamp this app claims. `regulation.ts`'s
job was to detect and record this, not fix it — Task 24 explicitly left the underlying mismatch
alone as out of scope. This task is that fix.

A real Elden Ring install exists on this machine
(`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\`) — check first whether it
already has the Tarnished Pack / Shadow of the Erdtree content installed (it should, since the
Build lab's own vendored regulation data and other tasks' work assumed DLC content was available)
or whether the *extraction tooling* just wasn't pointed at the DLC data. `vendor/elden-ring-map`'s
own extraction tools (`build_markers.py`, etc. — already proven working in Tasks 09/17) and the
FMG/paramdex extraction path Task 17/23 used are the ones to re-run, not new tooling.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Get the Atlas marker extract and the FMG/paramdex name dumps to actually include Shadow of the
Erdtree and Tarnished Pack content, so `regulationAudit().consistent` becomes `true` for real,
not by changing the audit's logic but by fixing the underlying data.

## Requirements

- First, diagnose *why* the existing extracts are vanilla-only: is the DLC not installed on this
  machine, is a mod (the "Tarnished Pack" — check what this actually is, it may be a fan mod
  adding custom weapons like Idus Sword/Leontiel's Greatsword on top of SotE, not just SotE
  itself) not present, or did the extraction tools simply not pick it up for a fixable reason
  (wrong regulation.bin path, wrong game version, etc.)? Report this clearly before doing anything
  else — if the DLC/mod genuinely isn't installed, that changes what's possible here and you
  should say so rather than forcing a fix that can't be real.
- If fixable, re-run the extraction (markers, FMG names, paramdex) against the actual installed
  content and replace the stale vanilla-only dumps.
- If the Tarnished Pack mod specifically isn't installed/available (it may be a community mod, not
  official DLC — check `docs/SOURCE-PACK.md` / `THIRD_PARTY_NOTICES.md` for what this project
  understands "Tarnished Pack" to mean), it's fine to scope this task down to "fix the base
  Shadow of the Erdtree DLC gap" and report the Tarnished Pack mod content as a separate, still-
  open gap requiring the mod to be installed first — don't fabricate data for content that isn't
  actually on this machine.
- Update `regulationAudit()`'s test fixtures/expectations to match the corrected state (should now
  assert consistency, or a narrower, accurately-described remaining gap).

## Explicit exclusions

- Don't touch the Build lab AR data itself (`regulation-vanilla-v1.17.json`) — that's the
  reference stamp, not what needs fixing.
- Don't touch OCR, the save parser, Gideon, or the mobile layout.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- `regulationAudit()`'s tests reflect the real, current state of the data — honestly, whether
  that's "now fully consistent" or "vanilla+SotE consistent, Tarnished Pack mod still separately
  missing because it's not installed here."
- Report exactly what changed: before/after marker counts, before/after name-dump counts, and
  which specific gap (if any) remains and why.
