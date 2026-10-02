# Task 146 — Merge Task 145, restore lost in-game names, missing items, merchant lines

Work dir: this worktree (`artifacts/all-knowing`), branch `task-146`. Read first: `docs/DATA-CATALOG.md`,
`DATA.md`, `docs/ARCHITECTURE.md`.
NEVER read, list or open `.env` or `.env.local`. No dev servers. No `npm install`. Do not push.
Do not touch builds (`build:*` records / build data), Gideon, or the boss roster logic.

## 0. Merge Task 145
`git merge --no-ff task-145` (branch exists locally). Resolve conflicts keeping both sides; if a
conflict is not trivially resolvable, STOP and report.

## 1. Restore in-game names that no longer resolve
`docs/tasks/146-unresolved-names.json` has `{enemy|npc|region: {unresolved: [names]}}` — 145 game
spellings (from the game's FMG name tables, `public/sourced/open/text/NpcName.json`,
`PlaceName.json`) that were deleted in commit 07e7eb0 (Task 132) and now match no record or alias.
The PS5 photo reader sees these exact strings, so each must resolve.
- For each name, find the existing record it belongs to (e.g. "Blaidd the Half-Wolf" → the Blaidd
  npc; "Night's Cavalry (Glaive)" → the Night's Cavalry boss/group; "Grave Warden Duelist (Boss)" →
  that boss; "Isolated Merchant" → the merchant records). Use `git show de80111:artifacts/all-knowing/public/sourced/entity-index.json`
  to see where the old row pointed (location, region) when it helps.
- Add it as an alias of that record via the existing alias pipeline (`scripts/gen-aliases.mjs` →
  `src/data/aliases.json`, then `public/sourced/aliases.json`). Put the mapping in a new data file
  `src/data/game-name-aliases.json` (`{ "<game name>": "<entity id>" }`) read by gen-aliases.
- Places with no record at all (Minor Erdtrees, Drake Graveyard, Freezing River, Hidden Grave,
  Carian Study Hall, Colosseums, Stargazers' Ruins, etc.): create `region` records in
  `entityIndexBuild.ts` from `PlaceName.json` + map pins in `vendor/elden-ring-map/data/` (place
  names) with name, parent region, and map coords when a pin exists. No invented text.
- If a name truly has no target, list it in the report with the reason. Never map a name to a
  different person/place just to make it resolve.
- New test `src/lib/gameNames.test.ts`: every name in `146-unresolved-names.json` resolves (via the
  app's alias/resolver lookup used by other alias tests) to an existing record id.

## 2. Missing items
Add records (from the game tables `public/sourced/open/text/*Name.json` + `*Caption.json`,
`regulation-vanilla-v1.17.json`, wiki-db) for: Twinned Armor (ProtectorName 600100, base not
altered), Gold Sewing Needle (GoodsName 8162), Pest-Thread Spears (GoodsName 2007210, incantation),
Perfumer Tricia spirit ash (GoodsName 217000, kind spirit — separate from boss:perfumer-tricia).
Same record shape as siblings of that kind. Add an assertion for each to `gameNames.test.ts`.

## 3. Merchant lines / quest pictures
Commit 07e7eb0 removed some merchant descriptions. Restore real ones (e.g. Enia, Miriel quotes from
`git show de80111:…/entity-index.json`), but NOT template junk like "The is a merchant NPC in Elden
Ring." or "X is a merchant NPC in Elden Ring.". Restore quest (`line:*`) images that existed at
de80111 (the NPC's picture). Do it in `entityIndexBuild.ts` from the source data, not by hand-editing
the generated index.

## 4. Testing
While working: only `npx vitest run src/lib/gameNames.test.ts src/lib/enemyDrops.test.ts` and
`npx tsc -b`. At the end, ONCE: `npm run index:entities`, `npm run audit:pages`, `npm run audit:links`,
full `npx vitest run`, `npm run lint`, `npm run build`. Do not loosen or delete any test. If an
existing test fails because a count legitimately rose, update only that number and say so.

## 5. Commit + report
Commit on `task-146`. Write `docs/tasks/146-report.md` (also print it): merge result; names
resolved N/145 and the unresolved ones with reasons; regions created; items added; descriptions
and images restored; final test/lint/build/audit numbers; ASSUMPTIONS (every decision not stated
here); anything not done.
