# Task 156 — "Show on map" for items that aren't world pickups

## Problem

Task 155 taught the Atlas to centre/zoom on a target, but the only grounded
positions it knew were world pickups (`coords.json` / `boss-pins.json`) and loot
rows. Most catalogue items have no pickup row, so "Show on map" did nothing for
them — they are sold by a merchant, dropped by an enemy or boss, given by a quest
or crafted.

## Fix

### Resolver — `src/map/itemSources.ts` (new)

`createItemSourceResolver(data)` returns `item -> ItemSource[]`, ordered
`pickup > boss > vendor > enemy > other`. Nothing is invented; a source carries a
position only when the data does.

- **pickup** — the existing `resolveEntityPin` (authored graces / coords / boss
  pins / loot grace), plus a name match against `open/coords.json` so the ~1,900
  entity-index items (which the authored catalog does not name) also match.
- **boss** — a boss record in `entity-index.json` whose `drops` (split on commas)
  names the item, positioned by its percent `map` (falling back to the boss pin).
  This is what covers remembrances (`Remembrance of the Grafted` → Godrick).
- **vendor** — `open/shops.json` stock rows whose `item` is the item; the vendor's
  position comes from `npc-placements.json` (matched by full name, then by the
  base name before `" - "`, so "Sorceress Sellen - Quest" finds Sellen).
- **enemy** — `open/enemy-drops.json` rows whose drop list names the item (kept
  with their `chance`), then the exact `open/msb-enemies.json` instances whose
  `id` equals the row's `npcParamId`. Spawns are projected to the plate frame with
  the affine the engine uses: the direct formula for overworld tiles
  (`m60_*/m61_*`) and a per-map translation anchor derived from the already
  projected `npc-placements.json` for every other tile. A tile with no anchor
  cannot be grounded, so its spawn is dropped rather than guessed.
- **other** — a `recipes.json` hit becomes "Crafted from …"; a `quest` acquisition
  whose location text names a placed NPC becomes "Reward from <NPC>".

`sourceHowTo(item, sources)` returns the label to show when no source has a point.

### Atlas — `src/Atlas.tsx`

- Resolves the focused item's sources (boss rows come from the shared entity
  index, so no second fetch of that file).
- Several sources → opens on the first and shows a chooser chip row
  (`.atlas-sources`) so the player can switch.
- Enemy sources draw **every** spawn as a ringed marker and `fitViewBox` (new in
  `src/map/follow.ts`) contains them all; one source just goes there.
- No source with a point → the region/how-to banner says
  "No exact location — <how to get it>"; it never opens on nothing.

### Entry points / hiding

Every "Show on map" already routes through `state.focusOnMap`, so the Atlas
resolver covers entity pages, search, Gideon `showOnMap` and build pins centrally.
The button is now hidden only when there is truly nothing — no location text, no
map row and no source edge — in `src/EntityActions.tsx` and the item branch of
`src/library/EntityPanel.tsx`; the acquisition text stands in its place.

## Coverage (measured by the test over the catalogue item plane)

`entity-index.json` records of kind item/weapon/shield/armor/talisman/spell/ash/
spirit/material, `catalogue !== false` (n = 1979):

| | items with ≥1 map target |
| --- | --- |
| before (pickup coords only) | 827 / 1979 — **41.8%** |
| after (this resolver) | 1862 / 1979 — **94.1%** |

## Examples

- **Vendor-only** `Dagger` → `Sold by Twin Maiden Husks` at (27.30, 72.19), percent
  of the Roundtable placement.
- **Enemy drop** `Omen Cleaver` → `Dropped by Omen 4% · 98 spawns` (100 MSB
  instances; 95 in the anchored Shunning-Grounds tile, 3 in overworld tiles
  projected directly; 2 catacomb spawns have no anchor and are dropped).
- **Boss remembrance** `Remembrance of the Grafted` → Godrick the Grafted at
  (29.32, 61.6).
- **Quest reward** `Ansbach's Attire` → `Reward from Needle Knight Leda` at
  (52.81, 71.31).
- **World pickup** `Black-Key Bolt` → the `open/coords.json` underground corpse
  point, first in the list.

## Tests

New `src/map/itemSources.test.ts` (7 cases, real files loaded with `fs`): vendor,
enemy (Omen Cleaver + rate + spawns), boss remembrance, quest reward, world
pickup, source ordering, and the coverage lift above. Full suite green.

## Checks (run once at the end)

- `npx vitest run` — **201 files passed**, 1446 passed / 11 skipped (was
  200/1439; +1 file, +7 tests).
- `npm run lint` — exit 0 (warnings only, pre-existing).
- `npm run build` — ✓ built.
- `npx tsc -b` — clean.

## ASSUMPTIONS

- **Crafting/cookbook**: `recipes.json` has no recipe → cookbook link, so a crafted
  item gets the materials in the label and the region/how-to fallback, **not** the
  cookbook's map pin. This is the one part of §1 not fully met — doing it would
  need a recipe→cookbook table that is not on disk.
- **Legacy-dungeon enemy spawns** are projected by translating a same-tile
  `npc-placements` anchor (validated: all 141 multi-placement tiles have a
  consistent offset). `vendor/elden-ring-map/data/legacy-conv.json` is not in the
  repo, so a tile with no placed NPC (2 of Omen's 100 instances) is dropped.
  Sub-tile scale is assumed to be 1 — the same assumption the anchor itself uses.
- **Boss rows** are read from `entity-index.json` at runtime via the shared store
  (already fetched by the app), not re-fetched; before that store resolves the
  resolver simply has no boss rows and falls back to pickup/region.
- **Vendor names** are matched to NPC placements by name; the shop's `"Unknown"`
  vendor has no placement and yields a labelled, point-less source.
- The chooser lists every source kind, even when only one has a position; with no
  point the banner shows the region and the how-to text.
- The worktree `node_modules` was an empty directory; it was repointed as a
  junction at the already-installed tree in the sibling `task-155` worktree so the
  gates could run. No packages were installed and no lockfile changed.
