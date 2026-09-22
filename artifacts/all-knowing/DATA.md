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
  install in Task 27 (see below), and the Paramdex equipment name files were topped up from it too.
  The one source still off-stamp is `open/paramdex/NpcParam.txt` (upstream soulsmods/Paramdex:
  post-SotE but predates the Tarnished Pack). `regulationAudit()` reports that remaining gap
  rather than hiding it.
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
     `erlib` reader (`scripts/erlib`), using Paramdex's maintained
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

### Blessing meters (Task 60)

`guide/catalog.json` carries the authoritative per-pickup lists for the two Shadow of the Erdtree
blessings — category `scadutree-fragment` (**50** rows) and `revered-spirit-ash` (**25** rows).
`src/lib/blessings.ts` turns those into the Codex meters. The authored `collectibles.ts` `frag:*`
entries are a partial map-pin layer (fewer pins, some worth x2/x5) and are not used for the totals,
so a part-collected run cannot show a false 100%. The **per-level threshold table is not in this
repo** (nor in any source already listed in `DATA.md` / `awesome.ts`), so the meters are count-only
and print `Lv —` rather than an invented level.

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
| `open/eldenringmap.json` | EldenRingMap Nexus V1.2 markers (source: `DATA/*_en.json`, engine frame `px/10496*100`): 350 graces, 64 dungeons, 19 merchants, 21 night bosses, and collectible positions (44 golden seeds, 12 sacred tears, 41 scadutree, 23 revered spirit ash). Ingested by `scripts/ingest-packs.py`; loaded by `src/lib/packs.ts`, surfaced in the Codex. |
| `open/ercl-items.json` | ER Checklist (Nexus 9953) item ids/names, 1.16 base + SotE (`mods/ercl/items.json`): 154 talismans, 129 incantations, 116 ashes of war, 104 cookbooks, 84 sorceries / spirit ashes, 50 gestures, 40 crystal tears, 6 whetblades — broader than the base-game FanAPI lists. `scripts/ingest-packs.py`; `src/lib/packs.ts`. |
| `sourced/npc-placements.json` | Where each **talking** NPC stands, from the map MSBs (`scripts/extract-npc-placements.py`): 1,370 placements across the 95 dialogue NPCs, projected to the engine pixel frame (1,356 rows carry `px`/`py`/`world` via the engine affine + `legacy-conv.json`; percent = `px/10496*100`). Enemy spawns are excluded. `src/lib/npcPlacements.ts`; Gideon "where is X" falls back to it; `npm run map:merge` folds it into the interactive engine's marker feed. |
| `open/medusa-route.json` | Elden Medusa (Nexus 10286) 100% walkthrough, text only (`data/en/act*/`): 9 acts, 32 chapters, 322 locations, 367 steps with directions + goal each. Ingested by `scripts/ingest-packs.py`; loaded by `src/lib/medusaRoute.ts`, surfaced in the Codex. |
| `open/text/` | **Full game text** (36 tables, 34,053 strings) dumped from the install's `menu`/`item` (+ `*_dlc02`) message bundles by `scripts/extract-game-text.py` — one JSON per table + `manifest.json`. Includes the verbatim NPC dialogue `TalkMsg` (9,818 lines, base + DLC merged), the talk-condition tables `EventTextForTalk`/`GR_Dialogues`, and every weapon/goods/armor/talisman/NPC/place name + lore caption. Loaded lazily by `src/lib/gameText.ts`; the Codex surfaces a verbatim dialogue search (`src/Dialogue.tsx`). Junk tables (ToS legal text, `BloodMsg` death spam, network/embedded-image names, placeholder magic) are excluded at extraction. |
| `open/dialogue-owners.json` | Speaker attribution for NPC talk. `scripts/extract-dialogue-owners.py` matches each ESD's `t<talkId>.esd` to the MSB PARTS entry carrying that **TalkID** (`+0x2b0`), reads its **NPCParamID** (`+0x2a8`), and names it from `NpcParam.txt` + the combat JSONs — the way the game itself resolves a talker. **Ceiling is inherent:** the ESD talk scripts reference only 2,129 of the 9,818 `TalkMsg` lines; 1,952 are named (95 speakers) and 177 sit in ESDs whose talker has no NpcParam row. The other 7,689 lines are not referenced by any talk script (menu/cutscene/UI), so they cannot be attributed this way — and nothing is guessed. `src/lib/dialogueOwners.ts` (`speakerLabel`). |
| `open/shops.json` | 1261 shop rows |
| `open/world-lots.json` | 10k lots + XYZ; `src/lib/chestFacts.ts` groups the 4018 treasure rows into 3401 chest/pickup facts |
| `open/boss-xyz.json` / `boss-pins.json` | 215 named bosses; 109 projected |
| `open/enemies.json` | 520 EN names |
| `open/msb-enemies.json` | 8.8k placed enemies — joined to `enemy-combat.json` for placement counts/maps |
| `open/gathering-nodes.json` | 21.8k AEG gathering-node placements (Goblins dump); model code only, no item/material field — `src/lib/gatheringNodes.ts` labels them honestly as generic placements, world resolved only for the two confirmed grids (area 60 → overworld, 61 → shadow), everything else buckets as `underground` unverified. **Task 62:** never drawn as Atlas pins and never answered by Gideon; Codex-only, labelled "unverified placement, model code only", guarded by `gatheringNodes.guard.test.ts` |
| `open/grace-xyz.json` | grace world positions + region names; nearest-region label for chest facts |
| `open/graces` via checklists/graces.json | 418 warps |
| `open/paramdex/` | Names txt dump; equipment files topped up from install (Tarnished Pack rows); `NpcParam.txt` still upstream (post-SotE) |
| `src/knowledge/merchants.ts` | 106 vendors full stock |
| `src/knowledge/bossPins.ts` | sync pin list for Gideon |
| `open/fanapi/*.json` | **Task 67/68** structured FanAPI reference (all 14 categories): `armors.json` (568 — poise, negation, resistance, weight), `talismans.json` (87 — effect), `spells.json` (169 — sorcery+incantation cost/slots/requires/effect), `ashes.json` (90 — skill/affinity), `spirits.json` (64 — FP/HP/effect), `items.json` (462 — type/effect), `locations.json` (177 — region), `creatures.json` (115 — location/drops), `bosses.json` (106 — region/location/HP/drops), `npcs.json` (55 — location/role), `ammos.json` (53 — type/passive), `classes.json` (14 — level/stats), `weapons.json` (307) + `shields.json` (69 — category/weight only). Produced by `scripts/ingest-fanapi.mjs` (deterministic, name-sorted); loaded by `src/lib/fanapiData.ts`, surfaced in the Codex. Structured fields only — no article bodies/images, and **no attack/defence numbers** (AR stays on the in-repo regulation data). Base-game only; FanAPI predates SotE. |

