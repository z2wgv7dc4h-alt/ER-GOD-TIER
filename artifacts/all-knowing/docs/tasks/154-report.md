# Task 154 report — every item and boss has an icon

## What changed

### 1. Item icons from the game install (source of truth, DLC included)
- New `scripts/erlib/bxf4.py` — reader for the split `BHF4`/`BDF4` menu archive
  (`menu/hi/00_solo.tpfbhd` + `.tpfbdt`), the format Elden Ring stores its
  `MENU_Knowledge_<id>.tpf.dcx` menu textures in.
- New `scripts/extract-item-icons.py` — joins `EquipParamWeapon.iconId`,
  `EquipParamProtector.iconIdM/iconIdF`, `EquipParamAccessory.iconId`,
  `EquipParamGoods.iconId` and `EquipParamGem.iconId` (spells are the
  `EquipParamGoods` rows) to the `*Name` FMG tables by the shared row id, decodes
  only the icons a named item uses, and writes:
  - `public/sourced/images/game-icons/<iconId>.webp` — **2634 icons, 14.17 MB**
    (128px, WebP q80), plus
  - `public/sourced/open/item-icons.json` — 6501 name -> icon-id entries.
  Row sizes matched the Paramdex defs exactly (`664/416/96/176/96` bytes), so the
  field offsets are trusted. Four referenced icon ids have no texture in the
  archive (cut armour: `1097 Head`, `1098 Body`, `1099 Arms`, `14520 Grass Hair
  Ornament`); they are skipped.
- Downloaded the five missing Paramdex defs (`EquipParamWeapon/Protector/
  Accessory/Goods/Gem.xml`) into `vendor/elden-ring-map/data/paramdefs/`, like
  Task 145.

### 2. Wiring
`src/lib/entityIndexBuild.ts` now loads `item-icons.json` and, in `fillGameIcons()`,
sets `record.image = '/sourced/images/game-icons/<id>.webp'` for any
weapon/shield/armor/talisman/spell/ash/spirit/item/material/ammo record with no
picture. Lookup is by the exact game name (normalised), then the base form
(parentheticals/brackets stripped, `Ash of War:`/`Skill:` prefixes removed), then
any alias from the alias plane. Existing pictures are never replaced. It filled
**1256** records.

`public/sourced/images/game-icons/**` is walked automatically by
`npm run data:offline`, so it is in the offline manifest like the other images.

### 3. Bosses
- New `scripts/ingest-boss-images.py` — for each base boss record still without a
  picture it resolves the Fandom page from `.scratch/er-mcp.db` (exact title,
  then redirect/normalised), reads the infobox `image =` file, resolves the real
  `static.wikia` URL through the MediaWiki API, downloads at ≤1 request/second
  and writes a 256px WebP. 46 portraits.
- New `public/sourced/open/boss-images.json` (name -> path) consumed by
  `fillBossImages()` in the builder, before the existing per-location encounter
  inheritance, so all 96 `--` encounter pages inherit their group's portrait.
- New files in `public/sourced/images/bosses/` and 46 entries in
  `src/data/image-index.json` (ingest-images.py key form).

## Coverage before → after (record.image OR image-index match)

| kind | before | after | after, exceptions excluded |
| --- | --- | --- | --- |
| weapon | 306/441 | 422/441 (95.7%) | 422/422 (100%) |
| shield | 69/69 | 69/69 (100%) | 100% |
| armor | 549/751 | 748/751 (99.6%) | 748/748 (100%) |
| talisman | 87/158 | 155/158 (98.1%) | 155/155 (100%) |
| spell | 170/218 | 217/218 (99.5%) | 217/217 (100%) |
| ash | 124→77 | 124/124 (100%) | 100% |
| spirit | 64/80 | 80/80 (100%) | 100% |
| item | 538/1187 | 1151/1187 (97.0%) | 1151/1151 (100%) |
| material | — | 3/3 (100%) | 100% |
| boss | 233/280 | 279/280 (99.6%) | 279/279 (100%) |

## Exceptions (no game icon exists) — listed in `src/lib/icons.test.ts`

- **Cut/unused content** (flagged `cut` in the index, or an FMG-only name with no
  param row): the 17 “Heavy/Occult/…” weapon variants and Tarnished-Pack
  weapons; `Grass Hair Ornament`, `Tarnished Wrap`, `Scarab`; the three
  placeholder talismans (`Elden Ring Talisman Template`, `Broken Finger Stalker
  Contract`, `Petition for Help`); and 27 item records (`Asimi*`, `Carrier
  Pigeon Letter [1/2]`, `Cord End`, `Fetal Position`, `Fetid Flesh`, `Glinstone
  Scrap`, `The Carian Oath`, `Vision of Grace`, …). None has a param row/icon.
- **No icon by design**: `Unarmed` (`iconId = 0` in `EquipParamWeapon`).
- **Spelling variant**: `Giant's Flame Take Thee` — the game row is
  `Giantsflame Take Thee` (icon `6204`); kept as-is rather than rename a record.
- **Boss**: `Scadutree Avatar` — its Fandom page only illustrates the fight with
  the Remembrance item icon, so no boss art was downloaded (no wrong picture).

## Files / size added

- `public/sourced/images/game-icons/**` — 2634 WebP, **14.17 MB**
- `public/sourced/images/bosses/**` — 46 new WebP, ~0.39 MB added (dir 0.68 MB)
- `public/sourced/open/item-icons.json` — 190 KB
- `public/sourced/open/boss-images.json` — 3.5 KB
- `vendor/elden-ring-map/data/paramdefs/*.xml` — 5 new defs
- `src/lib/entityIndexBuild.ts`, `scripts/erlib/bxf4.py`,
  `scripts/extract-item-icons.py`, `scripts/ingest-boss-images.py`,
  `src/lib/icons.test.ts`, regenerated `src/data/image-index.json`,
  `public/sourced/entity-index.json`, `public/sourced/offline-manifest.json`.

## Checks (run once, all green)

`npm run index:entities` · `npm run data:offline` · `npx vitest run` (200 files,
1436 passed / 11 skipped) · `npm run lint` · `npm run build` ·
`npm run test:bundle`. New `src/lib/icons.test.ts` passes.

## ASSUMPTIONS

- Spells take their icon from `EquipParamGoods`, not `Magic` (`Magic.iconId` is 0
  for almost every row); `GemName`'s `Ash of War:` prefix is stripped so an As of
  War resolves under the bare art name the Library uses.
- `EquipParamProtector` uses `iconIdM`, falling back to `iconIdF`.
- A record already carrying a FanAPI URL counts as “has a picture” (the brief’s
  before-number metric), so those were left untouched.
- The image index keeps the ingest-images.py key form; boss lookups in the
  builder go through the same `iconKeys` helper.
- Boss `Special:FilePath` is 403 from this network, so portraits are fetched from
  the `static.wikia` URL returned by the MediaWiki API using `curl` with a
  browser UA + Fandom referer.

## Not done / notes

- `Scadutree Avatar` and the cut/unused records above are the only “no picture”
  cases; they are explicit, asserted exceptions rather than guessed art.
- Hosting/redistribution of extracted game assets is unchanged from the existing
  FanAPI thumbnails (extracted locally, never fetched at runtime).
