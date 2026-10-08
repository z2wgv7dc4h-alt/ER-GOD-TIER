# Task 176 — Wrong-text descriptions (audit 171, Batch A items 3–4) — SMALL TASK

Follow AGENTS.md (completion contract). Branch `task-176` (starts from master after 172 merged). You own
the description-source code in `src/lib/entityIndexBuild.ts` (grep; never read the whole file) and
`src/lib/auditFixes.test.ts`.
1. Remove Nightreign text (names from `public/sourced/open/wiki-db/nightreign.json`) from all
   descriptions; add a test.
2. Stop cross-page contamination: the examples in `docs/tasks/171-report.md` Batch A item 4 — a record's
   description must come from a source matched to THAT record (same id/exact name), not a fuzzy/other page.
   Add a test with those examples.
Run only touched tests + `npx tsc -b` + `npm run index:entities`. Commit. Report, checklist, ALL ITEMS DONE.
