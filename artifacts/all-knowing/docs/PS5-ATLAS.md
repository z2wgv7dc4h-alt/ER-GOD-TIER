# PS5 atlas

The PC atlas is EldenRingMap. The PS5 atlas is a reconstructed map. They share slugs, not a save file.

> **2026-09-23:** the PS5-only Atlas label ("PS5 atlas · warp list + pins, not a save") and the
> `ps5` gate that forced the static plates were removed. The app now serves the live engine to every
> platform, and the reconstructed plates are only a fallback when the embed fails. This file remains
> the description of that reconstruction.

## How a pin gets a state

```
true      name is on the warp list, or the player marked Found
false     player marked Not there (they opened that map and the pin is absent)
unknown   default — no warp shot, no answer
```

Fog on a world-map screenshot is **unknown**, not false. The game hides undiscovered *and* undiscovered-map-fragment regions the same way.

## What to photograph

| Screen | What it proves |
|---|---|
| Site of Grace warp list for the current area | `true` for every name in the column |
| Opened overworld map with gold grace icons | `true` for visible gold pins only |
| Underground / Ainsel / Siofra map tab | Separate world. Do not mix with overworld. |
| Ashen Capital after the Forge | Separate world from living Leyndell. |
| Realm of Shadow map | Separate world. Needs SotE started. |

PS5 Create button → share / USB / app screenshot → drop on Reckoning → type any names the JPEG smeared.

## Worlds

- Lands Between
- Underground (Siofra, Ainsel, Nokron, Deeproot)
- Ashen Capital
- Realm of Shadow

Each is a different map screen on the console. The atlas has a tab per world so a Gravesite Plain shot cannot stamp Limgrave pins.

## What the engine does *not* do on PS5

No tiles from `71_maptile`. No SSE. No live player marker.  
A PC in the house that ran the one-time map setup (`npm run map:setup`) can still import the export packet later and light the real map. Until then the seed atlas + warp names are the product.

## Marking by hand

Found / Unknown / Not there on a selected pin writes the same `Character` lists Reckoning does. Inference still closes requires/grants.
