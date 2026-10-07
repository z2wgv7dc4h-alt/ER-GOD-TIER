# Task 171 — Post-batch full audit (READ-ONLY) — template for every batch

Follow AGENTS.md (completion contract applies). READ-ONLY: write only `.scratch/171/` scripts and
`docs/tasks/171-report.md` (commit only the report). FIRST: `git merge --ff-only master` (or
`git merge --no-edit master`) so you audit the latest master, and record the master commit audited.
Reuse earlier audit scripts if present (`docs/tasks/149-report.md`, `157-report.md` describe them).

1. **Gates + test health**: run once: `npx tsc -b`, `npx vitest run` (list every skipped test and WHY it
   is skipped — two tests changed from passing to skipped recently; find which and why), `npm run lint`,
   `npm run build`, `npx vitest run src/lib/bundleBudget.test.ts`, `npm run audit:pages`,
   `npm run audit:links`, `npm run audit:inference`, `npm run audit:progress`, `npm run coverage:entities`,
   `npm run eval:gideon`, `npm run eval:photos` (if present). Record every number.
2. **Data**: per kind — count, description/region/coords/picture/drops coverage vs `docs/tasks/149-report.md`
   (better/worse); template/filler text; raw ids or map codes shown as names; duplicates within and across
   kinds; game name tables (`public/sourced/open/text/*Name.json`) resolution rate; 20 random records per
   kind read as a player (flag anything wrong).
3. **Links & inference**: rerun the Task 157 checks (dead/wrong-kind links, orphans, dead search results,
   unfireable chains, cycles, Mark-done where tracking is refused) — compare with 157's numbers.
4. **UI (static)**: every route/screen in `src/App.tsx`/`src/shell/sections.ts` renders a component that
   exists; no screen reads a missing file/field; no dead buttons; help text names only real tabs.
5. **Docs**: every hand-written doc's file paths, scripts and claims still true (`README.md`, `HANDOFF.md`,
   `DATA.md`, `docs/*.md`, `CLAUDE.md`, `AGENTS.md`, `docs/ORCHESTRATION.md`, `docs/STATUS.md`);
   broken relative links count.
6. **Report**: verdict paragraph; table check → number → vs previous → severity; details with examples;
   **FIX LIST** ranked by player impact, grouped into small file-disjoint batches (3–6 items each, with
   files) ready to become the next task briefs. Checklist + ALL ITEMS DONE.
