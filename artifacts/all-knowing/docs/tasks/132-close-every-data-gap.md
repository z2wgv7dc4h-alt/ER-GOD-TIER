# Task 132 — Close every gap in `docs/DATA-CATALOG.md` (use ALL the scraped data)

Read `docs/DATA-CATALOG.md` first — it lists every source, what uses it, 42 UNUSED files, and the "Gaps" table
(app records vs the richest source). The user has scraped everything; the app must use it. Target: every Gaps row
closed to 0 (or explained with evidence), every UNUSED file either consumed or listed with a reason it is
redundant.

## 1. Mine the wiki DB (`data/raw/er-mcp.db`) into the entity index (Task 131 §3)
Export with a stdlib-Python script `scripts/export-wiki-db.py` (no installs) to
`public/sourced/open/wiki-db/<kind>.json`, then fold into `scripts/build-entity-index.mjs`:
- classify every page by infobox (Item 1789, Armor 680, Location 496, Weapon 480, Enemy 346, Boss 259, Character
  198, Item ERN 119, Lore 106, Faction 60, Dungeon 46, …) into entity kinds; keep description/lore, location,
  drops, requirements/stats, related links, wiki URL;
- redirects (2,730) → aliases in `src/data/aliases.json`;
- typed tables (weapons/armor/spells/talismans/bosses/quests/acquisition) merged field-by-field.

## 2. Close each Gaps row
- **NPC** 8 → all Characters (≥ 198 pages; merge dialogue speakers, FanAPI npcs, npc-placements, quests):
  description, where they are (by quest state), questline link, what they sell, dialogue link.
- **Location/region** 10 → all Locations (≥ 496) incl. sub-areas; description, region, graces inside, bosses,
  items, map coords.
- **Grace** 50 → all 418 BonfireWarpParam graces with coords + region + sub-area.
- **Item** 441 → all goods (key items, materials, consumables, cookbooks, bell bearings, crystal tears, great runes,
  remembrances, multiplayer items…) from wiki Item pages + FMG goods + acquisition.
- **Enemy** 0 → a new `enemy` kind from wiki Enemy pages (346) + `enemy-combat.json` (2,271 NpcParam rows; group
  variants) with HP/negation/resists/drops/locations.
- **Boss** → reconcile with Task 130's roster (`src/data/bosses.json`) and the 259 wiki Boss pages; every boss
  encounter has a page.
- **Armor/Talisman/Spell/Ash/Spirit/Shield/Weapon** → close the listed differences (DLC items, variants). Weapon
  "3,722 FMG rows" includes upgrade/affinity variants — dedupe to base weapons; report the true base count.
- **Quest** 176 → all 341 steps across 68 NPCs, linked to NPC entities.

## 3. UNUSED files
For each of the 42: consume it (e.g. `guide/regions/*.json` → Area hub content; `open/msb-enemies.json` → enemy
locations; `open/map-lots.json` / `map-points.json` → item/pickup locations; `open/place-names.json` → location
names; `checklists/{ammos,classes,creatures}.json` → entities) or mark it redundant with the source that
supersedes it. Regenerate `docs/DATA-CATALOG.md` (`npm run data:catalog`) — UNUSED should be only true duplicates.

## 4. Surface it
Library categories for NPCs, Locations, Enemies, Key Items/Materials; entity pages/peek for the new kinds;
Gideon `search`/`get_entity` covers them; quick-log and Area hub use NPCs/locations/enemies.

## 5. Guards
Coverage test minimums per new kind (≥ 95% description + location); catalog Gaps table all ≤ 0 or explained.
Report the before/after Gaps table and the UNUSED resolution list.

NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; commit after each numbered
section.
