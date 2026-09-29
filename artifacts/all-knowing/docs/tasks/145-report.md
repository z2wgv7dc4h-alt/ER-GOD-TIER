# Task 145 report — Enemy drops from the game's own drop tables

## Paramdef

- Downloaded `https://raw.githubusercontent.com/soulsmods/Paramdex/master/ER/Defs/NpcParam.xml`
  to `vendor/elden-ring-map/data/paramdefs/NpcParam.xml`.
- `paramdef.load(NpcParam.xml).row_size` = **736**; `param.load_params(<install>/regulation.bin)["NpcParam"].row_size`
  = **736**. They match — no offsets were guessed.
- Item-lot fields, found by name in the paramdef (no guessing): **`itemLotId_enemy`** and
  **`itemLotId_map`** (both `s32`, paramdef default `-1`). `ItemLotParam.xml` was already vendored;
  its row size is **152** bytes for both `ItemLotParam_enemy` and `ItemLotParam_map`.

## Extractor — `scripts/extract-enemy-drops.py`

Runs from the local, vanilla install (`ER_MOD_DIR` unset → refused; read-only). Wrote
`public/sourced/open/enemy-drops.json`.

- **Rows written:** 4,086
- **Total drops:** 15,156 (1.3 MB)
- **Referenced lots:** 4,496 enemy-lot rows + 142 map-lot rows; 8 NpcParam rows carry both.
- **Omen family:** 28 NpcParam rows named exactly `Omen`; 20 of them drop **Omen Cleaver**
  (the wiki and FanAPI both list it — cross-check passes).

## Index integration

`enrichCreatures()` in `src/lib/entityIndexBuild.ts` only: the new `enemy-drops.json` is imported
and, for every `enemy:<npcParamId>` record with a row, `addDrops(...)`, `setStat('Drop rates', …)`
and `source('regulation/item-lots')` are applied. Everything else in the function is unchanged.

Enemy drop coverage in the built index:

| | enemies | with drops | coverage |
| --- | --- | --- | --- |
| before | 1276 | 571 | **44.7 %** (the brief's ~45 %) |
| after | 1276 | 914 | **71.6 %** |

725 enemy records now carry `regulation/item-lots` as a source. The existing rune filter is left
in place; no runes were added as items.

## Wiki cross-check (from `src/lib/enemyDrops.test.ts`)

Over the enemies present in **both** sources (name-normalised exact match, the "enemies that also
have wiki drops" set), the share that has at least one item in common between the wiki `drops` and
the regulation drops:

```
[Task 145] wiki cross-check: 64/78 = 82.1%
```

The test asserts `≥ 60 %`.

## Final verification

- `npx vitest run src/lib/enemyDrops.test.ts` — 3/3 pass.
- `npx tsc -b` — clean.
- `npm run index:entities` — 6,307 records.
- `npm run audit:pages` — 6,309 entities, 5 flagged.
- `npm run audit:links` — dead data 0, dead renderer 0, guard violations 0.
- `npx vitest run` — 196 files / 1,399 passed, 11 skipped.
- `npm run lint` — exit 0 (pre-existing warnings only).
- `npm run build` — success.

## ASSUMPTIONS

1. **"Non-zero" lot id means `> 0`.** The paramdef default is `-1`, and `-1` fills every unused
   slot, so a row's lot only counts when it is positive (otherwise every NpcParam row would look
   like it had a lot). 4,630 rows have a positive lot; the rest are `-1`.
2. **Both lot types are used when both are positive** (8 rows). Drops from
   `ItemLotParam_enemy` and `ItemLotParam_map` are combined; each drop keeps its own `lot` id.
3. **A named slot with `basePoint == 0` is not output.** It can never drop (0 % weight); skipping
   it is also what keeps every emitted `chance` strictly `> 0`, as the test requires. The "nothing"
   slot (`lotItemId == 0`) still counts toward the sum and is never output.
4. **Chain rule.** Starting at the referenced lot, consecutive ids (`lot+1`, `lot+2`, …) are folded
   in while they exist, stopping at the first missing id, max 10 — as in
   `extract-vanilla-open.py`'s treasure chain. No "referenced elsewhere" exclusion was added,
   because enemy lots have no equivalent single-owner event.
5. **Duplicates.** The same `(item, lot)` pair is emitted once; the same item reaching an enemy
   through two different lots is kept twice (the index de-duplicates names on merge anyway).
6. **Name.** `name` is the Paramdex `NpcParam.txt` name. 3 written rows have no Paramdex name and
   carry `name: ""`; the index joins on `npcParamId`, never on the name, so nothing is lost.
7. **Cross-check denominator.** "Enemies that also have wiki drops" is read as the enemies present
   in both `enemy-drops.json` and `wiki-db/enemy.json` with non-empty `drops` (name-normalised exact
   match). Items are compared after the same normalisation. One test row's `chance` is a fraction of
   its own lot row only.

## Could not do

- **129 NpcParam rows reference an enemy lot id that does not exist** in `ItemLotParam_enemy`
  (e.g. some cut/unused rows). Following the brief's "stop at the first missing id", those produce
  no drops rather than an invented entry.
- **Wiki enemies with no NpcParam item-lot at all** (e.g. invaders / quest NPCs such as
  *Bloody Finger Nerijus* and *Aging Untouchable*) cannot be cross-checked; their drops are granted
  by event/quest scripts, not `ItemLotParam`, so they are correctly absent from the regulation table
  used here.
