# Task 151 — Replace generated filler descriptions with real text

Branch `task-150` (same worktree, after Task 150's commits). NEVER read/list/open `.env`/`.env.local`.
No dev servers, no `npm install`, no push. Generators only; never invent text. Do not touch builds.

Problem (found by Claude, missed by audits 147/149): the index builder writes its own sentences.
- `src/lib/entityIndexBuild.ts` ~line 2502: `${base} is a hostile creature encountered in ${where}.`
  (+ HP etc.) — 587 of 607 enemy pages have this instead of a real description.
- ~73 records: "X is a location in <Region>." ; ~63 records: "... for new item access". Find the
  code producing each (grep the builder and scripts).

Fix:
1. Remove every generated sentence. Facts it carried (locations, HP) already show as fields/stats;
   keep them there, not in prose.
2. Fill the description from real text, in order: wiki-db `enemy.json` / wiki sections lead
   paragraph, FanAPI creatures, Fextralife, er-mcp.db `pages` lead paragraph (strip markup), game
   captions. Must not match the template test (`in Elden Ring.`, `a melee armament`). Else leave empty.
3. Test in `src/lib/auditFixes.test.ts`: no description matches
   `/is a hostile creature encountered|is a location in [A-Z]|for new item access/`, and no single
   normalised description (name replaced by X) is shared by more than 25 records except game-caption
   families that are the game's own text (e.g. Ash of War / spirit-ash captions) — list the allowed
   families explicitly in the test.
4. Run only touched tests + `npx tsc -b` while working; at the end ONCE: `npm run index:entities`,
   full `npx vitest run`, `npm run lint`, `npm run build`, `npm run test:bundle`, `npm run audit:pages`.
5. Commit `Task 151: ...`. Write `docs/tasks/151-report.md` (print it): before/after counts per
   pattern, enemies with real description before/after, 5 examples, ASSUMPTIONS.
