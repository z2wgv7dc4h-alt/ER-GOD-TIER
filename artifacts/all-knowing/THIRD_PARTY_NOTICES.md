# Third-party notices

This project integrates or ports code and data from the following open-source projects. Each entry
lists the source, license, what was taken, and what was changed, per the project licensing policy
(`PROJECT_BRIEF.md`).

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
