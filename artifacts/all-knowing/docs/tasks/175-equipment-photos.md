# Task 175 — Equipment screen photos: 50% → as high as possible

Follow AGENTS.md (completion contract). Branch `task-175`. You own `src/lib/ps5Capture*.ts`, the OCR
worker, `src/lib/ps5*` vision helpers, `scripts/photo-eval.mjs`, fixtures in `src/lib/__fixtures__/ps5/`
and their tests. Don't touch entityIndexBuild/entityGraph/catalog/docs (other tasks).

`npm run eval:photos` (Task 167, `docs/PHOTO-EVAL.md`): equipment photos read 7/14 fields (50%: 7
missed), equipment-picker 1/3; inventory 76%; status 100%.
1. Find why equipment fields are missed (slot layout detection, small text, icons without names —
   only the highlighted item's name is printed; others must be matched by icon against
   `public/sourced/images/game-icons/` from Task 154, or by slot-position + equipped-icon matching).
2. Fix with general rules (no per-photo hacks, no hard-coded expected values). Phone photos of a TV:
   angle, glare, moire.
3. Re-score fixture set AND the web self-consistency set (`--web`); report before/after per screen;
   nothing else may get worse. Gates once at the end.

## Note from Claude (the web re-score was killed twice)
The `--web` re-score of ~150 photos takes over 20 minutes with no output, so the supervisor treats the
run as stalled. Run it so it writes progress into the worktree, e.g.
`npm run eval:photos -- --web 2>&1 | tee .scratch/175/web-progress.txt` (one line per photo). The
fixture results are already committed (equipment 50% → 100%, overall 84% → 91%); finish the report with
the web numbers, checklist, ALL ITEMS DONE.

## Owner decision (overrides item 3's web part)
SKIP the `--web` re-score entirely (owner decision: too slow, fixture results suffice). Finish now: report
with the fixture before/after (equipment 50% → 100%, overall 84% → 91%, nothing worse), mark the web part
`[ ] not done — skipped by owner decision`, checklist, ALL ITEMS DONE.
