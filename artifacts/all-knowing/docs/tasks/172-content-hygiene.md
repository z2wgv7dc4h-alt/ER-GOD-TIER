# Task 172 — Template-sentence descriptions (audit 171, Batch A items 1–2) — SMALL TASK

Follow AGENTS.md (completion contract). Branch `task-172`. A previous run started this (see the
"work in progress" commit) — review it, keep what's right. You own `src/lib/entityIndexBuild.ts` (text
cleanup functions only) and `src/lib/auditFixes.test.ts`. Read only the parts of entityIndexBuild.ts you
need (grep for the description-cleaning code; never read the whole file).

1. Widen the guard test in `src/lib/auditFixes.test.ts`: no description matches
   `/\b(is|are|was) (a|an|the|one of the)\b[^.]{0,80}\bin (Elden Ring|Shadow of the Erdtree|the Lands Between)\b/i`
   or `/^This is an? /` or leading fragments `/^[,.;:)]|^s are /`.
2. Make it pass: strip those template sentences (keep the rest of the text; if nothing real remains,
   leave empty) and repair the 11 corrupted ones listed in `docs/tasks/171-report.md` Batch A item 2.
Run only that test + `npx tsc -b` + `npm run index:entities`. Commit. Report with before/after counts,
checklist, ALL ITEMS DONE.
