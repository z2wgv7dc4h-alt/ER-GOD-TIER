# Handoff — All-Knowing

Read this before writing code. Do not invent a second kernel.

## What it is

Local-first PWA. One `Character` is the world. Atlas, Build, Quests, Codex, Reckoning, Gideon are views.

```
Identity 220px │ Stage 1fr │ Gideon 320px
```

Sit mode stacks Guide under Stage.

## Do not break

- Fact ids: authored `kind:slug` (`boss:godrick`, `grace:elleh`). Open dumps keep their ids (`bossflag:530110`, `shop:100056`, `lot:10007850`). `applyFacts` buckets by prefix (`prefixKind` in `src/lib/infer.ts`).
- Three states via `factState()` — the four lists + `deniedFacts`. Evidence alone is not “true”.
- Vault: `localStorage` key `all-knowing.vault.v1`. Packet has no screenshots.
- Merge never replace: `src/lib/merge.ts`.
- Gideon: `askGideon` → `GideonAct`. The shell always switches `act.module`.
- Sync search: `searchSync` (`src/lib/search.ts`). Command bar, Gideon type-to-log, Reckon extra hits, Gideon fallback. Heavy JSON stays in Codex hooks.

## Two map frames (do not mix)

1. er-guide lat/lng → `public/sourced/open/coords.json`
2. Goblins XYZ + `m60`/`m61` tiles × 256 → `boss-pins.json`

Do not average them. Pickup XYZ lives in `world-lots.json` (10,011 rows) and is not on the JPG except the 109 boss pins.

## Gideon

`src/lib/gideon.ts` + `src/Gideon.tsx`.

Intents: endings/lines/blitz, still-available, builds, shops, missables, fragments, warps, loot, hunts, stuck, 100% spine, boss pins, searchSync last.

DeepSeek later: same Act JSON. Ground with `planRoute`, `stillAvailable`, `searchSync`. No invented ids.

## Paths

- PS5: Reckoning + paste. `src/lib/ocr.ts` is empty on purpose.
- PC: `npm run map` SSE. `canonicalFactId` only when names match.
- `.sl2` parser is not real.

## Refresh data

```
bash scripts/ingest-open.sh
python3 scripts/slim-lots.py
```

er-guide, FanAPI, Paramdex Names, Goblins `data/`.

Inventory: `DATA.md`.

## Next (in order)

1. Alias table: engine `grace:{row}` + `bossflag:{clear}` + seed slugs.
2. Split `App.tsx`.
3. One coordinate frame for lots, or keep XYZ off the plate.
4. Query-only load of `msb-enemies.json`.
5. Tesseract behind `readImageText` or delete OCR.
6. Tests for `prefixKind` + `searchSync`.

## Refuse

Uploads, save edits, FromSoftware tile archives, invented AR, Nightreign v1, live MapGenie scrape.

## Run

```
cd artifacts/all-knowing
npm run dev
npm run map
```
