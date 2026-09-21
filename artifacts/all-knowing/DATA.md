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
  (`src/lib/regulation.ts`). The AR data is on that line; the atlas marker extract (local install)
  and `open/names.json` (base-game FMG) are **not** — `regulationAudit()` reports the mismatch
  rather than hiding it.

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
| `open/names.json` | 6.8k EN FMG names |
| `open/shops.json` | 1261 shop rows |
| `open/world-lots.json` | 10k lots + XYZ; `src/lib/chestFacts.ts` groups the 4018 treasure rows into 3401 chest/pickup facts |
| `open/boss-xyz.json` / `boss-pins.json` | 215 named bosses; 109 projected |
| `open/enemies.json` | 520 EN names |
| `open/msb-enemies.json` | 8.8k placed enemies — joined to `enemy-combat.json` for placement counts/maps |
| `open/grace-xyz.json` | grace world positions + region names; nearest-region label for chest facts |
| `open/graces` via checklists/graces.json | 418 warps |
| `open/paramdex/` | Names txt dump |
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

## Authored (small, keep)

`src/knowledge/{catalog,endings,storylines,loot,builds,collectibles,completion,missables}.ts`

## Cosmetic display (not combat)

- `src/knowledge/npc-display.ts` — player-model NPC level/stat allocation from the EanNewton
  "ER NPC Levels" Google Sheet. **Display flavor only**, generated by
  `scripts/ingest-npc-display.mjs`. Not enemy absorb/resistance; the combat source is
  `public/sourced/npc-combat.json` + `src/lib/enemy.ts` (extracted `NpcParam`, above).
  See `docs/REVIEW.md`.

Medusa: chapter titles only. Do not paste walkthrough prose.