## Alias plane (generated)

- `public/sourced/aliases.json` + `src/data/aliases.json` — one generated table mapping engine
  row id (`grace:100000`, `bossflag:510010`, `npc:21300014`, `goods:8175`, …) → catalog slug →
  FMG name → aliases, across grace/boss/invader/hunt/item/quest/region. The two files are
  identical; the `public/` copy is the artifact of record, the `src/data/` copy is the
  synchronously imported one (`canonicalFactId` / `searchSync`). Regenerate with
  `node scripts/gen-aliases.mjs` from the game-derived dumps above; see `docs/ALIAS-PLANE.md`.
  Committed because it is name/id-only derived data, not shipped game art.
- **Task 55 completeness pass:** the generator also reads `checklists/hunts.json` (kind `hunt`) and
  maps every `BonfireWarpParam` row to an authored **catalog** grace when no `graces.ts` seed exists
  (`grace:120208` → `grace:night-sacred-ground`). Strict parenthetical-preserving matching makes
  `goods:8175/8176` resolve to `item:haligtree-medallion-left/-right`.
- **Task 73 warp stubs:** every remaining warp gets a name-derived `grace:{slug}` alias row
  (`source: 'grace-stub'`) — no catalog fact, no pin, no implications — and an authored id still
  wins on a collision. Output is now **1273 rows / ~274 KB**; **unmatched warps 360 → 0**, bosses
  79/215. Engine-backed by catalog prefix: grace 25/25, boss 87/88, item 89/91, invader 22/24. Run
  twice = byte-identical (the `docs/ALIAS-PLANE.md` table is the live snapshot).
  `searchSync("church of elleh")` / `("elleh")` both hit `grace:elleh`; 10k lot ids are not put in
  `searchSync`.

