# Task 154 — Every item and boss has an icon

Follow AGENTS.md. Branch `task-154`. Downloading images from the web IS allowed for step 3 only.

Today (record.image OR runtime match in `src/data/image-index.json`, see `src/lib/fanImage.ts`):
weapon 306/441, shield 69/69, armor 549/751, talisman 87/158, spell 170/218, ash 124→77, spirit 64/80,
item 538/1187, boss 233/280. Target: 100% for weapon, shield, armor, talisman, spell, ash, spirit, item
(except cut/unused records with no game icon — list them) and every boss.

## 1. Item icons from the game install (source of truth, covers DLC)
- Each equip param row has an icon id: `EquipParamWeapon.iconId`, `EquipParamProtector.iconIdM`
  (and `iconIdF`), `EquipParamAccessory.iconId`, `EquipParamGoods.iconId`, `EquipParamGem.iconId`
  (check names in `vendor/elden-ring-map/data/paramdefs/*.xml`; download the missing paramdefs from
  `https://raw.githubusercontent.com/soulsmods/Paramdex/master/ER/Defs/<Name>.xml` like Task 145 did,
  and check row size vs the install before trusting offsets).
- Icons live in the game's packed menu archives (e.g. `menu/hi/00_solo.tpfbdt`/`.tpfbhd` or
  `menu/hi/01_common.*`, names like `MENU_ItemIcon_<5-digit id>`/`MENU_Knowledge_<id>`). Use
  `scripts/erlib` (`dvdbnd`, `bnd4`, `dcx`, `tpf`) to list and read them — find the right archive by
  listing names first; print counts, not whole listings.
- New script `scripts/extract-item-icons.py` (stdlib + erlib + Pillow; read-only on the install; refuse
  if `ER_MOD_DIR` set): decode each needed DDS with Pillow, write 128px WebP (quality 80) to
  `public/sourced/images/game-icons/<iconId>.webp`, and `public/sourced/open/item-icons.json`
  `{ "<item name exactly as the game text table>": <iconId> }` built from the param row → name tables
  (`public/sourced/open/text/*Name.json`, same item id). Only icons actually used by named items.
  Print count written + total size. Keep total size reasonable (report it; target < 25 MB).
- If Pillow cannot decode the DDS format (e.g. BC7), STOP and report the format — do not guess.

## 2. Wire it in
- `src/lib/entityIndexBuild.ts`: for item-like kinds (weapon, shield, armor, talisman, spell, ash,
  spirit, item, material, ammo) with no picture, set `record.image = '/sourced/images/game-icons/<id>.webp'`
  by exact game name (then by alias/canonical name). Do NOT replace existing pictures.
- Make sure `public/sourced/images/game-icons/**` is covered by the offline manifest
  (`npm run data:offline`) the same way the other images are.

## 3. Bosses
- Boss records have no game icon. For bosses without a picture:
  a) per-location encounter pages (`id` contains `--`, have `group`) use their group's/base boss picture;
  b) remaining: use the boss image URL from on-disk data (`public/sourced/open/bosses-fextralife.json`,
     wiki-db `boss.json`, `.scratch/er-mcp.db` page infobox `image =` field → Fandom file URL via
     `https://eldenring.fandom.com/wiki/Special:FilePath/<file>`), download, resize to 256px WebP into
     `public/sourced/images/bosses/`, and add to `src/data/image-index.json` via
     `scripts/ingest-images.py` conventions (or set record.image). Max 1 request/second.
  c) still none: list them in the report (do not use a wrong picture).

## 4. Tests + finish
New `src/lib/icons.test.ts`: per kind above, ≥ 98% have a picture (record.image or image-index match),
and every boss has one, except an explicit allow-list of named exceptions in the test. Each referenced
`/sourced/images/...` file exists on disk.
While working: only that test + `npx tsc -b`. At the end ONCE: `npm run index:entities`,
`npm run data:offline`, full `npx vitest run`, `npm run lint`, `npm run build`, `npm run test:bundle`.
Commit per step. Report `docs/tasks/154-report.md` (print it): coverage before/after per kind, files and
MB added, exceptions with reasons, ASSUMPTIONS.
