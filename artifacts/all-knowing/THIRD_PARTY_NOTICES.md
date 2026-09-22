# Third-party notices

This project integrates or ports code and data from the following open-source projects. Each entry
lists the source, license, what was taken, and what was changed, per the project licensing policy
(`PROJECT_BRIEF.md`).

---

## FanAPI / deliton/eldenring-api — item, weapon, boss and location images

- **Source:** https://eldenring.fanapis.com — the hosted API and image CDN for
  https://github.com/deliton/eldenring-api
- **License:** the API's code and JSON are MIT. The image files are FromSoftware game art
  rehosted by the FanAPI; they are cached here for a personal, offline, non-commercial project.
- **Used by:** `public/sourced/images/`, `src/data/image-index.json`, `src/lib/fanImage.ts`, the
  Codex room.
- **What was taken:** 2,244 images (weapons, armors, talismans, sorceries, incantations, items,
  ashes, spirits, ammos, shields, classes, creatures, npcs, bosses, locations). The checklist
  dumps already in-repo carried the FanAPI `image` URL per row; the boss and location routes were
  fetched live. Every image was downscaled to a 160 px WebP thumbnail (~15 MB total) by
  `scripts/ingest-images.py`.
- **What was changed:** downscaled to 160 px and re-encoded as WebP; filenames normalised to the
  row id. No image content was otherwise altered.
- **Coverage:** base game only. The FanAPI predates Shadow of the Erdtree, so SotE / Tarnished
  Pack entries have no picture. A handful of base-game rows the FanAPI lacks are reported as
  misses rather than substituted.

---

## ThomasJClark/elden-ring-weapon-calculator

- **Source:** https://github.com/ThomasJClark/elden-ring-weapon-calculator
- **License:** MIT — Copyright (c) 2022 Tom Clark
- **Used by:** `src/lib/ar.ts`, `public/sourced/regulation-vanilla-v1.17.json`

### What was taken

- **Attack-rating formula/logic (ported to TypeScript in `src/lib/ar.ts`):**
  - `evaluateCalcCorrectGraph` — expands a `CalcCorrectGraph` stage table into a per-attribute-value
    scaling array.
  - `decodeRegulationData` — denormalizes the compact encoded regulation JSON into per-weapon
    objects (base attack and attribute scaling per upgrade level, attack-element-correct maps,
    calc-correct graphs).
  - `adjustAttributesForTwoHanding` — the ×1.5 Strength bonus when two-handing (skipped for paired
    weapons; forced on for bows/ballistae).
  - `getWeaponAttack` — the per-damage-type scaling sum, including the requirement-not-met penalty,
    and the rule that damage types use two-handed (adjusted) attributes while status effects use raw
    attributes.
  - Attack power totals and display rounding (`Math.floor(value + 1e-9)`) from the upstream UI.
- **Numeric regulation data (vendored verbatim):** `public/sourced/regulation-vanilla-v1.17.json` is
  upstream `public/regulation-vanilla-v1.17.js` (valid JSON) renamed to `.json`. It is the vanilla
  1.17 / Tarnished Pack patch line that `docs/REVIEW.md` names as this project's AR source of truth.
  It contains `calcCorrectGraphs`, `attackElementCorrects`, `reinforceTypes`, `statusSpEffectParams`,
  `scalingTiers`, and the weapon rows (base damage, scaling, requirements, upgrade rates).

### What was changed

- The formula was rewritten as standalone TypeScript with no React/MUI dependencies and typed
  against this project's `LoadoutSlot`/`Stats`. Only the vanilla path was kept; the upstream
  Reforged / Convergence / Clever's mod branches and their quirks were dropped.
- Added `findWeapon` (match a loadout slot by full unique name, then base name + affinity),
  `attackRatingForSlot`, `statsToAttributes`, `loadWeapons`, and `displayAttackRating`.
- `decodeRegulationData` in this port always adds `{ arc: true }` only to Poison/Bleed/Madness/Sleep
  status scaling; Scarlet Rot/Frost/Death Blight are left without arcane scaling, matching upstream
  vanilla behavior (upstream gates those three on the Reforged mod).
