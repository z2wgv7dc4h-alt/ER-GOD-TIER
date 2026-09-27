# Task 119 — One enriched record per entity (fix empty tooltips / boss pages)

Peek cards, entity pages and Gideon show little or nothing for many bosses/items even though the repo holds the
data. Cause: each dataset keys entities differently (`boss:…`, `hunt:…`, `loot:…`, fanapi names, Fextralife
names, NpcParam rows) and several load async, so lookups miss. Fix it systemically.

## 1. Measure first — `scripts/entity-coverage.mjs` (`npm run coverage:entities`)
For every entity in the entity graph, by kind (boss, weapon, armor, talisman, spell, ash, spirit, item, NPC,
grace, dungeon, location), report % having: description, location/acquisition text, map coords, image,
stats (kind-appropriate: boss HP/negation/resist/poise; weapon requirements/scaling/base dmg/weight; armor
negations/poise/weight; talisman effect), drops (bosses), strategy/wiki section, related links. Write
`docs/ENTITY-COVERAGE.md` with before numbers.

## 2. Build-time enrichment index — `scripts/build-entity-index.mjs` → `public/sourced/entity-index.json`
One record per canonical fact id merging ALL sources: `public/sourced/checklists/*.json`, `open/fanapi/*`,
`open/acquisition.json`, `open/wiki-sections.json` (pick the sections relevant to the entity: Location,
Strategy, Notes, Drops), `open/npc-combat.json` / `boss-combat` / `enemy-combat.json`, Fextralife boss drops,
`open/boss-pins.json` / `boss-xyz.json` / `coords.json` / `grace-xyz.json`, `open/shops.json`, `recipes.json`,
`armory-weapons.json`, regulation weapon params, `image-index.json`, `npc-placements.json`,
`src/data/dungeons.json`, `aliases.json`. Name matching: normalise (case, punctuation, apostrophes, "the",
parenthetical suffixes like "(Stormveil)"), then aliases, then fuzzy (≥0.92) with a manual override table
`src/data/entity-overrides.json` for the misses. Log unmatched rows per source into the coverage doc.
Records are compact (summary fields + section excerpts ≤ 600 chars each), lazy-loaded once, cached by the
service worker.

## 3. Consume it everywhere
`getEntity`/`status` in `entityGraph.ts`, the peek card, EntityPanel Stats/Where/Lore tabs, BossFacts,
Library cards and Gideon's `get_entity` tool read the enriched record first. Show a skeleton while the index
loads — never "No data" before it has loaded.

## 4. Guard it
A test runs the coverage computation and asserts minimums: bosses ≥ 95% with HP+negation+location, ≥ 90% with
drops and strategy; weapons ≥ 98% with requirements+scaling+location; armor/talismans/spells/ashes/spirits ≥ 95%
with description+location; graces ≥ 98% with coords. Write the after numbers into `docs/ENTITY-COVERAGE.md`.

Spot checks in the report (print the enriched record summary): Margit, Malenia, Radahn, Godrick, Moonveil,
Rivers of Blood, Mimic Tear Ash, Radagon's Soreseal, Iron Fist Alexander, Church of Elleh grace.

`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
