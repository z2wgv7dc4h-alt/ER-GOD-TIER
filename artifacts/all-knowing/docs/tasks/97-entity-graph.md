# Task 97 — Entity graph + one entity page everywhere

Read `docs/USAGE-MODEL.md` §2 first. Depends on Task 95 (`src/library/EntityPanel.tsx`) — extend it,
do not build a second panel.

## Graph — `src/lib/entityGraph.ts` (pure, tested)

- `getEntity(factId) → { id, kind, name, icon?, summary }` for every kind listed in USAGE-MODEL §2,
  resolving through `canonicalFactId` / aliases.
- `edges(factId) → Edge[]` with `{ rel, to, label, source }` for: drops, soldBy, foundIn, requires,
  unlocks, locks, partOfQuest, nextBeat, weakTo, resists, goodForBuild, craftedFrom, tradedFor,
  upgradeMaterial, relatedLore. Build indexes once (lazy, memoised) from existing data: `loot.ts`,
  `acquisition.json`, `shops.json`, `merchants.ts`, `remembrances.ts`, `recipes.json`, `gates.ts`,
  `storylines.ts`, `boss-combat.json`, `knowledge/builds.ts`, `interlink.ts`, `links.ts`. Reverse
  edges are derived automatically.
- `status(factId, character) → { state: 'done'|'owned'|'available'|'locked'|'missed'|'unknown', why }`
  using gates/lockouts/inference.
- Replace ad-hoc link builders (`Related.tsx`, `Thread.tsx`, `interlink.ts`) with calls into the graph
  where they duplicate it; keep their public props.

## Page — extend `src/library/EntityPanel.tsx`

- My status strip (from `status`), type tabs, universal actions (Show on map · Mark · Ask Gideon ·
  Compare · Equip · Set as goal).
- `openEntity(factId)` on the workspace context: opens the panel as an overlay from ANY section
  (desktop right panel, phone bottom sheet), pushes `?e=<factId>` onto the hash so Back closes it.
- Make every entity name rendered in Gideon answers, Journey › Now, Quests, map pin popups, the
  Gear sheet and search hits call `openEntity`. Add a `<EntityLink id>` component and use it.

Acceptance: graph tests (each rel type has ≥1 real example; reverse edges; status for locked-by-gate
and missed); `openEntity` hash round-trip test; `npx tsc -b`, `npm test`, `npm run lint`,
`npm run build` pass.
