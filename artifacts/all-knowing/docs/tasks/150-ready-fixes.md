# Task 150 — Fix the Task 149 "MUST FIX" list

Branch `task-150` (this worktree, on top of Task 148 + the 149 report). Read `docs/tasks/149-report.md`
first — it has the evidence, files and numbers for every item. NEVER read, list or open `.env` /
`.env.local`. No dev servers, no `npm install`, no push. Do not touch builds (`build:*`), Gideon, or
the user's build data. Data changes go in generators, never hand-edited JSON. Never invent text.
Commit after each step (`Task 150 step N: ...`).

1. **Bundle budget.** Stop inlining `src/data/aliases.json` into `infer`/OCR `worker` chunks: load the
   alias plane at runtime from `public/sourced/aliases.json` (fetch, cached, like the other runtime
   data; the worker can fetch it too) or split it so only a small core ships in the first load. Every
   caller of `src/lib/aliases.ts` must keep working (make lookups wait for the load where needed).
   `npm run build && npm run test:bundle` must pass with the EXISTING budgets — do not raise them.
2. **Empty / place-only descriptions** (236 empty, 472 bare place name). Fill from on-disk sources
   (wiki-db, er-mcp.db lead paragraphs, Fextralife, game captions) — no template sentences (the
   `in Elden Ring.` test must still pass). A description that is only the place name is removed
   (location already shows it) unless a real one is found. Radahn, Mohg, Malenia, Astel must have real
   descriptions. Report before/after counts.
3. **Dead legacy ids (1,091).** For every id in
   `git show 07e7eb0:artifacts/all-knowing/public/sourced/entity-index.json` with no record/alias now,
   add an alias to the record it became (upgrade levels "+N" → the base item page; renamed ids → new
   id; merged enemies → merged page). Ids with no honest target: list them in the report. Add a test
   that the dead count is ≤ the listed exceptions.
4. **Boss gaps.** Give `area:1049390800` (Nox Swordstress & Nox Monk) its page link and alias the 5
   kill flags in the report (30100801, 30120801, 31150800, 32050801, 1049390800) to the right
   encounter pages, via `scripts/gen-aliases.mjs` (do not edit the roster script unless required —
   if required, explain why).
5. **Regenerate docs + fix drift.** Rerun the generators for `docs/ENTITY-COVERAGE.md`,
   `docs/PROGRESS-AUDIT.md`, `docs/INFERENCE-RULES.md`, `docs/PAGE-AUDIT.md`,
   `public/sourced/offline-manifest.json`, `docs/DATA-CATALOG.md`; fix the README/HANDOFF/DATA claims
   listed in report section C6.
6. **Gates, ONCE at the end:** `npm run index:entities`, `npx tsc -b`, full `npx vitest run`,
   `npm run lint`, `npm run build`, `npm run test:bundle`, `npm run audit:pages`, `npm run audit:links`,
   `npm run audit:progress`. While working run only the tests for files you touch.
7. Write `docs/tasks/150-report.md` (also print): per step before/after numbers + examples, final gate
   numbers, ASSUMPTIONS, anything not done and why.
