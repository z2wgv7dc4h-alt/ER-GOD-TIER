# Task 166 — UX fixes from the Task 161 proposal: items 11, 13, 14, 15, 16, 17, 18, 19, 20 (inference + entity kinds)

Follow AGENTS.md. Branch `task-166`. Read `docs/tasks/161-proposal.md` (sections 2–7) and do build
tasks **11, 13, 14, 15, 16, 17, 18, 19, 20 (inference + entity kinds)** from its table in section 7, exactly as described there (files, what changes). Also implement the 'New cheap-PS5 inferences' 1–7 from section 6 that are confident (certain rules apply directly; 'likely' ones only as suggestions the user confirms), each through applyFacts with a visible reason. Other agents work on PvP/Builds and bosses/guides/Now UI — do not touch those files.
Builds rule: never change, remove or relabel the owner's builds or their data — only how they are
presented and linked.
For each task: make the change, add/adjust tests that prove it, commit (`Task 166 #N: ...`).
While working: touched tests + `npx tsc -b`. At the end ONCE: full `npx vitest run`, `npm run lint`,
`npm run build`, `npm run test:bundle`, `npm run audit:pages`. Report `docs/tasks/166-report.md`
(print it): per task what changed and how a phone user sees it, ASSUMPTIONS, anything skipped and why.

## FIX (added by Claude after the gates)
Gates on the merge with master fail: `src/lib/inferenceAudit.test.ts > inference audit likely keys >
every likely key is a real catalog edge`. Your inference changes removed/renamed edges that
`src/lib/inferenceAudit.ts` still lists as "likely". Update that list to the current catalog edges (or
remove entries whose edge you deliberately deleted, saying which in the report) — do not loosen the test.
Merge master first (`git merge --no-edit master`; for conflicts in public/sourced/entity-index.json take
master's copy and run `npm run index:entities`). Run that test + full `npx vitest run`, commit, update the
report checklist, ALL ITEMS DONE.
