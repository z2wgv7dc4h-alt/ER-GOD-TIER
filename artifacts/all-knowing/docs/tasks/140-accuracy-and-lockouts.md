# Task 140 — Measured data accuracy + missables/lockout review

Read `docs/DATA-CATALOG.md`. Research against the wiki DB (`data/raw/er-mcp.db`, 4,939 pages) and, where needed,
live Fextralife/Fandom pages (allowed; cite URLs). Commit after each section.

1. **Accuracy sampling** (`scripts/accuracy-audit.mjs`): deterministic random sample (seeded) of 40 bosses, 40 NPCs,
   40 quest steps, 60 items (weapons/armor/talismans/spells/goods mix), 30 graces. For each, compare the app's record
   field by field (name, location/region, drops, requirements, scaling, weight, effect, quest step order/trigger,
   grace region) against the wiki DB page and the game data (regulation/params, coords). Output
   `docs/ACCURACY-REPORT.md`: error rate per kind + per field, every mismatch with both values and the source that
   wins (game data > wiki > guides). Fix every mismatch at the source (builder/data), re-run, report before/after.
2. **Missables & points of no return review**: every lockout warning / gate / missable in `knowledge/gates.ts`,
   `knowledge/missables.ts`, `storylines.ts` lock conditions, `lockWarnings.ts`: verify against the wiki page for that
   quest/item (trigger, what is lost, and whether it's truly permanent vs NG+ recoverable). Output a table in the
   report; fix wrong/missing ones (a wrong lockout warning costs the player a quest — highest priority). Add any
   well-known missables not yet covered (e.g. Ranni's questline gates, Farum Azula, Ashen Capital, Miquella's Cross,
   DLC points of no return).
3. **Quest walk-through**: for each of the 16 authored questlines, check step order, triggers and failure conditions
   against the wiki; fix and add tests for each questline's ordering.

NEVER read .env files. No dev servers, no installs. Don't edit `src/lib/entityGraph.ts` link logic or inference rule
files (another agent owns those) — fix data/builders only. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build`
pass. Report: error rates before/after, lockout table summary (checked / wrong / added), questline fixes.
