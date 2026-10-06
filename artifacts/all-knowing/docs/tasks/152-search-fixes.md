# Task 152 — Search results fixes (found by Claude clicking through the app)

Branch `task-150` (same worktree, after Tasks 150 and 151). NEVER read/list/open `.env`/`.env.local`.
No dev servers, no `npm install`, no push. Do not touch builds or Gideon.

Typing "Omen" into the quick search (Journey → search icon; the "Do / Things / Wiki" results list —
find the component under `src/shell` / `src/lib` that builds "Things · N") showed:
1. No Enemies group: the enemy page "Omen" (kind enemy) is missing from Things. Enemies must be
   searchable and grouped "Enemies".
2. "Margit, the Fell Omen" listed 4 times: seed (boss · Stormveil), boss (overworld · 31.58,65.05),
   alias (boss · alias), and a grace named "Margit, the Fell Omen". One row per entity: dedupe by
   resolved entity id; alias rows never show as their own row; raw coordinates never shown as a
   location; a grace named after a boss shows as the grace's real name or not at all (check
   BonfireWarpParam / grace names).
3. "Haligtree Promenade" grace matched "Omen" — find why (probably a substring like "Prom-en-ade";
   match on word starts, not mid-word) and fix.
4. Wiki snippets show raw markdown ("Omen** (忌み, *Imi,* …"). Strip markdown/bold/italics and
   the Japanese-gloss parenthetical for display.
Also check the same for searches "Radahn", "Godrick", "Ranni", "Limgrave", "Smithing Stone" and fix
the same classes of problem. Add tests for the search builder covering 1–4 with these queries.
Run only touched tests + `npx tsc -b`; at the end ONCE: full `npx vitest run`, `npm run lint`,
`npm run build`, `npm run test:bundle`. Commit `Task 152: ...`. Write `docs/tasks/152-report.md`
(print it): before/after results list for each query, ASSUMPTIONS.
