# Task 165 — UX fixes from the Task 161 proposal: items 1, 2, 3, 10, 12, 21, 22 (bosses, guides, Now, cleanup)

Follow AGENTS.md. Branch `task-165`. Read `docs/tasks/161-proposal.md` (sections 2–7) and do build
tasks **1, 2, 3, 10, 12, 21, 22 (bosses, guides, Now, cleanup)** from its table in section 7, exactly as described there (files, what changes). Another agent works on PvP/Builds (Build.tsx, KitLibraryPanels.tsx, BuildPlanner.tsx) and another on inference/entityGraph — do not touch those.
Builds rule: never change, remove or relabel the owner's builds or their data — only how they are
presented and linked.
For each task: make the change, add/adjust tests that prove it, commit (`Task 165 #N: ...`).
While working: touched tests + `npx tsc -b`. At the end ONCE: full `npx vitest run`, `npm run lint`,
`npm run build`, `npm run test:bundle`, `npm run audit:pages`. Report `docs/tasks/165-report.md`
(print it): per task what changed and how a phone user sees it, ASSUMPTIONS, anything skipped and why.
