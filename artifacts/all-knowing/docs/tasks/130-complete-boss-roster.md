# Task 130 — Complete boss roster everywhere (+ two bugs)

The Setup › Bosses step lists only **112** bosses; the game has ~207 base-game boss encounters + ~80+ Shadow of
the Erdtree ones (field bosses, catacombs, caves, tunnels, hero's graves, evergaols, dragons, Night's Cavalry,
DLC field/dungeon bosses). The repo already holds far more: map boss markers (229), `open/boss-list.json` (215),
`open/bosses-fextralife.json` (full Fextralife boss pages), `open/boss-pins.json`, `npc-combat.json`,
`src/data/dungeons.json`, the entity index (160 bosses).

1. **Canonical roster** `scripts/build-boss-roster.mjs` → `src/data/bosses.json` (committed): one record per boss
   *encounter* (a boss fought in 2 places = 2 encounters, e.g. Night's Cavalry, Erdtree Avatar, Tree Sentinel,
   dragons), with: canonical fact id (shared with the entity graph), name, campaign (base/DLC), region, exact
   location (dungeon/area + nearest grace), tier (`great-rune` / `remembrance` / `major` / `field` / `dungeon` /
   `evergaol` / `mini`), required-for-ending flag, drops, map coords, HP. Merge all sources above; dedupe by
   name+location; report the counts per campaign/tier and any source rows that failed to join. Cross-check totals
   against the Fextralife boss list (base ~207, DLC ~80+) and list the differences.
2. **Use it everywhere**: Setup step 5 (grouped by region, remembrance/great-rune bosses first as tiles, then the
   rest collapsed per region with a count and a "mark all in this region" action + search box — it must stay fast
   with ~290 rows), Tarnished progress (bosses X / total), Journey › Area bosses, Library › Bosses category, the
   entity graph (register any new boss ids + enrich them), quick-log suggestions, and completion "Missing" views.
   Coverage guard: bosses in the index ≥ roster size, 100% with location + region.
3. **Bug**: Library › Builds "Stronger for your build" lists weaker weapons (e.g. "−5.1% vs Cane Sword",
   "−24.8%"). Only list upgrades with a positive gain; if none, say "Nothing stronger reachable yet" and show the
   Later list. Add a test.
4. **Bug**: the deep link `#/library/search?cat=bosses` lands on Library › Builds instead of the Bosses category.
   Fix the hash parsing/redirect; test deep links for every category.

NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
Report the roster counts and the Fextralife cross-check differences.