## Checklists

FanAPI JSON (weapons, armors, spells, …) + `hunts.json` (207 flags) + `graces.json`.

`public/sourced/open/fanapi/*.json` is the Task 67/68 structured FanAPI reference (armors, weapons,
shields, items, talismans, spells, ashes, spirits, bosses, creatures, locations, npcs, ammos,
classes); refresh with `node scripts/ingest-fanapi.mjs` (deterministic, name-sorted). The
`checklists/` files below are the name lists.

`public/sourced/checklists/hunts.json` is the single canonical field-hunt dataset (BuLEEto):
Codex fetches it, `src/knowledge/completion.ts` derives `fieldHunts` from it, and
`src/lib/sl2/facts.ts` reads its flags directly. There is no separate `hunt-flags.json` copy
(deleted in Task 37 — it could drift). See `docs/research/hunt-data-cleanup.md`.

## Item / boss images (generated)

- `public/sourced/images/<category>/<id>.webp` — 2,244 FanAPI thumbnails (160 px WebP,
  ~15 MB) for weapons, armors, talismans, sorceries, incantations, items, ashes, spirits,
  ammos, shields, classes, creatures, npcs, bosses and locations. The checklist rows already
  carried a FanAPI `image` URL; bosses/locations are fetched from the API. Produced by
  `python3 scripts/ingest-images.py`.
- `src/data/image-index.json` — normalised name → local thumbnail path (~2.1k names). Imported
  synchronously by `src/lib/fanImage.ts`; the Codex renders these pictures on guide, loot,
  collectible, armory and hunt cards. No Codex render hits the network.
- **Coverage is base-game only.** The FanAPI predates Shadow of the Erdtree: base-game guide
  items resolve 1,480/2,009 (74%), overall 1,487/2,490 (60%), DLC 7/481 (1.5%); armory weapons
  300/307 base (DLC weapons are the misses); catalog item/boss facts 119/170 base, 0/14 SotE.
  A handful of base-game rows the FanAPI lacks (Margit, Rennala, Morgott, most Great Runes, most
  invaders) fall back to the category glyph. Reported honestly, not guessed. See
  `THIRD_PARTY_NOTICES.md` for source and licence.

## Authored (small, keep)

`src/knowledge/{catalog,endings,storylines,loot,builds,collectibles,completion,gates,inferChains,missables,dungeons,npcLocations}.ts`

- `dungeons.ts` — the Stormveil checklist (Task 80): 8 beats on the three Stormveil-region graces,
  rendered by `src/Dungeon.tsx`; ticking goes through `applyFacts` / `clearFact`.
- `npcLocations.ts` — 8 companions × staged `{ graceId, whenFacts }` rows (Task 79); every grace id
  is validated against warps ∪ catalog ∪ aliases, invalid rows are skipped and reported.
- Lib helpers alongside: `src/lib/{beatPins,regionLeftovers,gideonHeader,coop}.ts` (Tasks
  75/72/78/81).

## Self-hosted fonts (Task 58)

`public/fonts/*.woff2` — 6 files (~173 KB): Cinzel and Source Sans 3, both SIL OFL 1.1, latin +
latin-ext subsets. Both families ship as variable fonts, so one file per family/style/subset
(`cinzel-normal-latin`, `source-sans-3-normal-latin`, `source-sans-3-italic-latin-ext`, …) serves
the weights declared in `src/index.css` (`@font-face`, `font-display: swap`). No runtime request to
Google; the service worker precaches the woff2 via `globPatterns`. Attribution in
`THIRD_PARTY_NOTICES.md`.

