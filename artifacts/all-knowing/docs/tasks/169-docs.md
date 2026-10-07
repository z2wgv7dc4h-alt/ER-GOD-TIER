# Task 169 — Docs must be accurate (flawless) and lean

Follow AGENTS.md (completion contract applies). Branch `task-169`. Edit ONLY Markdown docs
(`README.md`, `HANDOFF.md`, `DATA.md`, `docs/*.md` except generated ones and `docs/tasks/`,
`docs/history/`). Do not change code. Other tasks are changing code in parallel — describe master as it is.
Do NOT edit `CLAUDE.md`, `AGENTS.md`, `docs/ORCHESTRATION.md`, `docs/STATUS.md` (owned by Claude) —
but report any inaccuracy you find in them.

1. **Inventory**: list every doc with purpose, last-updated, and whether it is generated (by which npm
   script — e.g. PAGE-AUDIT, LINKS-AUDIT, ENTITY-COVERAGE, PROGRESS-AUDIT, INFERENCE-RULES, DATA-CATALOG,
   GIDEON-EVAL, PLAYER-QUESTIONS). Generated docs: regenerate with their script instead of editing.
2. **Verify every factual claim** in hand-written docs against the code/data on master: file paths,
   function/component names, npm scripts, routes/sections/tabs, counts, data sources, map frames, feature
   descriptions. Fix wrong ones; delete claims about things that no longer exist (old rooms, removed
   tasks, ERR/Reforged data, `HANDOFF-CLAUDE.md` now in `docs/history/`). Use grep/ls to prove each fix.
3. **De-duplicate**: one home per topic. README = what it is + run/build + doc index; HANDOFF = architecture
   + do-not-break rules; DATA.md = data sources/pipeline; ARCHITECTURE = module map. Replace duplicated
   passages with links. Merge or archive stale one-off docs (REVIEW, SCOPE, M11-FORENSICS,
   lockout-review, questline-review, ACCURACY-REPORT…) into `docs/history/` if they are only history.
4. **Doc index** in README: every remaining doc, one line each, and which are generated.
5. **Check**: no broken relative links in any .md (write a tiny script; report the count before/after),
   `npx tsc -b` unaffected. Commit per step.
Report `docs/tasks/169-report.md`: claims fixed (count + 10 examples), files archived/merged, links fixed,
inaccuracies found in Claude-owned docs, checklist, ALL ITEMS DONE.