- Added explicit "unknown" results when a weapon has no vanilla 1.17 row (e.g. Tarnished Pack-only
  weapons), instead of guessing a number.
- The regulation data file was renamed from `.js` to `.json`; its contents are unmodified.

### MIT license text

```
Copyright (c) 2022 Tom Clark <tom@tclark.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## ERDB / ERExporter / SoulsFormats — NpcParam boss combat data

- **Sources:**
  - ERDB — https://github.com/EldenRingDatabase/erdb
  - ERExporter — https://github.com/EldenRingDatabase/ERExporter
  - SoulsFormats — https://github.com/JKAnderson/SoulsFormats
- **Licenses:** ERDB MIT — Copyright (c) 2021 Filip Tomaszewski. SoulsFormats MIT. ERExporter
  ships **no** LICENSE file; it was used as a build-time binary only and is not vendored or
  redistributed.
- **Used by:** `public/sourced/npc-combat.json`, `src/lib/enemy.ts`, and the Build lab's
  "what should I hit this with" panel.
- **What was taken:** the numeric `NpcParam` combat fields only — per-damage-type damage cut rates
  (negation), status resistances, poise and base HP — for the named bosses in
  `src/knowledge/catalog.ts`.
- **Extraction method (one-time, local, read-only against the game install):**
  1. Cloned ERDB into the gitignored `.scratch/erdb` and let it download its own `ERExporter.Param`
     tool (`erdb.utils.sourcer`).
  2. ERExporter 1.1.0's bundled 2022 SoulsFormats predates ZSTD-compressed DCX ("used in Elden Ring
     since the DLC release"), so the container was decoded with a small Python shim: AES-256-CBC
     decrypt with SoulsFormats' published `erRegulationKey`, DCX/ZSTD decompress to the BND4, then
     BND4 extract of `NpcParam.param`. This mirrors `SFUtil.DecryptERRegulation` and
     `DCX.DecompressDCXZSTD`; no SoulsFormats code is vendored.
  3. The extracted `.param` was parsed with soulstruct's maintained `NPC_PARAM_ST` paramdef
     (Grimrukh/soulstruct, GPL-3.0-or-later) — **build-time tool only; no soulstruct code is
     vendored or shipped** — because ERExporter's 2022 paramdef misaligns the post-DLC fields
     (`getSoul`/defence read as constants, and the real `*DamageCutRate` fields were missing).
  4. Row ids were joined to names from the existing `public/sourced/open/paramdex/NpcParam.txt`.
- **What was changed:** reduced to an 83-row boss subset keyed to catalog fact ids; damage cut
  rates converted to integer negation percentages. `baseHp` is the raw param value before the
  game's area/NG scaling, not the HP bar.

## Paramdex paramdefs + EldenRingMap erlib — regular enemy combat data (Task 22)

- **Sources:**
  - Paramdex — https://github.com/soulsmods/Paramdex (`ER/Defs/NpcParam.xml`)
  - EldenRingMap — https://github.com/egormagurin/EldenRingMap (vendored `tools/erlib`: regulation
    AES/DCX/BND4 reader, generic PARAM reader, MSB reader)
- **Licenses:** Paramdex is distributed as community param documentation (names/defs). EldenRingMap
  is MIT (see its own notice above / the vendored tree).
- **Used by:** `public/sourced/enemy-combat.json`, `src/lib/enemy.ts`, and the Build lab's
  "Matchup · NpcParam absorb" panel.
- **What was taken:** the numeric `NpcParam` combat fields only (base HP, `superArmorDurability`
  poise, per-damage-type `*DamageCutRate` negation, `resist_*` status), plus the MSB
  `PARTS_PARAM_ST` enemy `NPCParamID` per placement.
- **Extraction method (one-time, local, read-only against the game install):**
  1. `regulation.bin` decoded with the vendored `erlib` (public regulation AES key → DCX/ZSTD →
     BND4), then `NpcParam` rows read with Paramdex's maintained `NpcParam.xml` paramdef. The field
     mapping reproduces Task 17's `npc-combat.json` values for Malenia exactly.
  2. MSB files read from the game archives via `erlib.dvdbnd`; the enemy part's `NPCParamID` field
     was located by matching ints against the real NpcParam id set (entry +0x2ac, fallback +0x2a8),
     not guessed.
  3. Placements joined to the existing `public/sourced/open/msb-enemies.json` by `(map, name)`.
  4. Catalog bosses in `npc-combat.json` excluded, so the two tables partition the roster.
- **What was changed:** reduced to placed, non-boss enemies keyed `enemy:<npcRow>`; cut rates
  converted to integer negation percentages; placement counts/maps kept as provenance.
- **Build-time only:** no game files, paramdefs or erlib code are copied into the shipped app
  beyond the already-vendored EldenRingMap tree; only the derived JSON is committed.

## EldenRingMap V1.2 (Nexus Mods #10354)

- **Source:** Nexus Mods pack "EldenRingMap V1.2", by **CreateDDy**
- **License:** MIT — Copyright (c) 2026 CreateDDy (license file shipped in the pack)
- **What was taken:**
  - `DATA/scadutree_en.json` — Scadutree Fragment map pins (41 entries)
  - `DATA/golden_seeds_en.json` — Golden Seed map pins (42 unique entries)
  - `DATA/sacred_tears_en.json` — Sacred Tear map pins (12 entries; used to confirm the
    authored set, no new entries added)
- **What was changed:**
  - Entries merged into `src/knowledge/collectibles.ts`. Only pins not already covered by the
    authored checklist were added (region-level cross-reference against the pack's own
    `graces_en.json` anchors; +13 Scadutree, +35 Golden Seed). Each merged entry keeps the
    pack's raw map-space `x`/`y` pixel coordinates as a second reference frame.
  - Sacred Tears were confirmed to match 1:1 by count; nothing was duplicated.
- **Not taken:** the application itself (`launcher.exe`, `core/data.dat`, Qt UI) — it is a
  packaged desktop binary, not portable to the PWA.

## COMPLETE Resource Pack (Nexus Mods #960)

- **Source:** Nexus Mods pack "COMPLETE Resource Pack", Nexus ID 960
- **License / permission:** No license file is included in the pack. Redistribution permission
  for this asset pack was confirmed cleared by the project owner before any file was copied in.
- **What was taken:** 91 icon `.png` files plus the two `icon-atlas-*.png` sprite sheets,
  copied into `public/sourced/pack-icons/`. Only files whose exact filename was not already
  present in `pack-icons/` or `map-icons/` were copied; the 12 pre-existing files were left
  untouched.
- **What was changed:** Nothing — copied verbatim.
- **Not taken:** the two high-resolution map plates (`maps/m0-overworld.png`,
  `maps/m1-underground.png`). Those are handled separately (map tiling, Task 09).

## Elden Medusa (Nexus Mods #10286)

- **Source:** Nexus Mods pack "Elden Medusa (En)", by **Medusa**
- **License:** None stated; treated as proprietary / all rights reserved.
- **What was taken:** Chapter **titles only** — the six missing Act 9 (Shadow of the Erdtree)
  chapter names added to `src/knowledge/medusa.ts`.
- **What was changed:** The one-sentence `goal` for each chapter is an original summary written
  from general Shadow of the Erdtree knowledge, **not** a copy or edit of the pack's
  `mainGoal`, `summary`, or `lore` prose. No walkthrough prose is reproduced anywhere.

## elden-ring-compass (`@elden-ring-compass/save-parser-ts`) — reference only, NOT vendored

- **Source:** https://github.com/EthanShoeDev/elden-ring-compass
- **License: none found — all rights reserved.** There is no `LICENSE`/`COPYING` file in the
  repository, no `license` field in any `package.json`, and the GitHub API reports
  `"license": null`. An explicit permissive license could not be confirmed, so **no code was
  copied or vendored from this project.**
- **What was referenced (not copied):** the public save-format understanding — the `BND4`
  container, the fixed 10 × `0x280010` slot layout, the sequential little-endian `UserDataX`
  field order, the packed event-flag bitfield, and the `block → multiplier` flag-addressing
  formula. `src/lib/sl2/` is an original TypeScript implementation written from that format
  description.
- **Test fixture:** the repo's real `ER0000.sl2` fixture
  (`packages/save-parser/test/fixtures/`) was used locally, inside the gitignored `.scratch/`
  clone, to validate the parser against its frozen oracle. The fixture and oracle are **not
  committed** to this repo, and the tests skip when the clone is absent.

## ER-Save-Lib — event-flag addressing data

- **Source:** https://github.com/ClayAmore/ER-Save-Lib
- **License: none found** (GitHub API reports `"license": null`). It is the upstream source of
  the reverse-engineered save-format constants.
- **What was taken:** `src/data/event-flag-bst.json` — the event-flag
  `block → byte-offset multiplier` table (11,920 rows), reverse-engineered format data rather
  than creative code, used with the documented addressing formula
  (`byte = mult*125 + index/8`, `bit = 7 - index%8`) to read flags from the bitfield.
- **Derived game-fact tables (original joins against our own data):**
  - `src/data/grace-flags.json` — grace discovery flag ids, derived by matching our
    `public/sourced/checklists/graces.json` names to the reference grace table (412 of 418).
  - field-boss kill flags are read directly from our own
    `public/sourced/checklists/hunts.json` (BuLEEto checklist); the former
    `src/data/hunt-flags.json` projection was removed in Task 37 so it cannot drift.

## Local-install FMG / marker extraction (Task 27)

- **Source:** the user's own Elden Ring 1.17 (Tarnished Pack) install — **not** a third-party repo.
  No game files are redistributed; only derived name/id text and marker coordinates are committed
  or generated locally.
- **What was taken:**
  - `public/sourced/open/names.json` — item/NPC/place names, regenerated from the install's own
    `item.msgbnd.dcx` + `item_dlc02.msgbnd.dcx` message archives by `scripts/extract-fmg-names.py`
    (8,767 names; previously a 6,820-name base-game Text Explorer dump). The old Text Explorer
    (`EldenRingExplorer/EldenRingTextExplorer`) provenance is superseded by this local extraction.
  - `vendor/elden-ring-map/data/markers.json` (gitignored) — atlas markers, generated from the
    install's `regulation.bin` + DLC archives by the vendored EldenRingMap `tools/build_markers.py`.
  - `public/sourced/open/paramdex/EquipParamWeapon|Goods|Protector|Accessory|Gem.txt` — the
    equipment name files, topped up additively (missing ids only) from the install by
    `scripts/extract-paramdex-names.py`. For these params a row's display name is in an FMG table
    under the same numeric id (96-100% of rows), which is why they are locally recoverable.
- **What was changed:** names are emitted in this project's existing `{id, kind, name, info}` shape;
  DLC placeholder rows (`DLC dummy`) and `[ERROR]` prefixes are stripped. Nothing is written into
  the game directory (read-only).
- **Still external:** `public/sourced/open/paramdex/NpcParam.txt` (and the remaining Paramdex
  files) stay the upstream `soulsmods/Paramdex` ER/Names dump — post-SotE, pre-Tarnished-Pack. Its
  names are DSMapStudio-resolved, not an FMG row-id join, so it is not regenerated here.

## Cinzel + Source Sans 3 — self-hosted webfonts (Task 58)

- **Sources:** Google Fonts — Cinzel (Natanael Gama / NDISCOVER) and Source Sans 3 (Paul D. Hunt /
  Adobe), https://fonts.google.com.
- **License:** SIL Open Font License 1.1 (OFL-1.1). Only OFL families are shipped.
- **Used by:** `public/fonts/*.woff2`, declared via `@font-face` in `src/index.css`.
- **What was taken:** six woff2 files (latin + latin-ext) covering Cinzel 400/600/700 and Source
  Sans 3 400/500/600 plus italic 400. Both families are variable fonts, so one file per
  family/style/subset serves the weight range.
- **What was changed:** subset selection only — the woff2 are used verbatim and Google's
  `unicode-range` is preserved. There is no request to Google at runtime; the files are
  precached by the service worker (Task 58).

