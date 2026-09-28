# Task 123 — Every catalogue item enriched; fix armor "[object Object]"

1. **Bug**: armor negation renders as `[object Object]` (entity pages / peek / Library). Find every place a
   structured value (negation, resistances, scaling, requirements, attack) is stringified; render them as proper
   rows/chips (Physical 12.4 · Strike 11.1 · …). Add a test that renders an armor, a weapon, a talisman and a boss
   through the peek + entity page and asserts no "[object Object]" / "undefined" / "NaN" appears. Grep the app
   for other `${obj}` style stringification bugs and fix them all.
2. **Full catalogue in the index**: `entity-index.json` has only 62 weapons (the curated graph subset) although
   the Library lists 423 weapons, 69 shields, 568 armor, 87 talismans, 71 sorceries, 98 incantations, ~90 ashes,
   64 spirits, 462 items. Make `scripts/build-entity-index.mjs` enumerate the **full catalogue** (checklists +
   fanapi + armory + regulation weapon params) as the entity set, not just graph ids; every Library row must have
   an index record with canonical id shared with the Library and the graph.
3. Coverage minimums over the FULL sets: weapons ≥ 95% requirements+scaling+location; shields ≥ 95%; armor ≥ 95%
   negation+weight+location; talismans/spells/ashes/spirits ≥ 95% description+location; items ≥ 85%
   description+location. Update `docs/ENTITY-COVERAGE.md` with the table; list the remaining misses by name.
4. Keep the index lean (split into per-kind chunks loaded on demand if it exceeds ~2.5 MB) and service-worker
   cached.

Acceptance: `npm run audit:ui` (dev server on :5173 running; don't start/stop it) zero issues; spot-check peek
content for: Uchigatana, Lordsworn's Straight Sword, Brass Shield, Banished Knight Helm, Crimson Amber Medallion,
Glintstone Pebble, Flame Sling, Lion's Claw (ash), Black Knife Tiche, Golden Seed — print them in the report.
NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
