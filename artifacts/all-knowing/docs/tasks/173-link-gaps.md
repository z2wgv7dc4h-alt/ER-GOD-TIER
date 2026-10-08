# Task 173 — Remaining link-graph gaps (audit 171, Batch C)

Follow AGENTS.md (completion contract). Branch `task-173`. Read `docs/tasks/171-report.md` §FIX LIST
Batch C (items 9–12). You own `src/lib/entityGraph.ts`, `src/knowledge/catalog.ts`,
`scripts/build-boss-roster.mjs`, `src/data/bosses.json` and their tests. Task 172 owns
`src/lib/entityIndexBuild.ts`; 174 docs/Help; 175 photo code — don't touch them.

1. Items 9–12 as written. For orphans/contains edges (item 9): add only edges that are TRUE from data on
   disk (record region/location/drops/acquisition); never add an edge just to remove an orphan. Report
   what remains orphaned and why.
2. Item 10: one loot list — normalise drop strings to real item ids; roster and index agree.
3. Item 11: remove the Haligtree cycle without losing the medallion inference (directional chain).
4. Item 12: reclassify the 27 non-merchant `merchant:` records to their real kind (with aliases from the
   old ids so nothing breaks).
5. Extend `src/lib/linkIntegrity.test.ts` to pin each fix. Gates once at the end. Report before/after.
