# Task 160 — Fix the Task 157 link/inference/duplicate findings

Follow AGENTS.md. Branch `task-160`. Read `docs/tasks/157-report.md` (summary table + FIX LIST, with files
and examples). Its audit scripts are in `.scratch/157/` — reuse them to measure before/after.
Another agent (159) edits `src/Atlas.tsx`, the map engine embed, `vite.config.ts` and the offline
manifest — do not touch those.

Fix every item in the FIX LIST, in its order, committing after each. Also the summary rows marked high:
dead "Related" chips (513/509), wrong-kind edges (112), dead hosted-warp search results (359), dead infer
chains (31, incl. 17 bell-bearing), "Mark done" offered where tracking is refused (1,317), same-name
duplicates within one kind (51). Then the medium rows where the fix is clear (drop/stock names resolving
to no item, regions with no contains edges, orphans a player should reach, the implication cycle, dead
facts). For duplicates: merge only when it is really the same thing; different things that share a name
stay separate but must be distinguishable (qualifier in the name).

Never fix by deleting links/records to make numbers go down — fix the resolution. Don't touch builds.

Add `src/lib/linkIntegrity.test.ts` that recomputes the key counts (dead related edges, wrong-kind edges,
dead search results, unfireable infer chains, Mark-done-without-tracking, within-kind duplicates) and
asserts they are 0 or ≤ an explicit, named exception list.
While working: touched tests + `npx tsc -b`. At the end ONCE: `npm run index:entities`, full
`npx vitest run`, `npm run lint`, `npm run build`, `npm run audit:links`, `npm run audit:inference`,
`npm run audit:pages`, `npm run audit:progress`. Commit. Report `docs/tasks/160-report.md` (print it):
before/after for every summary row, examples, remaining exceptions with reasons, ASSUMPTIONS.
