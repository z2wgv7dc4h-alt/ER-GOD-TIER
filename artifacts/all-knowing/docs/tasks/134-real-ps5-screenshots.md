# Task 134 — Make screenshot reading work on REAL PS5 captures

The user sent the first real captures (`src/lib/__fixtures__/ps5/*.jpg`, ground truth in `ground-truth.json`).
They are **phone photos of a TV**: perspective skew, glare, moire, softness, right edge cropped. This is how PS5
players will actually feed the app, so it must work on these.

Read the existing pipeline first: `src/lib/ocr.ts`, `src/lib/equipmentOcr.ts`, `src/lib/museVision.ts`,
`src/Reckon.tsx`, `src/shell/MeSetup.tsx` + `src/lib/setupWizard.ts`, `src/lib/shotKinds.ts`.

## 1. Status screen (`status-photo-01.jpg`)
- Robust preprocessing for photos: grayscale, contrast/CLAHE-style normalisation, deskew/perspective correction
  (detect the menu's horizontal rules/columns), upscale for OCR.
- **Label-anchored extraction**, not fixed coordinates: find "Level", "Runes Held", "Runes Needed", "Vigor",
  "Mind", "Endurance", "Strength", "Dexterity", "Intelligence", "Faith", "Arcane" (fuzzy), then read the number on
  the same row to the right. Also the character name under "Status".
- Validate: stats in 1–99, level 1–713, **level ≈ sum(stats) − 79**.
- **Talisman bonus correction (real bug found)**: the Status screen shows stats *including* equipped talisman /
  gear bonuses. When sum − 79 ≠ Level, compute the delta per stat and match it against known stat-boost gear
  (Radagon's Soreseal +5 Vig/End/Str/Dex, Marika's Soreseal +5 Mind/Int/Fai/Arc, Starscourge Heirloom +5 Str,
  Stargazer Heirloom +5 Int, Prosthesis-Wearer Heirloom +5 Dex, Two Fingers Heirloom +5 Fai, Millicent's
  Prosthesis +5 Dex, Radagon Icon? (no), Godrick's/Great Runes when activated, Crimson/Blue Seed? no — use the
  real stat-boost list from the data: talismans + helmets like Silver Tear Mask +8 Arc, Imp Head (Cat) etc. +
  activated Great Runes (Godrick's +5 all)). Store **base stats** on the character (and the detected source), show
  the user "Showing base stats — your Status screen includes +5 Vig/End/Str/Dex from Radagon's Soreseal". Fix the
  Task 107 level-mismatch warning to account for this (it currently would warn falsely). The expected result for
  the fixture is in `ground-truth.json` (`expectedBaseStats`, `inferredTalisman`).
- Store runes held on the character (new optional field) — feeds the level-up calculator.

## 2. Equipment screen (`equipment-photo-01.jpg`)
- Read the header: slot label ("Right Hand Armament 1") + item line ("Blood Reed Great Katana+14") → parse
  affinity prefix (Heavy/Keen/Quality/Fire/Flame Art/Lightning/Sacred/Magic/Cold/Poison/Blood/Occult), base
  weapon (fuzzy-match to the catalogue incl. DLC), upgrade level. Right panel: skill name (Lion's Claw), weapon
  type. Put it into `loadout` for that slot.
- **Icon matching for the grid** (big win: one photo = whole loadout): detect the slot grid (5 columns, rows:
  armaments, armaments/ammo, armor ×4, talismans ×4, quick items, pouch), crop each cell, and match against the
  item icon images already in the repo (`public/sourced/images`, `pack-icons`, `image-index.json`) with a
  lightweight perceptual hash / normalised cross-correlation on downscaled grayscale + edge maps, restricted to
  the slot's item class. Return top-3 candidates with confidence; the Setup UI shows them for one-tap
  confirmation. Read the stack counts (25, 36, 70, 99, 10, 2, 30, 13) with OCR.
- Honest confidence: never auto-apply low-confidence matches.

## 3. Tests + eval
- Fixture tests run the pipeline on both photos in Node (tesseract.js already a dep — check how tests can run it
  headless; if WASM OCR is too slow for CI, mark those tests `slow` but runnable via `npm run test:ocr`) and
  compare with `ground-truth.json`: all Status numbers exact; base stats + talisman inference exact; equipment
  header parsed exactly; grid counts ≥ 6/9 correct; icon matches reported (accuracy printed, not yet gated).
- Add `docs/PS5-CAPTURE-TIPS.md` + a short in-app tip on the Setup screenshot steps for **phone photos of the TV**
  (the only supported capture method — do NOT suggest the PS App / Share button): hold the phone straight-on,
  fill the frame with the menu, avoid lamp glare, tap to focus.

NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; commit after each section.
Report: extracted values vs ground truth for both fixtures, icon-match accuracy, timings.

## 4. Inventory pages (5 more fixtures added mid-task: `inventory-*.jpg`)
Inventory pages print ONLY the highlighted item's name; every other cell is an icon + optional stack count. Read:
the tab title (Ashes / Bolstering Materials / Key Items / Sorceries / Ashes of War / …) → item category; the
highlighted item name (list header, cross-checked with the right-panel title); the cell grid (count cells, read stack
counts in reading order); and identify every cell by **icon matching restricted to that category** (top-3 +
confidence, never auto-apply low confidence). Use the red ✗ "cannot use" badge / red requirement numbers as a
cross-check against the character's stats. Owned items found this way go into `collectedItems` (after the
confirmation step). Ground truth is in `ground-truth.json`; tests assert tab, selected name, cell count and counts
order; icon accuracy is printed.

## 5. Picker + crafting pages (fixtures `equipment-talisman-list-01.jpg`, `crafting-all-items-01.jpg`)
- **Equipment slot picker** (e.g. "Talisman 1" → list): shows EVERY owned item of that slot's class, with a small
  crossed-swords badge on equipped cells. One photo = the full owned talisman (or armor/weapon) set + which are
  equipped. Detect the badge; identify cells by icon matching restricted to the slot class.
- **Item Crafting** list: only unlocked recipes appear, so craftable items → owned cookbooks (via `recipes.json`
  recipe → cookbook). Add inferred cookbooks as facts with source "crafting screenshot" and reason.
Tests assert selected names, cell counts and badge positions from `ground-truth.json`.
