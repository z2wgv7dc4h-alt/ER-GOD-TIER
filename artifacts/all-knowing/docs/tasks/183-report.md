# Task 183 — Wire in barely-used data (180 Batch C) — report

Follows `docs/tasks/183-wire-data.md`. Only the files the brief owns were touched:
`src/lib/npcPlacements.ts`, `src/library/EntityPanel.tsx` (placement + the new
chest/status blocks), `src/lib/chestFacts.ts`, `src/Atlas.tsx` (pin layer),
`src/lib/coords.ts`, `src/lib/weaponStats.ts` and their tests. No generated file
was edited; `.env` / `.env.local` were never opened.

The previous run had already landed §1 but stopped uncommitted and with one
`tsc` error (`placementSummary` imported but unused); that is committed and fixed
here as `d1dece9`, then §2/§3 as `6802430`.

---

## 1. NPC pages show positions from `npc-placements.json` (Show on map works)

- `npcPlacements.ts` now exposes `baseNpcName`, `placementsForName`,
  `npcCoordPins`; `coords.ts` folds the pins into the shared static-plate set;
  `EntityPanel.tsx` renders a **Known positions** block on an NPC's Where tab.
- The previous run also keyed the async loads by entity name so switching pages
  cannot show another entity's data.
- **Before:** 0 placement rows on a page; NPCs were only groundable when a
  `coords.json` name match happened to exist. **After:** `npcCoordPins` yields
  **111 pins** (86 overworld, 25 shadow) — one per talking NPC — and a page shows
  its own MSB placements. Example: `placementsForName('Blaidd', rows)` returns 3
  rows; `npcCoordPins` places one Blaidd pin per world.
- Show-on-map: the NPC pins carry `kind: 'npc'`, which `resolveEntityPin`
  (`src/map/pins.ts`) already accepts, so "Show on map" resolves an NPC by name
  like any other pin.

## 2. Chest/treasure pins + "where to find"

- `chestFacts.ts` gained `ChestPin`, `chestAnchors`, `projectChest`, `chestPins`,
  `loadChestData` and the `useChestData(enabled)` hook. Projection uses the same
  per-map affine `src/map/itemSources.ts` derives for enemy spawns (local x/z from
  an already-projected NPC placement), plus the fixed overworld/Shadow formula for
  `m60_*` / `m61_*` tiles. No coordinate is invented; a map with no anchor and no
  surface affine is skipped.
- `Atlas.tsx` draws the pins as an **opt-in "Chests" layer** (amber squares,
  clustered with `clusterMarkers` like the other dense layers), toggled by a chip
  in the map's layer panel, with a legend entry. The 529 KB dump is only fetched
  when the player turns the layer on.
- `EntityPanel.tsx` renders a **Found in a chest** block on an item's Where tab
  (chest region + contents) via `matchChests`.
- **Before:** chests existed only as internal facts (`buildChestFacts`, 3,364
  chests) with no pins and no page surface. **After:** **2,932 of 3,364 chests
  (87.2%)** are projected as pins; 415 sit in legacy-dungeon maps with no anchor
  and 17 are `_02` interior variants of an overworld tile, so they are skipped
  rather than misplaced. Validation: the Stormveil Shabriri Grape chest projects
  to **28.90 / 60.82**, beside Godrick's own pin at **29.51 / 61.55** on
  `m10_00_00_00`.

## 3. Weapon/item pages: status build-up and poise next to AR

- `weaponStats.ts` now splits the decoded regulation `attack` object into base
  damage (types 0–4) and a new `status: WeaponStatus[]` (types 5–10, fed by
  `statusSpEffectParams` in `ar.ts`), and adds `weaponStatusFor(name, rows)`.
- `EntityPanel.tsx` loads `weaponStatRows()` on the Stats tab for any entity with
  a `weaponName` and renders a **Status build-up** block immediately after the
  Attack-rating block (its `poise` line renders when the entity also carries a
  Poise stat).
