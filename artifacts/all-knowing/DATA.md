# Data on disk

All under `public/sourced/` unless noted.

## Maps

- `maps/m0-overworld.jpg` — Pack 960 full official mosaic, 4096x3880 (~4.4 MB)
- `maps/m1-underground.jpg` — Pack 960 underground, 4096x3880 (~0.7 MB)
- `maps/m-ashen.jpg`, `maps/m-shadow.jpg` — AI-generated stand-in art (no real
  assembled source found); pins there stay on the stand-in's own frame
- Static-plate pins (`open/coords.json`, `open/boss-pins.json`) use the engine
  mosaic frame (`percent = px / 10496`). `open/world-lots.json` is **not**
  plotted on the static plate — XYZ only, 10k rows, would clutter and add a
  third projection. See `src/lib/coords.ts`.

## Attack rating (Build lab)

- `regulation-vanilla-v1.17.json` — ThomasJClark/elden-ring-weapon-calculator's vanilla 1.17 /
  Tarnished Pack regulation data (MIT). CalcCorrectGraphs, AttackElementCorrect, reinforce rates,
  weapon base damage/scaling/requirements, and Tarnished Pack weapon rows. Loaded on demand by
  `src/lib/ar.ts`. See `THIRD_PARTY_NOTICES.md`.
- **Regulation stamp:** `Character.regulation` / `catalog.regulation` are `'1.17-tarnished-pack'`
  (`src/lib/regulation.ts`). The AR data, the atlas marker extract, and `open/names.json` are all
  on that line. The atlas markers and `names.json` were regenerated from this machine's 1.17
  install in Task 27 (see below); the one source still off-stamp is the upstream
  `open/paramdex/` dump, which is post-SotE but predates the Tarnished Pack.
  `regulationAudit()` reports that remaining gap rather than hiding it.
- **Regenerate the FMG name dump** from a local install:
  `python scripts/extract-fmg-names.py` — reads the install's `item` + `item_dlc02` FMG and
  rewrites `open/names.json` (base + Shadow of the Erdtree + Tarnished Pack names).
- **Top up the Paramdex equipment names** from a local install:
  `python scripts/extract-paramdex-names.py` — appends only the ids the upstream dump is missing
  (`EquipParamWeapon`/`Goods`/`Protector`/`Accessory`/`Gem`; row id == FMG text id). `NpcParam.txt`
  is not regenerated (its names are DSMapStudio-resolved, not an FMG row-id join).
- **Regenerate the atlas markers** from a local install:
  `python vendor/elden-ring-map/tools/build_markers.py "<game dir>"` — writes the
  gitignored `vendor/elden-ring-map/data/markers.json` (1,106 markers incl. Shadow of the Erdtree).

## Boss combat (Build lab) — real NpcParam

- `npc-combat.json` — 83 named bosses keyed to catalog fact ids: per-damage-type damage negation,
  defence, status resistances, poise, and base HP. Extracted from the local install's
  `regulation.bin` `NpcParam` via ERDB/ERExporter (method and licences in
  `THIRD_PARTY_NOTICES.md`). Loaded by `src/lib/enemy.ts`; shown in the Build lab's
  "what should I hit this with" panel. These are **combat stats**.
- `baseHp` and `resist` are raw param values before the game's area/NG scaling — `baseHp` is not
  the HP bar, and `resist` is a relative resistance stat, not the in-game buildup threshold. The
  per-damage-type `negation` and `poise` are direct values and match the in-game numbers.
