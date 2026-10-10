# Task 193 — Wire in the brand art (`public/brand/`)

Branch `task-193`. Wire the Grok brand art into the PWA, the header, entity
fallbacks, Gideon and the empty/photo-guide surfaces, without touching
`src/lib/entityIndexBuild.ts` (Task 187) or any generated data plane.

## 1. Optimise (WebP)

All brand art was converted with Pillow (LANCZOS, WebP method 6). Category icons
keep their alpha (verified real — see below); PNG is kept only where the platform
needs it (PWA/Apple icons, the iOS startup splash).

| Asset | Before | After |
| --- | --- | --- |
| `public/brand/` (23 files → 32) | 9,980,065 B (9.52 MiB) | 1,641,747 B (1.57 MiB) |
| `public/icons/` (7 → 8 files) | 993,166 B (0.95 MiB) | 824,154 B (0.79 MiB) + `public/favicon.ico` (7,707 B) |
| **Combined** | **10,973,231 B (10.46 MiB)** | **2,473,608 B (2.36 MiB)** |

Resizes exactly as specified:

- 12 × `cat-<kind>.webp` @128 (+ `cat-<kind>-64.webp` @64), transparent WebP.
- `gideon-256.webp` (256²).
- `empty-progress|map|journal.webp` @600 wide.
- `photo-guide.webp` @1080 wide, `splash.webp` @1080 wide (in-app loading bg).
- `wordmark.webp` @800 wide, transparent.
- `splash.png` @1080 wide — **PNG kept** (iOS `apple-touch-startup-image`).

The old 1024 masters and source PNGs were removed from `public/` after conversion
(they remain in git history, commit `bb1aac2`), so Workbox no longer precaches
~10 MiB of source art.

**Alpha check:** all 12 `cat-*.png` report `RGBA` with corners `(255,255,255,0)`
and 14–85 % fully-transparent pixels; `icon-1024-transparent.png` likewise. No
checkerboard/white matte was baked in, so no matte removal was needed.

Before/after examples: `cat-region` 93,501 B → 7,272 B; `gideon-512` 430,365 B →
12,206 B; `empty-map` 509,272 B → 26,494 B; `photo-guide` 1,553,523 B → 91,456 B;
`wordmark` 262,860 B → 46,536 B.

## 2. PWA / app icon + manifest + index.html

Generated from `icon-1024.png` / `icon-maskable-1024.png`:
`/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-192-maskable.png`,
`/icons/icon-512-maskable.png`, `/icons/icon-180.png` (apple-touch),
`/icons/icon-32.png`, `/icons/icon-16.png`, `/icons/icon-48.png`, and a root
`/favicon.ico`.

- `public/manifest.webmanifest`: dropped `/art/app-icon.jpg`, now lists the
  192/512 `any` + 192/512 `maskable` PNGs and the SVG favicon.
- `index.html`: favicon 32/16 + `favicon.ico`, `apple-touch-icon` 180, and
  `<link rel="apple-touch-startup-image" href="/brand/splash.png">`.
- `src/index.css`: `#root:empty` uses `splash.webp` as the app-loading
  background (only before React mounts, so it never bleeds into the UI).

## 3. Wordmark

`.brand-mark` (header brand slot) now shows `/brand/wordmark.webp` at the same
left position/slot; the old `sigil.jpg` square is gone. Phone size 108×27 px,
desktop 144×36 px.

## 4. Category fallbacks

`src/lib/extraImages.ts` now owns the mapping (`brandCategoryIcon`) and a full
`entityImage(name, aliases, kind)` lookup: FanAPI → local extra → `cat-<kind>`.

Call sites wired: `src/library/catalog.ts` (`iconForEntity`, so every
`LibraryEntity.icon` gets the fallback before the generic seal) and
`src/library/LibraryBrowser.tsx` (`CategoryIcon`). Real pictures always win.

Kinds: mechanic, gate, build, pvp, quest, ending, guide, region, grace, merchant,
npc, enemy.

## 5. Gideon avatar, empty states, photo guide

- `GideonAnswer.tsx` exports `GideonAvatar` (`/brand/gideon-256.webp`);
  `Gideon.tsx` uses it in the chat header and each answer bubble (owner-approved
  visual-only change).
- `EmptyState` (`src/ui/index.tsx`) gained an optional `image`; used for
  `empty-progress` (Tarnished › Overview "Nothing logged yet"),
  `empty-journal` (Journal) and `empty-map` (Journey › Area "Where are you?").
- `photo-guide.webp` shown in the Setup photo step (`MeSetup`) and the live
  inventory-scan tips (`ScanInventory`).

## 6. Tests

New `src/lib/brandArt.test.ts`: pins the 12 kind→file mappings, proves real
pictures win and the brand icon is the last resort, and scans all app source
(`src/**` non-test, `index.html`, the manifest) so every referenced `/brand/...`
file must exist on disk.

## Checks run

- `npx tsc -b` → 0 errors.
- `npx vitest run` on the touched/related files: `brandArt`, `extraImages`,
  `pwa`, `Header.guard`, `GideonAnswer`, `Gideon.now`, `journal`, `shell`,
  `coverage`, `EntityPanel`, `catalogCache`, `icons`, `model`, `pageModel` —
  all pass (101 tests across the runs).
- `npm run test:bundle` → build + `bundleBudget.test.ts` **7/7 passed**;
  Workbox precache 167 entries.

## ASSUMPTIONS

1. **Source PNGs removed.** The brief said "keep PNG only where the platform
   requires PNG", so the converted source PNGs were deleted from `public/` (they
   stay in git history `bb1aac2`). This is what delivers the MB reduction and
   stops ~10 MiB of source art being precached.
2. **Wordmark is truncated at the source.** `wordmark.png` (from Grok) renders
   `ALL-KNOWI` — the final "NG" run off the 2000×500 canvas; the file's opaque
   bounding box touches the right edge. I used it as-is because the brief
   specifies the wordmark; a corrected/re-generated wordmark can just replace
   `public/brand/wordmark.webp`.
3. **`empty-map` = the "no area" state.** The brief said "no pins/area"; I used
   Journey › Area's existing `Where are you?` empty state (the one place with no
   area set). The `glyph` SVG fallback remains for category rail entries with no
   brand kind.
4. **Splash PNG kept** because iOS `apple-touch-startup-image` expects PNG; a
   companion `splash.webp` is used for the in-app loading background.
5. **`art.guide`** (`/art/guide.jpg`) is still the Gideon **tab-bar** icon — the
   brief scoped the avatar to Gideon.tsx/GideonAnswer.tsx, so the tab icon was
   left unchanged.
6. `pvp` and `guide` are library categories (not `EntityKind`s); mapped directly
   in `brandCategoryIcon`/`CATEGORY_BRAND_KIND`.

## Not done / notes

- Nothing from the brief was skipped.
- A full build/suite was not run beyond `npm run test:bundle` and the touched
  test files, per AGENTS.md (the supervisor runs every gate).

## Checklist

- [x] 1. Optimise to WebP, alpha verified, MB before/after reported
- [x] 2. 192/512 + maskable + apple 180 + favicon 32/16 generated; manifest + index.html + splash updated
- [x] 3. Wordmark in the header brand slot
- [x] 4. `cat-<kind>` fallbacks in the picture lookup + call sites
- [x] 5. Gideon avatar (header + bubbles), empty states, photo guide
- [x] 6. Offline/test:bundle pass; fallback + brand-file tests added

ALL ITEMS DONE
