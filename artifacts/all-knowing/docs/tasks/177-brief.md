# Task 177 — Region/location field hygiene (audit 171, Batch B items 6–8) — SMALL TASK

Follow AGENTS.md (completion contract). Branch `task-177` (starts from master after 176 merged). You own
the region/location field code in `src/lib/entityIndexBuild.ts` (grep; never read the whole file) and
its tests.
1. Item 6: no `region`/`location` is a bare type word (Village, Church, Shack, Tower, Rise, Fort,
   Subregion, grace…) — store the real parent region.
2. Item 7: no acquisition prose in `location`; keep the place, drop the paragraph (it belongs to
   acquisition text, which already exists).
3. Item 8: the name/format fixes listed (Rellana id/name, Dectus Medallion naming, the comma typo,
   markdown `#` in locations, the 2 duplicate medallion pairs).
Add a test per item. Run only touched tests + `npx tsc -b` + `npm run index:entities`. Commit. Report,
checklist, ALL ITEMS DONE.
