# Task 98 — Current area context + Area hub

Read `docs/USAGE-MODEL.md` moments 2, 7, 12. Uses the entity graph (Task 97).

## Current area (global context)

- `currentArea` on the workspace: derived from the most recent of (last discovered grace, last logged
  fact with a location, area picked on the map, live engine position on PC). Persisted in the vault.
  Shown as a chip in the header ("📍 Liurnia · Raya Lucaria"), tap → change area picker.
- Every list that can be location-scoped (Now, Library results, recommendations, to-dos) gets a
  "Near me" scope toggle using `currentArea` + adjacency (`legs.json` region routes).

### PS5: "Where are you?" in one tap

PS5 has no live position, so location must be near-free to enter:
- The header location chip opens a **"Where are you?" picker**: first the 6 most likely graces
  (graces adjacent to the last known one along `legs.json` routes, not yet discovered ones ranked
  first), then the current region's graces, then search. One tap sets `currentArea`, marks the grace
  discovered, and runs inference.
- If `currentArea` is older than 45 minutes of app use, the Resume card and Journey › Now ask
  "Still in <area>?" with [Yes] [Moved →].
- Logging any fact that has a location (boss, item, dungeon) moves `currentArea` there automatically.

## Area hub — Journey › **Area** sub-view (`src/shell/JourneyArea.tsx`)

Sections: header (region name, level band vs my level with verdict "under / right / over"),
**my completion here** (graces, bosses, items, dungeons as bars), **Don't miss** (missables + gates
touching this area), **Bosses** (defeated ✓ / not), **Dungeons** (catacombs/caves/etc. with their
boss and status), **NPCs here now** (by quest state), **Items & loot** (not yet owned first,
"good for my build" badge from the advisor), **Secrets**, **Farm here** (rune/material spots from
gathering nodes + enemies). Every row is an `EntityLink`; the header has "Show area on map".

Sub-views become `journey`: **Now · Area · Map · Quests**.

Acceptance: tests for currentArea derivation precedence, level-band verdict, completion counts;
`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