- `*GuardCutRate` is deliberately **not** used: the paramdef describes it as guard-only ("if it is
  not a guard attack, enter 0"), so the general `*DamageCutRate` fields are the negation source.

## Regular enemy combat (Build lab) — real NpcParam + MSB

- `enemy-combat.json` — 2271 regular (non-boss) enemies keyed `enemy:<npcRow>`, with the same
  fields as `npc-combat.json` (base HP, poise, per-damage-type negation, status resistances) plus
  `model`, `placements` and `maps`. Generated with the same regulation extraction as the boss
  table, then restricted to enemies actually placed in the world:
  1. `NpcParam` read from the local install's `regulation.bin` via the vendored EldenRingMap
     `erlib` reader (`vendor/elden-ring-map/tools/erlib`), using Paramdex's maintained
     `ER/Defs/NpcParam.xml` paramdef. The field mapping was validated by reproducing Task 17's
     `npc-combat.json` values for Malenia exactly (physical 10 / magic 20 / fire 0 / lightning 20 /
     holy 40; hp 2489; resist 542/542/154/252/999/999).
  2. MSB `PARTS_PARAM_ST` enemy parts give the authoritative `NPCParamID` per placement (located
     by matching ints against the real NpcParam id set — the field sits at entry +0x2ac, falling
     back to +0x2a8). Placements are joined to the existing `open/msb-enemies.json` by
     `(map, name)`; 7642 of 8827 placements resolve.
  3. Catalog bosses in `npc-combat.json` are excluded, so the two tables partition the roster.
  4. `poise` is NpcParam `superArmorDurability` (Task 17's boss `poise` source); negation is
     `round((1 - *DamageCutRate) * 100)`; status resistances map to `resist_*` fields.
- `src/lib/enemy.ts` loads both tables through one `CombatStats`/`CombatTarget` interface; the
  Build lab's target picker covers bosses and field enemies in one panel.

## Guide (aether-auto/er-guide)

- `guide/items.json` 2.4k items with acquisition
- `guide/catalog.json` slim search copy
- `guide/regions/` 25 grace-to-grace routes
- `guide/legs.json` 124 legs
- `guide/missables.json` lockouts

Coords from the same project: `open/coords.json` (~2k pins).

ER Checklist (Nexus 9953, `sote-1.16`) — the pack's `mods/ercl/items.json` is a plain
nine-category completion list (hex ids + names). Its spell/talisman/ash/cookbook/whetblade
rows are already covered by the guide catalog; the gap-fill merge added the missing
`gesture` category (50) and the three duplicate base-game crystal tears ERCL tracks
separately, and aligned the catalog's `dlc` flag on 19 rows. Only that JSON file was read;
none of the pack's overlay binaries are used or referenced anywhere in this repo.
See `docs/REVIEW.md`.

## Open / Goblins / Paramdex

| File | What |
|---|---|
| `open/names.json` | 8.8k EN FMG names (base + SotE + Tarnished Pack; `scripts/extract-fmg-names.py`) |
| `open/shops.json` | 1261 shop rows |
| `open/world-lots.json` | 10k lots + XYZ; `src/lib/chestFacts.ts` groups the 4018 treasure rows into 3401 chest/pickup facts |
| `open/boss-xyz.json` / `boss-pins.json` | 215 named bosses; 109 projected |
| `open/enemies.json` | 520 EN names |
| `open/msb-enemies.json` | 8.8k placed enemies — joined to `enemy-combat.json` for placement counts/maps |
| `open/grace-xyz.json` | grace world positions + region names; nearest-region label for chest facts |
| `open/graces` via checklists/graces.json | 418 warps |
| `open/paramdex/` | Names txt dump; equipment files topped up from install (Tarnished Pack rows); `NpcParam.txt` still upstream (post-SotE) |
| `src/knowledge/merchants.ts` | 106 vendors full stock |
| `src/knowledge/bossPins.ts` | sync pin list for Gideon |

## Alias plane (generated)

- `public/sourced/aliases.json` + `src/data/aliases.json` — one generated table mapping engine
  row id (`grace:100000`, `bossflag:510010`, `npc:21300014`, `goods:8175`, …) → catalog slug →
  FMG name → aliases, across grace/boss/invader/item/quest/region. The two files are identical;
  the `public/` copy is the artifact of record, the `src/data/` copy is the synchronously
  imported one (`canonicalFactId` / `searchSync`). Regenerate with `node scripts/gen-aliases.mjs`
  from the game-derived dumps above; see `docs/ALIAS-PLANE.md`. Committed because it is
  name/id-only derived data, not shipped game art.

## Checklists

FanAPI JSON (weapons, armors, spells, …) + `hunts.json` (207 flags) + `graces.json`.

`public/sourced/checklists/hunts.json` is the single canonical field-hunt dataset (BuLEEto):
Codex fetches it, `src/knowledge/completion.ts` derives `fieldHunts` from it, and
`src/lib/sl2/facts.ts` reads its flags directly. There is no separate `hunt-flags.json` copy
(deleted in Task 37 — it could drift). See `docs/research/hunt-data-cleanup.md`.

## Authored (small, keep)

`src/knowledge/{catalog,endings,storylines,loot,builds,collectibles,completion,missables}.ts`

## Cosmetic display (not combat)

- `src/knowledge/npc-display.ts` — player-model NPC level/stat allocation from the EanNewton
  "ER NPC Levels" Google Sheet. **Display flavor only**, generated by
  `scripts/ingest-npc-display.mjs`. Not enemy absorb/resistance; the combat source is
  `public/sourced/npc-combat.json` + `src/lib/enemy.ts` (extracted `NpcParam`, above).
See `docs/REVIEW.md`.

## Achievement sets + conditional merchant stock (Task 29)

- `src/lib/achievements.ts` gives the guide catalog's `cookbook` (106), `bell-bearing` (65) and
  `whetblade` (5) rows an "N/total, here's what's left" completion surface in Codex, matching
  Task 16's golden-seed/sacred-tear treatment. The guide shipped 31 bell bearings with an empty
  acquisition string; `bellBearingSources` supplies 13 named-NPC sources and the rest fall back to
  the always-true "kill the merchant" line, so every row has a source. Progress is keyed off
  `character.collectedItems`; guide ids have no `kind:` prefix so `prefixKind` files them as items.
- `src/knowledge/merchantConditions.ts` authors the unlock condition for the 58 conditional vendor
  rows `merchants.ts` already carried as `"<vendor> - <condition>"` (Corhyn/Miriel prayerbooks and
  scrolls, Sellen, Seluvis, Enia remembrances, and 15 bell bearings handed to the Twin Maiden
  Husks). Stock stays in `merchants.ts`; this only adds the trigger, surfaced through `findSellers`
  and the Gideon router. See `docs/REVIEW.md`.


Medusa: chapter titles only. Do not paste walkthrough prose.
