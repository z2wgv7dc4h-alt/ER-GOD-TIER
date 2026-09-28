# M11 tile forensics — why the Shadow underground is a small fogged patch (Task 129)

Verdict: **the fully-revealed M11 map does not exist in the shipped game data.** M11
(`MENU_MapTile_M11_*`) ships exactly **one variant per cell — `00000000` — at every LOD**, its
`71_maptile.mtmskbnd` table has **0 rows with `exists="1"`**, and there is **no DLC-specific map
atlas**. `extract_tiles.py` is not skipping tiles and is not picking a wrong variant: there is
nothing else to pick. The grey-and-black patch is the game's own M11 art. Per Task 129 step 5,
**nothing was changed** in the extractor, tiles, or projection; only this document was added.

Everything below was read-only on the game install
(`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game`). Raw dumps and probe scripts
live in `.scratch/m11-forensics/` (gitignored).

## 1. Archive coverage — the extractor already opens every archive that has map data

`DvdBnd.ARCHIVES = ["Data0", "Data1", "Data2", "Data3", "DLC", "DLC02"]`. On this install:

| archive | files indexed | has `/menu/71_maptile.*`? |
|---|---|---|
| Data0 | 5,878 | **yes — all of it** |
| Data1 | 39,419 | no |
| Data2 | 39,684 | no |
| Data3 | 1,672 | no |
| DLC | 33,755 | no |
| DLC02 | (absent) | — |
| total | 120,403 | |

`/menu/71_maptile.tpfbhd` 4,359,952 B and `/menu/71_maptile.tpfbdt` 1,257,753,947 B and
`/menu/71_maptile.mtmskbnd.dcx` 5,949 B all resolve to **Data0**. Candidate DLC paths
(`71_maptile_dlc.*`, `72_maptile.*`, `70_maptile.*`, `dlc01/…`, `71_maptile_sote.*`) are all
missing. The largest DLC file is 181 MB; the only 1.2 GB map blob is Data0's `71_maptile.tpfbdt`.
So the hypothesis "M11 lives in a DLC archive the extractor never opens" is false.

The `71_maptile.tpfbhd` BHF4 directory holds **28,469 tile textures** (0 unmatched names). This is
the complete world-map tile inventory.

## 2. Tile inventory (from the archives)

```
master  LOD   cells   distinct variant codes   variants/cell
M00     L0     1681   231                      4.09
M00     L1      961   253                      4.85
M00     L2      121   577                     17.90
M00     L3       36   344                     15.58
M00     L4        9  4282                    501.89
M01     L0     1681    14                      1.75
M01     L1      961    16                      1.90
M01     L2      121    22                      2.77
M01     L3       36    24                      3.19
M01     L4        9    36                      7.11
M10     L0     1681    16                      1.46
M10     L1      961    16                      1.54
M10     L2       81    20                      2.21
M11     L0      160     1 (00000000)           1.00
M11     L1      117     1 (00000000)           1.00
M11     L2       12     1 (00000000)           1.00
```

Exact M11 names, e.g.:

```
71_MapTile\MENU_MapTile_M11_L0_18_11_00000000.tpf.dcx
...
71_MapTile\MENU_MapTile_M11_L0_33_20_00000000.tpf.dcx
71_MapTile\MENU_MapTile_M11_L2_06_05_00000000.tpf.dcx
```

* M11 has **289 textures total** (160 + 117 + 12). Every one ends `_00000000`.
* M01 has 5,287, M10 has 4,116, M00 has 18,777.
* M11 has **no LOD 3 or LOD 4** — its LOD pyramid simply stops at L2, consistent with a small,
  partial inset.

## 3. Why `choose_variant` can never reveal M11

`71_maptile.mtmskbnd.dcx` (decompressed) contains one XML per master. Parsed:

| file | rows | `exists="1"` | id range |
|---|---|---|---|
| `MENU_MapTile_M00.mtmsk` | 2218 | 2218 | 0..20708 |
| `MENU_MapTile_M01.mtmsk` | 694 | 694 | 216..20504 |
| `MENU_MapTile_M10.mtmsk` | 798 | 798 | 1110..20607 |
| `MENU_MapTile_M11.mtmsk` | **2434** | **0** | 0..20808 |

Every M11 row is `<MapTileMask exists="0" id="…" mask="0"/>` — the table was generated for the M11
grid but **every cell is explicitly marked "no map-fragment reveal"**. None of the 160 actual M11
L0 cell ids (`col*100 + row`, cols 18–33 × rows 11–20) is even present with a usable row.

Selection check (LOD 0):

