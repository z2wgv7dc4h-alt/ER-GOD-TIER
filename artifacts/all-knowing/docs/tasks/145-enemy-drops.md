# Task 145 — Enemy drops from the game's own drop tables

Read first: `docs/DATA-CATALOG.md`, `DATA.md` (section "Open / vanilla install"), `docs/ARCHITECTURE.md`.
NEVER read, list or open `.env` or `.env.local`. No dev servers. No `npm install`.

## Why

Enemy pages show drops for only 45% of enemies, because drops currently come from the wiki and
FanAPI by name. The game itself says what every enemy drops: each `NpcParam` row points at an
`ItemLotParam_enemy` (and sometimes `ItemLotParam_map`) row, which lists up to 8 items with drop
weights. The local install is vanilla and is the source of truth.

## 1. Paramdef

- Download `https://raw.githubusercontent.com/soulsmods/Paramdex/master/ER/Defs/NpcParam.xml`
  to `vendor/elden-ring-map/data/paramdefs/NpcParam.xml` (the same repo the project already uses
  for `ER/Names`).
- Load it with `scripts/erlib/paramdef.py` and compare `paramdef.row_size` with
  `param.load_params(<install>/regulation.bin)["NpcParam"].row_size`. If they differ, STOP and
  report — do not guess offsets.
- Find the item-lot fields by name in that paramdef (Paramdex names them `itemLotId_enemy` and
  `itemLotId_map`). If the names differ, list the paramdef's fields containing "itemLot" in your
  report and use those; do not invent field names.

## 2. Extractor — new file `scripts/extract-enemy-drops.py`

Pure stdlib + `scripts/erlib` (same import style as `scripts/extract-vanilla-open.py`). Read-only on
the install; refuse to run if `ER_MOD_DIR` is set. Game dir via `erlib.gamepath.require_game_dir`.

For every `NpcParam` row with a non-zero enemy or map item-lot id:
- Read the `ItemLotParam_enemy` row (for `itemLotId_enemy`) or `ItemLotParam_map` row (for
  `itemLotId_map`) using `vendor/elden-ring-map/data/paramdefs/ItemLotParam.xml` (same fields
  for both tables: `lotItemId01..08`, `lotItemCategory01..08`, `lotItemBasePoint01..08`,
  `getItemFlagId`).
- A lot row may continue on consecutive ids (lot+1, lot+2…) — follow the chain exactly like
  `extract-vanilla-open.py` does for treasure (stop at the first missing id, max 10).
- Item name: category → table, `1 GoodsName, 2 WeaponName, 3 ProtectorName, 4 AccessoryName,
  5 GemName`, read from `public/sourced/open/text/<Table>.json` (keys are item ids as strings).
  Skip ids with no name or names starting with `%null%`.
- Chance: `basePoint / sum(basePoint of all 8 slots in that row)` as a percentage rounded to 1
  decimal. A slot with item id 0 is the "nothing" weight and counts toward the sum but is not
  output.
- Output `public/sourced/open/enemy-drops.json`:
  `{ "source": "...", "rows": [ { "npcParamId": 21400030, "name": "<Paramdex NpcParam name>",
     "drops": [ { "item": "Omen Cleaver", "category": 2, "chance": 2.0, "lot": 400300000 } ] } ] }`
  `name` comes from `public/sourced/open/paramdex/NpcParam.txt`. Sort rows by `npcParamId`,
  drops by chance descending. Rows with no named drop are omitted.
- Print: rows written, total drops, and 5 sample rows.

## 3. Index integration — `src/lib/entityIndexBuild.ts`, function `enrichCreatures()` only

- Import `../../public/sourced/open/enemy-drops.json` next to the other open imports.
- For each record with `kind === 'enemy'` whose id is `enemy:<npcParamId>` and has a row in
  `enemy-drops.json`: `addDrops(record, drops.map(d => d.item))`, then
  `setStat(record, 'Drop rates', drops.map(d => `${d.item} ${d.chance}%`).join(' · '))`,
  `source(record, 'regulation/item-lots')`. Keep everything else in that function unchanged.
- Rune entries must not appear in drops (the existing rune filter handles "Runes"; do not add
  runes as items).

## 4. Tests — new file `src/lib/enemyDrops.test.ts`

- `enemy-drops.json` exists, has > 500 rows, every drop has `item`, `category` 1–5 and
  `0 < chance <= 100`.
- The Omen family (NpcParam rows whose Paramdex name is "Omen") drops "Omen Cleaver" in at least
  one row (the wiki and FanAPI both list it — cross-check).
- For enemies that also have wiki drops (`public/sourced/open/wiki-db/enemy.json`, `drops`),
  at least 60% share at least one item with the regulation drops (report the actual %).

## 5. Rules

- Testing: while working run only `npx vitest run src/lib/enemyDrops.test.ts` and `npx tsc -b`.
  At the very end, once: `npm run index:entities`, `npm run audit:pages`, `npm run audit:links`,
  the full `npx vitest run`, `npm run lint`, `npm run build`. Do not loosen or delete any test.
- Do not edit any other extractor, the boss roster, aliases, or catalog. Do not touch builds.
- Commit on your branch (`task-145`) with a clear message. Do not push. Do not merge.

## 6. Report (write to `docs/tasks/145-report.md`, also print it)

- Paramdef row size vs install row size; the exact item-lot field names used.
- Rows written, drops total, enemy drop coverage in the index before (45%) and after.
- The wiki cross-check % from the test.
- ASSUMPTIONS: every decision you made that this brief did not state.
- Anything you could not do, and why.
