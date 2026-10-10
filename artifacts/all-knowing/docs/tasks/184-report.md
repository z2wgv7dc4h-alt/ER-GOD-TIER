# Task 184 — Pictures for enemies, NPCs, graces, regions, merchants, quests

All-Knowing gained a second, local picture plane for the entity kinds the FanAPI
index (base-game only) never covered. Nothing in `src/lib/fanImage.ts` or
`src/lib/entityIndexBuild.ts` was touched (Task 182 owns those); the mapping
lives in a new file and is wired in through one new module.

## What changed

| File | Change |
|---|---|
| `src/data/image-index-extra.json` | **new** — 1,202 record ids / 969 names → local WebP paths (165 KB) |
| `src/lib/extraImages.ts` | **new** module: `extraImage(name, aliases)`, `extraImageById(id)`, `extraImageCount()` |
| `src/lib/extraImages.test.ts` | **new** test: per-kind floors, files on disk, no wrong enemy sharing |
| `scripts/build-image-index-extra.py` | **new** generator (items 2 + 3 and the merge) |
| `scripts/ingest-entity-images.py` | **new** (previous run) — item 1 wiki-dump downloader |
| `public/sourced/images/creatures/*.webp` | **new** — 276 enemy portraits (1.82 MB) |
| `public/sourced/images/npcs/*.webp` | **new** — 181 NPC portraits (1.51 MB) |
| `public/sourced/images/places/*.webp` | **new** — 283 grace/region map crops (4.40 MB) |
| `src/library/catalog.ts` | `iconForEntity` falls back: `fanImage(name, aliases) ?? extraImage(name, aliases)` |
| `src/library/LibraryBrowser.tsx` | `CategoryIcon` falls back: `fanImage(name) ?? extraImage(name)` |

**740 images, 7.73 MB** added (creatures 1.82 + npcs 1.51 + places 4.40).

### 1. Enemies + NPCs (wiki dump)
`scripts/ingest-entity-images.py` reads each page's infobox `image =`/gallery
file from `.scratch/er-mcp.db`, downloads it through the MediaWiki API (≤1 req/s,
descriptive UA, cached in `.scratch/184/`), resizes to 256px WebP and writes
`creatures/` / `npcs/`. Records that resolve to the same wiki page (variants)
share the base enemy's file; unresolved/no-image records stay empty. Examples:
`enemy:white-wolf → creatures/wolf.webp`, `npc:boc-s-mother → npcs/boc-s-mother.webp`.

### 2. Graces + regions (map crops)
The engine's tile pyramid is gitignored (docs/MAP-ENGINE.md: "Tiles are never
committed"), so the generator crops the plates the app actually ships
(`public/sourced/maps/m*.jpg`) at the record's `map.x`/`map.y` percent, choosing
the layer by `map.world` (overworld / underground / ashen / shadow). A square of
12% of the plate's short edge is resized to a 256px WebP into `places/`.
417 graces have coords (411 cropped; 6 with no world stay empty); only 13 regions
carry coords, the other 172 stay empty. Example:
`grace:100001 → places/margit-the-fell-omen.webp`.

### 3. Merchants + quests (owner portrait)
Each merchant/quest record takes its owning character's portrait: a merchant's
own name before the ` - <goods>` suffix (with `Merchant - X` → `Nomadic Merchant
(X)`), a quest step's NPC from its `related` names. Owner names are matched
against character records and the base index (accent/article-insensitive, exact
then unique prefix/suffix); services with no owner (`Alteration`, `Reversion`,
`Dragon Communion`) stay empty. Example: all `quest:boc:*` →
`npcs/17f69de1218l0i2olc1m799deyzbgj.webp`.

Cross-plane name collisions are pruned (4 dropped) so a place can never resolve
to a creature portrait or vice-versa — empty beats wrong.

## Before → after coverage (record.image, FanAPI index, or extra index)

| Kind | Before | After | |
|---|---|---|---|
| enemy | 28% (174/613) | **81.4%** (499/613) | +325 |
| npc | 32% (61/188) | **99.5%** (187/188) | +126 |
| grace | 34% (140/417) | **98.8%** (412/417) | +272 |
| region | 38% (112/295) | **41.7%** (123/295) | +11 (only 13 regions have coords) |
| merchant | 16% (13/80) | **96.2%** (77/80) | +64 |
| quest | 6% (27/467) | **92.3%** (431/467) | +404 |

Region coverage is measured per record id; the name plane additionally lets the
UI show the same-named grace's crop for 43 regions, so the runtime figure is
56.3% — see ASSUMPTIONS.

## Verification