```
master  cells  mask rows  code present  fallback to 00000000
M00      1681       2218          1369                 312
M01      1681        694           418                1263
M10      1681        798           480                1201
M11       160          0             0                 160
```

M00/M01/M10 each have a nonzero variant whose code equals the table mask, so `choose_variant`
returns the fully-revealed art (and never has to fall back to a missing code). M11 has **zero**
masked cells and **one** tile per cell, so `choose_variant` always returns `00000000` because that
is the only file that exists — not because a rule is broken.

### What `00000000` means

Base-vs-revealed comparison at the same cell (dumped to `.scratch/m11-forensics/`):

* M00 (20,20): `00000000` = raw terrain, no contour lines; table mask `0x8400` → `00008400` = the
  drawn map with contour lines. So `00000000` is the **un-discovered base**.
* M01 (20,20): `00000000` = black void shape on alpha; mask `8` → `00000008` = the drawn
  underground map. Again `00000000` = **un-discovered base**.
* M10 (20,20): `00000000` = plain terrain; `00000002` = drawn map with icons. Same pattern.
* **M11**: only `00000000` exists, i.e. only the un-discovered base. The drawn/revealed M11 map
  was never shipped.

Composition of the M11 base (stitched 16×10 LOD 0, `M11_L0_stitch.png`):

* 75.6 % flat opaque grey `(78,78,78)` with faint horizontal scanlines — the unexplored fill;
* a black polygon (`≈(21,21,21)`) — the underground void silhouette;
* a few photogrammetry rock patches — the only real terrain baked into the base.

Alpha is `255` everywhere on M11, so alpha sampling cannot distinguish "art" from "fog" on M11
(the LOD0 stitch is fully opaque inside the patch).

## 4. M10 comparison

M10 is the same *kind* of atlas but complete: 1,681 L0 cells, 16 variant codes, 798 reveal-mask
rows, and `choose_variant` picks the mask-matching code on all 480 cells that have a table row (the
other 1,201 cells have no fragment-dependent art and correctly fall back to `00000000`). M11
differs in exactly two ways, both authored by the game: **one variant per cell** and **no reveal
rows**. There is no extractor difference to fix.

## 5. M11 marker alignment (hit-rate)

Sampled the raw LOD0 art at all 24 M11 markers in `data/markers.json` (12 grace, 8 poi, 4 boss),
`.scratch/m11-forensics/hitrate.py`:

* **Hit-rate = 0/24.** Every pin lands on the flat fog grey `(78,78,78)`.
* 12/24 pins have no non-grey art anywhere within 600 px; the other 12 are 15–529 px from the
  nearest rock/void pixel.
* Overlay: `.scratch/m11-forensics/M11_pins_overlay.png` — pins cluster lower-left and upper-left;
  the only real art (black void + rocks) sits centre/right.

This is the expected consequence of section 3: the pins project onto the un-discovered base, which
is grey where they land. It is not a projection bug that a different legacy-conv or area offset
could repair — there is no revealed art at any offset, because no revealed M11 variant exists. So
Task 129's "fix the projection" branch does not apply either.

## 6. Decision

Per Task 129 step 5 ("If it truly does not exist, report the evidence exactly, change nothing"):

* `vendor/elden-ring-map/tools/extract_tiles.py` — **unchanged**.
* `scripts/erlib/maptile_mask.py` — **unchanged** (its docstring already says M11 has no mask
  rows and one variant per cell; this is confirmed).
* `web/tiles/M11` and `manifest.json` — **unchanged**; no re-extraction, no backup needed.

Before == after: M11 pyramid **261 files** (z6=160, z5=70, z4=20, z3=6, z2=2, z1=2, z0=1),
manifest `M11.bounds = [4608, 5120, 8704, 7680]`; archive M11 textures **289** (L0 160, L1 117,
L2 12). M10 pyramid 2,293 files for scale. Zoom-0 M11 is a small grey rectangle (≈64×40 px) with a
dark blob, on transparent white.

## Assumptions / unfinished

* "Fully revealed" is defined as the game's own drawn-map variant family (the mask-selected
  nonzero codes M00/M01/M10 use). If the DLC underground map were instead composed at runtime from
  a non-tile source, that source is outside `71_maptile` and outside the tools in scope; no such
  atlas was found by name-hash probes.
* This task only looked at the tile atlas + mask table. Whether the game *intends* M11 to be a
  player-facing map is a gameplay/UI question handled by Task 128 (retire M11) — these findings
  support retiring it: there is no revealed M11 to render and no projection can put the pins on
  art.
* No `.env` file was read; the game install was read-only; the only writes were to the repo's
  gitignored `vendor/elden-ring-map/cache/` and `.scratch/m11-forensics/`.
