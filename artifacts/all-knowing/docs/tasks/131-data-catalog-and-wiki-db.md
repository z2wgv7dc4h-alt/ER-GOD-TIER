# Task 131 — Data catalog + fully use the scraped wiki database

The user has scraped essentially everything. We keep under-using it. Two causes: no map of the data, and the
richest source — a 47 MB SQLite dump of the Fandom wiki at `.scratch/er-mcp.db` (4,939 full wikitext pages,
21,885 sections, typed tables weapons 480 / armor 680 / spells 213 / talismans 156 / bosses 165 / quests 341 /
acquisition 2,609, 2,730 redirects) — sits in the throwaway `.scratch/` folder.

## 1. Move the DB to a real home
Move to `data/raw/er-mcp.db` (create `data/raw/`, gitignored — too large to commit) and update every script that
references `.scratch/er-mcp.db`. Add `data/raw/README.md` explaining what it is and how it was produced.

## 2. Generated data catalog — `scripts/data-catalog.mjs` → `docs/DATA-CATALOG.md` (`npm run data:catalog`)
For EVERY data source — all files under `public/sourced/**`, `src/data/**`, `src/knowledge/*.ts` exports,
`vendor/elden-ring-map/data/*` (if present), `data/raw/er-mcp.db` (every table), `public/sourced/images`
(counts only) — list: path, size, record count, top-level shape/fields (first record keys), which entity kinds it
covers, **which src modules consume it** (grep), and **UNUSED** if nothing consumes it. For the SQLite DB also list
the page categories/infobox types found in `pages.wikitext` with counts (e.g. `{{Infobox Boss`, NPC, Location,
Item, Key Item, Crafting Material, Ash of War, Spirit Ash, Incantation, Sorcery, Merchant, Quest…).
End with a "Gaps" section: entity kinds where the app uses fewer records than the richest source holds.

## 3. Mine the wiki DB fully into the entity index
Extend `scripts/build-entity-index.mjs` to read `data/raw/er-mcp.db` (use `node:sqlite` if available on this Node
version, else `better-sqlite3` is NOT allowed to be installed — fall back to a small Python export script
`scripts/export-wiki-db.py` using the stdlib `sqlite3` that writes `public/sourced/open/wiki-db/*.json`).
Classify every page by its infobox/categories into entity kinds (boss, NPC, location, dungeon, grace, weapon,
armor, talisman, spell, ash of war, spirit ash, item, key item, material, cookbook, bell bearing, merchant,
quest, ending…) and fold into the index: description/lore, location, drops, requirements, stats, related links,
wiki URL. Redirects become aliases in `src/data/aliases.json`. NPC and location pages give the NPC/location
entities real content. Re-run coverage and add guards for NPCs and locations (≥ 95% with description +
location).

## 4. Make agents use it
Add a short "Before you start" section to `docs/USAGE-MODEL.md` and `HANDOFF-CLAUDE.md`: read
`docs/DATA-CATALOG.md`; never report data as missing without checking every catalog source; cite which sources
were checked.

Report: the catalog summary (sources, records, UNUSED list, Gaps), per-kind entity counts before/after, coverage.
NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
