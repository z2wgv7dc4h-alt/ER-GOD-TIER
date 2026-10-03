# Task 148 — Fixes from the Task 147 audit + one page per enemy

Work dir: this worktree (`artifacts/all-knowing`), branch `task-148`. Read first:
`docs/tasks/147-report.md` (the audit, with sources and examples), `docs/DATA-CATALOG.md`, `DATA.md`.
NEVER read, list or open `.env` or `.env.local`. No dev servers. No `npm install`. Do not push.
Do not touch builds (`build:*` records/data), Gideon, or the boss roster (`scripts/build-boss-roster.mjs`).
All data changes go in the generators (`src/lib/entityIndexBuild.ts`, `scripts/gen-aliases.mjs`),
never by hand-editing generated JSON. Never invent text: every value must come from a file on disk
(game text tables `public/sourced/open/text/*`, wiki-db, Fextralife, FanAPI, checklists,
`.scratch/er-mcp.db` via python sqlite3).

Do the steps in order; **commit after each step** (`Task 148 step N: …`). If a step turns out
wrong or risky, skip it, say why in the report, and continue.

## 1. One page per enemy
Today each NpcParam row is its own `enemy:<npcParamId>` record, so names like "Omen" have many
near-identical pages (report section 5: 177 groups / 668 extra records).
- Group `kind === 'enemy'` records by exact display name. Keep separate any record whose name
  differs (e.g. contains "(Boss)" or a different title) — only identical names merge.
- One record per group, id `enemy:<slug of name>`. Union of placements/locations/regions/drops;
  description = the best non-placeholder one. Add a `variants` list on the record:
  `[{ npcParamId, location, region, drops: [{item, chance}] }]` (drops/chances from
  `public/sourced/open/enemy-drops.json`). Keep the "Drop rates" stat per variant inside `variants`
  only, not concatenated.
- Every old `enemy:<npcParamId>` id must still resolve to the merged record (aliases), so links,
  photo matches and tests keep working.
- UI: in `src/library/EntityKinds.tsx` add a small "Variants" section for enemies with >1 variant
  (location · region · drops with %), same style as the existing sections. No other UI changes.

## 2. Placeholder junk
Remove/clean (report section 10): `Dummy Entity` enemies, `See #Drops` drop entries, `Type 1–20`
armour prototypes, `test gem 1–3`, descriptions starting "The is a" or equal to a single word
("drop", "merchant", "other", …). A cleaned description is replaced in step 3 or left empty.

## 3. Real descriptions
For records with an empty, fragment or one-word description (~414, ~361 fillable per the report),
fill from the sources the report names (wiki-db first, then er-mcp.db `pages`/`sections` lead
paragraph, stripped of wiki markup). Never use a template sentence ("X is a … in Elden Ring.").

## 4. Cut content
Mark weapons/items/NPCs the wiki lists as cut/unused (wiki-db cut pages, er-mcp.db
`{{Infobox Weapon Cut}}` / "Unused Content" category — report item 6) with `cut: true` and a stat
`Status: Cut content (not obtainable)`. Do NOT delete them.

## 5. Missing names
Add aliases (via `gen-aliases.mjs`) from er-mcp.db `redirects` where the target matches exactly one
record, and the real missing game names from the report (maps, notes, cookbooks, DLC Ashes of War,
NPC titles). Skip upgrade-tier names (“+N”, “Smithing Stone [N]” duplicates). A name that would point
at two records is skipped. Never steal an alias another record already owns.

## 6. Boss drops + runes, merchant details
Fill boss drops/runes gaps (report item 7) and merchant description/location/coords (item 8) from
the named sources. Merchants: only real data, no templates.

## 7. Tests + gates
New `src/lib/auditFixes.test.ts`: no enemy display name appears twice; `enemy:<old npcParamId>`
ids from enemy-drops.json resolve; no description matches `/^The is a|^\w+$/`; no record named
`Dummy Entity` or `/^type \d+$/i` or `/^test gem/i`; at least one cut weapon has `cut: true`.
While working run only that test, `src/lib/gameNames.test.ts`, `src/lib/enemyDrops.test.ts`, and
`npx tsc -b`. At the end, ONCE: `npm run index:entities`, `npm run audit:pages`,
`npm run audit:links`, full `npx vitest run`, `npm run lint`, `npm run build`. Do not loosen or
delete tests; if a count legitimately changed (e.g. enemy count after merging), update that number
and list it in the report.

## 8. Report `docs/tasks/148-report.md` (also print it)
Per step: what changed with before/after counts and 3 examples. Enemy records before/after.
Final gate numbers. ASSUMPTIONS (every decision not stated here). Skipped items and why.
