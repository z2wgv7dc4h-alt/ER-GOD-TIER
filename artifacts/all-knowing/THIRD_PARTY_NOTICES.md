# Third-party notices

Per the project licensing policy (`PROJECT_BRIEF.md`): every vendored dataset, ported
algorithm, or adapted component is recorded here with its source, license, what was taken,
and what was changed. Only MIT / Apache-2.0 / BSD-licensed material is integrated.

---

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
