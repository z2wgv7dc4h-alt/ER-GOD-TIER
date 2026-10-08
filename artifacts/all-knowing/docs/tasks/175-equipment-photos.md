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