## Cosmetic display (not combat)

- `src/knowledge/npc-display.ts` — player-model NPC level/stat allocation from the EanNewton
  "ER NPC Levels" Google Sheet. **Display flavor only**, generated by
  `scripts/ingest-npc-display.mjs`. Not enemy absorb/resistance; the combat source is
  `public/sourced/npc-combat.json` + `src/lib/enemy.ts` (extracted `NpcParam`, above).
See `docs/REVIEW.md`.

## Gates + wiki-grade lines (Tasks 52–53)

- `src/knowledge/gates.ts` — ten authored world-state gates (Forge, Maliketh, Sealing Tree,
  Ranni / frenzy / dung-eater ending commits, Seluvis potion, Volcano Manor, Millicent's Elphael
  fork, Varré). Not extracted data: each gate is authored from `missables.ts`,
  `guide/missables.json`, storyline `lockouts`, and facts already in `catalog.ts`. The Forge's
  only trigger is `quest:erdtree-burned`; the Fire Giant kill / Forge grace are one-beat-away
  signals, since killing him does not burn the tree.
- `src/lib/gatePins.ts` — binds approaching gates' locks onto the Atlas plate using only the two
  existing frames (loot→grace, `coords.json`). Unplaced locks are listed in the side panel.
- Task 53 added 54 authored catalog facts (49 `quest:` state ids across the eight lines, plus
  Seedbed Curse, Drawing-Room Key, Iris of Grace, Iris of Occultation, `boss:metyr`); catalog row
  count 226 → 286. These are quest state, not extracted `regulation.bin` flags — no event flag id
  is invented. `src/knowledge/storylines.test.ts` carries the Task 53 golden fixture.

## Inference chains (Task 54)

- `src/knowledge/inferChains.ts` — an authored `{ whenFact, implies, allOf?, unless?, confidence,
  why }` table expressing the honest implications a named read may draw ("you hold X, so Y is
  already true"). Applied **through** `closeWorld`/`applyFacts` (not a second closer): every
  derived id is recorded as `source: 'inference'`, so a save flag or an explicit deny still wins
  (Task 24). Simple edges already in `catalog.implies` are mirrored here so Gideon can say
  "inferred X because you have Y".
- Seeds: Fingerslayer → Ranni Nokron beat; each Great Rune → its own boss only; Black Knifeprint →
  Rogier's beat; Pureblood Medal → Varré cloth; Mimic Tear Ashes → Mimic Tear; Black Whetblade →
  Night's Sacred Ground; Twinned set → `quest:fia:dagger`; the two Haligtree medallion halves →
  the whole only when **both** are known (`allOf`).
- The three item rows that had no catalog fact were added from `open/names.json`
  (`item:mimic-tear-ashes`, `item:haligtree-medallion-left`, `item:haligtree-medallion-right`);
  `item:black-whetblade` and `item:twinned-armor` were corrected so they no longer imply
  `boss:radahn` / `quest:d:brother`.
- Reckon exposes a read's freshly inferred extras as an "Also marked" list with per-row undo.
  Low-confidence OCR still produces zero facts; fog on a map shot is unknown, never false.

## Loot table grounding (Task 70)

- `loot:golden-vow`'s `grace` field was removed: `grace:ergtree-grazing` is a misspelling of the
  game's "Erdtree-Gazing Hill", and every `grace` on a loot row must already exist in `graces.ts`,
  `catalog.ts` or the alias plane. The one remaining stray row, `loot:poleblade`, named two weapons
  ("Loretta's War Sickle / Ensis"); it is now two rows (`loot:rellanas-twin-blades`,
  `loot:lorettas-war-sickle`), each an English name present in `open/names.json` (nothing else
  referenced the old id).
- `buildHunt` resolves every `need[]` id across the 44 OP + PvP builds (82 distinct ids, 0
  unresolved). `src/knowledge/loot.test.ts` guards the no-typo-grace, single-weapon-name and
  names.json-grounding invariants.

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
