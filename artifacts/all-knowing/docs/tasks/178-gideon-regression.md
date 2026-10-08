# Task 178 — Offline Gideon regression: 84.4% → 79.3% after the data cleanup

Follow AGENTS.md (completion contract). EXCEPTION: may edit Gideon's offline answering code
(`src/lib/gideon*.ts`, `src/lib/gideonGrounded.ts`, search/intent helpers). Do NOT re-add removed
template/filler text or Nightreign text to the data; do NOT change `src/data/gideon-eval/questions.json`.

`npm run eval:gideon` (`docs/GIDEON-EVAL.md`) scored 432/512 (84.4%) when Task 168 merged; after Tasks
172–177 (description/location cleanup) it scores 406/512 (79.3%).
1. Find exactly which questions went from correct to not-correct (compare per-question results at the
   Task 168 merge commit vs master — check out the old commit in a temp folder or `git stash`-free copy
   and run the eval there; list them with old vs new answers).
2. Group the causes (e.g. answer relied on a description sentence that was removed; location field
   format changed; entity id renamed/merged). Fix Gideon's side to use the right fields (location/region
   fields, acquisition/sources, drops) — not by restoring bad data.
3. Re-run until ≥ 84.4% with no question newly broken. Run only Gideon tests + eval + `npx tsc -b` while
   working; full gates once at the end. Report: list of regressed questions, causes, fixes, before/after,
   checklist, ALL ITEMS DONE.
