# Data on disk

All under `public/sourced/` unless noted.

## Maps

- `maps/m0-overworld.jpg` — Armory plate (not the 176 MB official mosaic)
- `maps/m1-underground.jpg` — user / pack underground

## Guide (aether-auto/er-guide)

- `guide/items.json` 2.4k items with acquisition
- `guide/catalog.json` slim search copy
- `guide/regions/` 25 grace-to-grace routes
- `guide/legs.json` 124 legs
- `guide/missables.json` lockouts

Coords from the same project: `open/coords.json` (~2k pins).

## Open / Goblins / Paramdex

| File | What |
|---|---|
| `open/names.json` | 6.8k EN FMG names |
| `open/shops.json` | 1261 shop rows |
| `open/world-lots.json` | 10k unique lots + XYZ + flags |
| `open/boss-xyz.json` / `boss-pins.json` | 215 named bosses; 109 projected |
| `open/enemies.json` | 520 EN names |
| `open/msb-enemies.json` | 8.8k placed enemies — **not loaded at runtime** |
| `open/graces` via checklists/graces.json | 418 warps |
| `open/paramdex/` | Names txt dump |
| `src/knowledge/merchants.ts` | 106 vendors full stock |
| `src/knowledge/bossPins.ts` | sync pin list for Gideon |

## Checklists

FanAPI JSON (weapons, armors, spells, …) + `hunts.json` (207 flags) + `graces.json`.

## Authored (small, keep)

`src/knowledge/{catalog,endings,storylines,loot,builds,collectibles,completion,missables}.ts`

Medusa: chapter titles only. Do not paste walkthrough prose.