- `npx vitest run src/lib/extraImages.test.ts` → **9 passed**.
- `npx vitest run` → **218 files, 1558 passed | 8 skipped**.
- `npx tsc -b` → clean (exit 0); `npm run lint` → exit 0 (pre-existing warnings only).
- `npm run test:bundle` → build + **7 passed** (bundle budget, no wiki data in JS;
  images stay static assets under `/sourced/**`).
- `npm run index:entities` → 5595 records, same by-kind counts; the parsed
  records are byte-for-byte equal to the committed index (verified in Python),
  the only textual change was key ordering, reverted to avoid churn.
- No wrong enemy sharing: 63 creature files are referenced by >1 enemy record;
  17 are wiki pages the wiki itself uses for several named creatures
  (`ram.webp` for Goat+Ram, `millicent-s-sisters.webp` for the five sisters,
  `mule.webp` for Mule+Donkey, …), allow-listed and named in the test; every
  other multi-name file is a genuine variant whose base name is a token-subset
  of its siblings. 0 unaccounted offenders.

## ASSUMPTIONS

- **Map source.** Used the committed static plates (`public/sourced/maps/m*.jpg`,
  the art the Atlas draws) rather than the engine tile pyramid, which is
  gitignored and absent on a fresh checkout. Layer = `map.world`
  (overworld/underground/ashen/shadow); a record with no coords or an unknown
  world stays empty.
- **Crop zoom.** Square crop side = 12% of the plate's short edge, resized to
  256×256 LANCZOS, WebP q82. The brief fixed only "256px centred on coords".
- **Region coverage.** Only 13 of 295 regions have `map` coords; the rest stay
  empty by the brief ("records without coords stay empty"). The name plane adds
  the 43 regions whose names match a cropped grace.
- **Owner matching.** "Owning NPC" is resolved by name (merchant name before the
  goods suffix; quest name splits + `related`), only against character records.
  Invaders/bosses that own quest steps (e.g. Bloody Finger Ravenmount Assassin)
  are included as characters; services and event rows with no owner stay empty.
- **17 documented shares.** Some wiki pages illustrate several named creatures
  with one image; the test allow-lists those paths rather than invent distinct
  art. This mirrors the existing `EXCEPTIONS`/`BOSS_EXCEPTIONS` style in
  `icons.test.ts`.
- **Download route.** The brief named `Special:FilePath`, but from here that
  endpoint 403s behind Cloudflare; `scripts/ingest-entity-images.py` asks the
  MediaWiki API for the File's `imageinfo` URL (the static.wikia URL
  `Special:FilePath` redirects to) and downloads it with a browser UA, still
  ≤1 req/s and cached under `.scratch/184/`.
- **Offline manifest.** `public/sourced/offline-manifest.json` was **not**
  regenerated: on this machine the engine tile tree is not extracted, and
  `npm run data:offline` would drop the 7,308 `/engine/**` entries the committed
  manifest holds (Task 159 notes it is environment-specific). Its generator walks
  `public/sourced/**`, so a full regeneration on a machine with `map:setup` picks
  up the 740 new images automatically. No test asserts manifest freshness.
- **UI scope.** Per the CHANGE note, only the two `fanImage(` call sites got the
  fallback; entity *pages* still read `record.image` and are expected to be
  filled by Task 182's on-disk-picture pass at index-build time.

## Not done / why

- Nothing from the brief was skipped.
- Did not merge `master` first (CHANGE note says to skip it and not edit
  `fanImage.ts` / `entityIndexBuild.ts`).
- Did not hand-edit any generated file; `image-index-extra.json` is produced by
  the new generator.

## Checklist

- [x] 1. Enemies + NPCs: wiki-dump infobox images downloaded, 256px WebP into `images/creatures/` + `images/npcs/`, mapped by page title/alias, variants share the base enemy.
- [x] 2. Graces + regions: 256px WebP map-plate crops centred on coords (right layer) into `images/places/`; records without coords stay empty.
- [x] 3. Merchants + quests: owning character's picture, empty when no owner resolves.
- [x] 4. Offline manifest and `npm run test:bundle` happy (images are static assets, not JS).
- [x] Test: per-kind coverage floors set to what was achieved, every referenced file exists, no enemy picture shared across different base enemies.
- [x] Report: before/after per kind and MB added (above).
- [x] CHANGE: mapping in `src/data/image-index-extra.json`; one new module `src/lib/extraImages.ts`; fallback added at the `fanImage(` call sites; coverage test reads both indexes; `fanImage.ts` and `entityIndexBuild.ts` untouched.

ALL ITEMS DONE
