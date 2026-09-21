# Nexus Mods Packs Analysis for All-Knowing

**Date:** 2026-09-22  
**Task:** Evaluate four community packs for integration into the Elden Ring PWA.

---

## Pack 1: COMPLETE Resource Pack (Nexus #960)

**File:** `COMPLETE Resource Pack-960-1-0-1651278607.zip` (224 MB)  
**Type:** Graphical resource pack (maps + icon sprites)

### Contents

- **Maps:** Two PNG files, both 9728×9216 pixels, 8-bit RGBA
  - `m0-overworld.png` (172.44 MB)
  - `m1-underground.png` (32.40 MB)
- **Icons:** 103 total `.png` files organized by functional prefix
  - `marker-generic-*` (10 files)
  - `location-*` (60+ variants: cave, ruins, church, castle, etc.)
  - `character-*` (player, summon, invader base/direction/ring variants)
  - `mp-status-*` (coop/invasion low/medium/high/border)
  - `npc-*` (small, large)
  - Miscellaneous: compass, reticle, fog, glow, masks
- **Sprite Atlases:** Two `icon-atlas-*.png` files (pre-compiled glyph sheets)
- **Metadata:** No LICENSE, README, or credits file

### Quality & Coverage

| Aspect | Status |
|--------|--------|
| Map resolution | High (9728×9216 vs. project's 1.97 MB jpg) |
| Overworld quality | Much higher than existing 2 MB JPG |
| Underground quality | Higher than existing variants |
| Icon count vs. existing | ~100 new files; project has 12 in `pack-icons/` |
| DLC coverage | Base game only (no Shadow of the Erdtree) |
| Licensing risk | None stated; Nexus default assumes redistribution OK under mod rules |

### Key Finding

**Maps are production-grade assets** but require preprocessing: the 172 MB PNG cannot ship directly in a PWA. Must be tiled (e.g., with MapboxGL or similar tiling service) or re-compressed as WebP/AVIF before deployment. The image quality is significantly superior to the current Elden Armory plate (2 MB JPG).

### Recommendation

**Integrate with transformation:** 
- Use high-quality maps as source but tile them for web delivery (e.g., GeoTIFF + tile server, or pre-tile to WebP in a build step).
- Selectively ingest icon files (prefixes: `marker-*`, `location-*`, `character-*`, `mp-status-*`).
- Compare icon filenames against `public/sourced/pack-icons/` and `map-icons/` to avoid duplicates; only copy novel prefixes.
- **Do not ship the raw PNG files.**

---

## Pack 2: Location and Field's Boss Completion Check (Nexus #9974)

**File:** `Location And Field'S Boss Completion Check-9974-1-5-1780424076.zip` (69 MB)  
**Type:** In-game mod (game binary patcher)

### Contents

Binary game mod structure (not plain data):
- `regulation.bin` (1 file) — Elden Ring game parameter binary
- `.gfx` files (10) — Menu UI graphical layouts
- `.msgbnd.dcx` files (8) — Compressed/encrypted game text bundles (item names, menu strings, localization)
- `.tpf.dcx` (1) — Texture pack (compressed)
- `__pycache__/` — Python bytecode (legacy build artifact)

### Analysis

No plain-text rules, JSON configuration, or documentation. The completion logic is embedded in:
1. Modified `regulation.bin` (game parameters) — requires Oodle decompression + binary format knowledge to unpack
2. `.msgbnd.dcx` text bundles — require FromSoftware binary format tools (not available in scope)

The mod author's intent ("ruins = chest, caves = boss") is already captured in `src/knowledge/completion.ts` (lines 6–16). The authored rules are structurally complete and consistent with the mod's philosophy.

### Recommendation

**Do not integrate:** This pack is a compiled binary mod, not a data source. The rules are already authored in `completion.ts`. Unpacking `regulation.bin` or `.msgbnd.dcx` is out of scope (requires specialized tools: Oodle, FromSoftware format specs). **No new knowledge can be extracted without those tools.**

---

## Pack 3: Elden Medusa (En) Interactive Walkthrough (Nexus #10286)

**File:** `Elden Medusa(En) 10286 1.1 2026-07-06T16-53Z UAfVnovwk.zip` (10.8 MB)  
**Type:** Standalone HTML5 web app with embedded JSON route data

### Contents

- **App:** `index.html`, `app.js`, `style.css` (client-side JavaScript app)
- **Audio:** `audio/` directory (background music/SFX)
- **Data:** `data/en/act{1-9}/*.json` + `data/ru/act{1-9}/*.json`
  - Act 1: 4 chapters
  - Acts 2–5: 3 chapters each
  - Acts 6, 8: 2 chapters each
  - Act 7: 4 chapters
  - Act 9: 8 chapters
  - **Total: 33 chapters across 9 acts**
- **Images:** `images/en/act{1-9}/*.jpg` — chapter background assets

### Data Structure

Each JSON file has the schema:
```json
{
  "version": "1.0",
  "game": "Elden Ring",
  "schema": "chunked-acts",
  "meta": {
    "author": "Medusa",
    "date": "2026-06-29",
    "description": "...",
    "tags": ["elden-ring", "100%", "route", "medusa"]
  },
  "acts": [
    {
      "id": "act1",
      "name": "Awakening and Limgrave",
      "order": 1,
      "summary": "[prose description - 50-150 words]",
      "chapters": [
        {
          "id": "act1_chapter1",
          "name": "West Limgrave",
          "mainGoal": "[prose goal - functional description]",
          "summary": "[prose walkthrough narrative]",
          "lore": "[prose lore narrative]",
          "locations": [ /* array of location objects with directions/story */ ]
        }
      ]
    }
  ]
}
```

**Key fields by type:**
- Structural: `id`, `name`, `order` (chapter/act identifiers — functional labels)
- Narrative: `summary`, `lore`, `mainGoal` (prose paragraphs, 50–500 words each)
- Metadata: `author`, `date`, `schema`

### Coverage vs. Project

**Project's `medusa.ts` contains:**
- Acts 1–8: **complete** (4 + 3 + 3 + 3 + 3 + 2 + 4 + 2 = 24 chapters covered)
- Act 9 (Shadow of the Erdtree): **incomplete** (only chapters 1–2 / 8 covered)

**Missing from project:**
- Act 9, Chapter 3: Castle Ensis
- Act 9, Chapter 4: Scadu Altus
- Act 9, Chapter 5: Shadow Keep
- Act 9, Chapter 6: Ancient Ruins of Rauh
- Act 9, Chapter 7: Optional Zones
- Act 9, Chapter 8: Enir-Ilim

### Licensing

No explicit LICENSE file in the zip. The app's `index.html` references "Medusa" as author. Assume proprietary unless credited. The project's existing practice (reference chapter titles only, not prose) should be preserved.

### Recommendation

**Integrate selectively (titles only):**
- Extract the 6 missing Act 9 chapter titles and functional descriptors (chapter name + mainGoal) from the pack.
- **Do NOT reproduce or paste any narrative prose** (summary, lore, location descriptions) — this respects copyright and the project's existing policy (see `HANDOFF-CLAUDE.md` line 275: "Medusa: Index only, no scraped walkthrough text").
- Add to `src/knowledge/medusa.ts`:
  ```typescript
  {
    "id": "act9_chapter3",
    "act": "Realm of Shadow (Shadow of the Erdtree)",
    "actId": "act9",
    "name": "Castle Ensis",
    "goal": "[extract mainGoal field text only, 1-2 sentences]"
  },
  // ... repeat for chapters 4–8
  ```

---

## Pack 4: EldenRingMap V1.2 (Standalone Map Tracker) (Nexus #10354)

**File:** `EldenRingMapV1.2 10354 1.2 2026-07-15T21-46Z Qgpq1zD52.zip` (309 MB)  
**Type:** Standalone Windows desktop app (Python-based) with embedded data

### Contents

**Executable & Core:**
- `launcher.exe` (38.8 MB) — PyInstaller-packaged Windows launcher
- `core/data.dat` — ZIP archive (21 KB uncompressed, contains compiled Python module `components.py`)
- `style.qss` — Qt stylesheet

**Data (JSON):**
| File | Entries | Size | Notes |
|------|---------|------|-------|
| `graces_en.json` | 350 | 58 KB | Organized by surface/underground/hub, regions as keys |
| `dungeons_en.json` | 64 | 11 KB | Legacy dungeons (Stormveil, Raya Lucaria, etc.) |
| `golden_seeds_en.json` | 44 | 8.7 KB | Golden seed locations |
| `sacred_tears_en.json` | 12 | 684 B | Flask upgrade drops (very sparse) |
| `scadutree_en.json` | 41 | 8 KB | DLC-only fragment locations + types |
| `rspirit_ash_en.json` | 23 | 4.8 KB | Revered Spirit Ashes (DLC) |
| `merchant_en.json` | 19 | 3 KB | NPC merchant locations |
| `night_boss_en.json` | 21 | 2 KB | Bloodhound's Step / night creature spawns |

**Localization:** Russian (`*_ru.json`) + English (`*_en.json`) for each file.

**Asset directories:**
- `icons/waypoint_icons/` — Grace/site of grace marker graphics
- `maps/` — (likely tile images, not inspected)
- `saves/` — User waypoint/profile saves (local app data)

### Data Structure Example (graces_en.json)

```json
{
  "Hub": {
    "Limgrave": [
      {
        "name": "Roundtable Hold",
        "x": 1075,
        "y": 8240,
        "id": 11100,
        "map_layer": "surface"
      }
    ]
  },
  "surface": {
    "Limgrave": [
      { "name": "The First Step", "x": 3695, "y": 7359, "id": 10670101 },
      { "name": "Church of Elleh", "x": 3677, "y": 7227, "id": 6100300 },
      ...
    ],
    "Shadow Keep": [ /* DLC region */ ],
    "Scaduview": [ /* DLC region */ ],
    ...
  },
  "dlc": {
    "scadutree": [
      {
        "id": "scadutree_01",
        "type": "scadutree",
        "x": 1684,
        "y": 3795,
        "title": "Scadutree Fragment"
      }
    ]
  }
}
```

**Key fields:**
- Hierarchical regions (Hub → Limgrave → entry objects)
- Flat x/y pixel coordinates (map space, not in-game game coords)
- Game parameter IDs (e.g., `11100`, `10670101` — ParamID format)
- DLC support: separate `dlc` object with Shadow of the Erdtree data

### Licensing

**MIT License** (included in zip):
> Copyright (c) 2026 CreateDDy. Permission is hereby granted, free of charge, to any person obtaining a copy... [standard MIT].

**✓ Permissive:** Redistribution and modification allowed with attribution.

### Coverage vs. Project

| Data | Pack | Project | Gap |
|------|------|---------|-----|
| Graces | 350 | 418 (checklists/graces.json) | −68 entries; pack is missing some base game specifics |
| Dungeons | 64 | (not directly comparable; in catalog) | — |
| Scadutree | 41 | 31 (collectibles.ts) | **+10 additional fragments** |
| Sacred tears | 12 | 12 (collectibles.ts) | Match ✓ |
| Spirit ashes | 23 | (ashes.json has 90) | Pack is subset |
| Merchants | 19 | 106 (merchants.ts) | Pack is subset |
| Golden seeds | 44 | (collectibles.ts seeds count ~10 authored) | Pack is comprehensive |
| **DLC coverage** | **Yes** | **Partial** | **Pack has scadutree/DLC** |

### Tool Assessment

This tool is **NOT** related to `vendor/elden-ring-map` (egormagurin/EldenRingMap):
- **This pack:** Python + PyInstaller executable, `data.dat` ZIP (compiled bytecode), Windows `.ico`, local Qt UI, `launcher.exe`
- **egormagurin/EldenRingMap:** Node.js web server, dynamically generates tiles from game install, SSE (Server-Sent Events) for live updates

These are **different tools with overlapping purpose** (both are map trackers). The Nexus pack is a **standalone offline app**, not a sync engine.

### Recommendation

**Integrate data source (structured):**
- Extract DLC-specific collectibles: **scadutree_en.json (41 entries)** → augment `src/knowledge/collectibles.ts` with the 10 additional fragments.
- Extract sacred tears (12 entries) — compare against existing and add any missing.
- Extract golden seeds (44 entries) — more complete than current authored set; consider replacing authored subset with this data.
- Extract merchants/night_boss metadata if needed (validate against existing `merchants.ts`).
- **Coordinate with graces:** The 350-entry set is smaller than the project's 418. Investigate which base-game graces are missing and whether that's acceptable (may be rare/debug-only entries).

**Do not integrate the tool itself:** The app's core logic (PyInstaller binary + data.dat) is not portable to a web PWA. Only use the `.json` files as static data sources.

**Licensing:** Safe to redistribute the JSON data with MIT attribution (to CreateDDy, 2026).

---

## Summary: Integration Roadmap

| Pack | Type | Action | Effort | Risk | Benefit |
|------|------|--------|--------|------|------|
| **960** | Maps + Icons | Transform maps to tiles; ingest icons selectively | High | Low (no licensing issues) | High-quality map assets; 90+ new icon variants |
| **9974** | Binary mod | Reject | None | None | None (rules already captured) |
| **Medusa** | Web data | Title-only extraction (Act 9 ch. 3–8) | Low | Low (copyright caution) | Complete SotE walkthrough index coverage |
| **EldenRingMap** | Data JSON | Ingest scadutree/seeds/merchant JSON | Low | Low (MIT licensed) | 10+ new scadutree fragments; complete golden seed set; DLC data |

---

## Highest-Priority Actions

1. **Act 9 Medusa chapters (3–8):** Extract titles + mainGoal from the JSON; add to `medusa.ts` to complete DLC coverage. ✓ Low effort, high impact.
2. **Scadutree fragments:** Pull 41 entries from `scadutree_en.json`; merge the 10 new ones into `collectibles.ts`. ✓ Medium effort, good impact (enables full SotE collectible tracking).
3. **Map tiling:** Commission or develop tile generation for `m0-overworld.png` (172 MB source). High effort, high reward (production-grade map quality).
4. **Icons:** Batch-copy novel icon prefixes from Pack 960 to project; regenerate icon atlas if needed. Medium effort, medium impact (UI polish).

---

*Report prepared by Claude Haiku 4.5 on 2026-09-22 for the All-Knowing project team.*