- **Before:** status build-up was mixed into the "Base damage" chips (weapons
  only) or absent; **After:** **292 distinct weapon names** (of 3,296 regulation
  rows / ~439 base rows) show an explicit Bleed/Poison/Scarlet Rot/Frost/Sleep/
  Madness value next to AR. Example: Uchigatana → `Bleed 45`; Serpentbone Blade →
  `Poison 66`; Greatsword → no block (no status).

## Tests

- `src/lib/npcPlacements.test.ts` — 2 new cases (§1): one pin per NPC/world; exact
  name before partial and no two-letter sweep.
- `src/lib/chestFacts.test.ts` — 3 new cases (§2): >2,800 pins in range; the
  Shabriri Grape lands at 28.9/60.82; a legacy map with no anchor is skipped.
- `src/lib/weaponStats.test.ts` — 2 new cases (§3): status split out of damage
  (Uchigatana `Bleed 45`, Greatsword empty); `weaponStatusFor` resolves a page name.

## Checks

- `npx tsc -b` — clean (0 errors).
- `npx vitest run` — **217 files, 1,553 passed / 11 skipped**.
- `npm run lint` (oxlint) — exit 0 (only pre-existing warnings).
- The brief did not ask for the heavy generators/build, so `index:entities`,
  `build`, `test:bundle` and the audit scripts were **not** run (AGENTS.md says
  run the full gates only when the brief says so). Nothing here changes the index.

## ASSUMPTIONS

- "Show on map works" is delivered through the existing `resolveEntityPin` name
  match: the NPC pins are added to the same `coords` pool bosses/graces use, so no
  new resolver was needed.
- Chest projection reuses the NPC-anchor affine (`itemSources.ts` pattern) plus
  the fixed `m60`/`m61` formula. `_02` tiles are interior/underground variants of
  a surface tile and are deliberately not placed on the surface plate.
- The chest map pins are a **local** Atlas toggle (`showChests`) rather than a new
  `MapMarker['kind']`, because `types.ts`, `state.tsx` and `nav.ts` are outside the
  files this brief owns ("nothing else changes").
- The brief says "EntityPanel.tsx (placement section only)". The only non-placement
  edit there is the §3 status block, which must live on the stats page to sit "next
  to AR"; it is a self-contained additive block.
- **Poise:** the regulation dump (`regulation-vanilla-v1.17.json`) contains only
  `calcCorrectGraphs`, `attackElementCorrects`, `reinforceTypes`,
  `statusSpEffectParams`, `scalingTiers`, `weapons` — no weapon poise damage. No
  weapon-poise table exists anywhere else on disk (checked `armory-weapons.json`,
  `open/fanapi/weapons.json`, `open/paramdex/*` which are name-only, and every
  JSON under `public/sourced`). So the §3 block shows the status build-up from the
  regulation params and the existing Poise stat (armour/enemy) when present,
  rather than inventing a number.
- Difficulty/size kept in the S–M band of the 180 report §5 items 7–9.

## Not done

- No weapon poise damage: not present in the regulation params or any on-disk dump
  (see ASSUMPTIONS). Armour/enemy Poise continues to render from the existing stat
  plane.
- Heavy generators/build/audits not run (brief does not request them).
- `AGENTS.md` shows an uncommitted edit in the working tree that predates and is
  unrelated to this task (a rules paragraph about background processes); it was
  left untouched and unstaged.

## Brief checklist

- [x] 1. NPC pages show positions from `npc-placements.json`; Show on map resolves them — 111 pins (86 overworld / 25 shadow) + a Known-positions block, tests in `npcPlacements.test.ts`
- [x] 2. Chest/treasure pins from `world-lots.json` as an opt-in Atlas layer, plus "where to find" on item pages — 2,932/3,364 chests projected (415 unanchored legacy + 17 `_02` skipped), Chests toggle + Found-in-a-chest block, tests in `chestFacts.test.ts`
- [x] 3. Weapon/item pages show status build-up from the regulation params next to AR — 292 weapon names with Bleed/Poison/Rot/Frost/Sleep/Madness, poise shown where the entity carries one (no weapon-poise on disk), tests in `weaponStats.test.ts`
- [x] Tests for each item (7 new cases) + `tsc`, full vitest (1,553 pass) and lint green

ALL ITEMS DONE
