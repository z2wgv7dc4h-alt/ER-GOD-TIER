# Task 159 report — the live map on the phone (installed PWA, no PC)

## 1. What the phone got before this change

### a) Dev server on the PC, phone on the LAN

- The phone loads the app from the PC's Vite server (`https://<pc-ip>:5173`).
  `MAP_ENGINE_BASE` is `/engine`, so everything is same-origin with the app.
- `/engine/**` is served by our own Vite middleware (`vite.config.ts`, `mapEngine()`):
  the static `web/` tree + the tiles read from disk, plus `/api/{markers,place-names,
  saves,state}` and an SSE `/api/events` that immediately sends one `state` frame
  (`live:{enabled:false}`, empty saves, markers from the generated `data/*.json`).
- With tiles extracted on the PC the phone **already** got the live tiled map: the
  iframe loads, the middleware answers the marker feed, and the SSE frame flipped
  `engineStatus` to `live`. No second process is needed for the map.
- If tiles are **not** extracted (a fresh checkout), the engine renders a blank
  canvas; the app could not tell, because the SSE frame still made it "live".
- The service worker is disabled in dev (`devOptions.enabled:false`), so the phone
  cannot use the map offline — it needs the PC on the LAN.

### b) Production build / installed PWA, phone away from the PC

Before: the phone got the **static plate only**.

- `vendor/elden-ring-map/web/` was **not** copied into `dist/`. Vite copies `public/`
  verbatim; the engine is not under `public/`, and the Vite middleware only exists in
  `dev`/`preview`, so a static host / installed PWA had **no `/engine` at all**.
- In production `MAP_ENGINE_BASE` was `http://127.0.0.1:8099` — the *phone's* own
  localhost. `fetchEngineMarkers()` and the SSE both failed, so `subscribeEngine`
  fired `onStatus('offline')` and `Atlas.tsx` drew the static plate.
- The SW rule for the engine was deliberately `NetworkOnly` and `navigateFallback`
  denied `/engine/`, and `public/sourced/**` (plates, coords) was cached, so offline
  fell back to the plate cleanly.
- The PC process was **not** needed for the map's tiles/markers/pan-zoom — only for
  the live player position and save-derived state (the `.sl2` reader, `npm run map`,
  SSE `pos`/`state`). PS5 has no save access, so those are always optional.

## 2. What changed

1. **Engine ships in the production build.** New `scripts/build-engine.mjs`, run by
   `npm run build` (`tsc -b && vite build && node scripts/build-engine.mjs`). It:
   - copies `vendor/elden-ring-map/web/**` (incl. generated `web/tiles/**` when the
     install has been extracted) into `dist/engine/`;
   - writes static `dist/engine/api/{markers,saves,place-names,state}` so the
     engine's own frontend boots with no Node process. `markers` prefers the
     generated `data/{markers,items,pieces}.json` and falls back to the committed
     `public/sourced/open/engine-markers.json`; `place-names` mirrors the dev
     middleware's fallback;
   - leaves `/api/events` unshimmed — it is the SSE stream for the optional PC
     save reader / player dot.
2. **Same-origin base.** `MAP_ENGINE_BASE` is now `/engine` in **every** build
   (`VITE_MAP_ENGINE` still overrides for an external engine).
3. **Status = "do the engine files load?"** `src/lib/mapEngine.ts` now probes
   `tiles/manifest.json` (the honest "the live map can actually draw" signal) and
   exposes `resolveEngineStatus({probed, staticUp, sseUp})`: live if either the
   static files or the SSE reader are up; `connecting` until the probe answers;
   `offline` (plates) only when there is nothing to draw. A failed SSE stream can
   no longer downgrade a shipped engine to the plate.
4. **Offline cache for the engine.** `src/lib/pwa.ts`:
   - only `/engine/api/events` is `NetworkOnly`;
   - every other `/engine/**` (HTML/JS/CSS/icons/tiles/api shims) is
     `StaleWhileRevalidate` into the existing `ak-sourced-offline` bucket, so the
     map works offline and picks up rebuilds on the next load;
   - `**/engine/**` is added to `globIgnores` so the ~7,000 tiles are never swept
     into the install precache.
   - `scripts/build-offline-manifest.mjs` now also walks `dist/engine/**` (after a
     build) and lists it under `/engine/…`, so Settings → "Download everything for
     offline" warms the engine into the same bucket.
5. **Banner copy** (`Atlas.tsx`, `engineBanner`) no longer says "start it with
   `npm start` / :8099" on a phone; offline now means the engine files are not in
   this build.
6. `docs/MAP-ENGINE.md` updated to describe the shipped engine + probe.

### Show on map (Tasks 155/158)

No change to `src/map/focusTarget.ts` / `src/map/itemSources.ts`: they already
resolve a target and the Atlas already posts `all-knowing:focus` to the live iframe
and renders the halo/banner on the static plate. This task makes the **live iframe
the default in production** too, so "Show on map" now zooms the real engine on the
phone instead of only the plate. The static-plate path still runs when the engine
files are absent. `Atlas.focus.test.tsx` (live `data-focus`) and the focusTarget
tests cover both.

## 3. Size added to the offline cache

Measured in this worktree (which has **no** game extraction, so no tiles):

| Item | Files | Bytes | MB |
|---|---|---|---|
| engine shell (`web/` + generated api shims) | 76 | 2,645,744 | **2.52** |
| of which `api/markers` marker feed (4,453 markers) | 1 | 752,972 | 0.72 |
| of which engine icons | 67 | 1,760,379 | 1.68 |

`public/sourced/offline-manifest.json`: 5,395 → **5,471** files,
100.8 → **103.3 MB**.

With the game install extracted (measured read-only from the main checkout), the
copy adds the tile pyramid: **7,142 `webp` tiles, 50.3 MB**, plus the generated
icons/index → an engine tree of ~53 MB; with the vendor-derived marker feed
(`markers.json` 0.54 MB + `items.json` 0.86 MB) the added total is ≈ **54 MB**.
Tiles are generated/gitignored, so they are present only on a machine that ran
`npm run map:setup`; a fresh checkout ships the ~2.5 MB shell and falls back to the
plate until the engine is extracted and rebuilt.

## 4. Checks (once, per AGENTS.md)

- `npx tsc -b` — OK.
- `npx vitest run` — 205 files, 1465 passed, 11 skipped.
- `npm run lint` — exit 0 (pre-existing warnings only).
- `npm run build` — OK; PWA precache 139 entries / 10,053 KiB (engine excluded);
  `[engine-dist] 76 files, 2.5 MB`.
- `npm run test:bundle` — 7 passed.
- `npm run data:offline` — 5,471 files / 103.3 MB.

New tests: `src/lib/mapEngine.test.ts` (status logic: files OK + no PC process →
live; SSE failure cannot downgrade; plates only when files absent). Updated:
`pwa.test.ts` (engine SSE network-only; engine static cached; tiles not precached),
`Atlas.failClosed.guard.test.ts` (banner copy).

## ASSUMPTIONS

- **Probe target** is `tiles/manifest.json`, not `/api/markers`: an engine shell
  without tiles draws a blank canvas, and the static plate is the better fallback.
  The engine is live only when the map can actually draw.
- The engine's static tree is **not** precached on install (it is large and the app
  is useful without it); it fills via the runtime SW rule and is warmed by "Download
  everything for offline". Engine files are kept in the existing
  `ak-sourced-offline` bucket so one action/count/removal covers both.
- The engine's dynamic `/api/events` is intentionally not shimmed: static hosting
  cannot stream SSE. The SSE reader is optional (PC-only), so a failed stream only
  removes the live dot / save-derived state.
- `scripts/build-engine.mjs` prefers generated `vendor/data/*.json` and falls back
  to committed `public/sourced/open/engine-markers.json`; the latter's marker names
  are copied verbatim (no invented text).
- The `offline-manifest.json` now contains environment-specific `/engine/…` entries
  (which tiles exist depends on the machine). It is regenerated by
  `npm run data:offline` after each `npm run build`, as the brief sequences.
- `dist/` stays gitignored; engine tiles are never committed.
- Worktree note: the checkout's `node_modules` was a broken junction
  (`C:\C:\Users\…`). I recreated it as a junction to the main checkout's
  `node_modules` so the local toolchain could run; no dependencies were installed.

## Not done

- No live browser/device check: dev servers are out of bounds and the engine tiles
  need `npm run map:setup`, which was not run. The tile-size figure above was
  measured read-only from the main checkout.
- The `engine-dist` copy of the generated tiles is exercised only by the build
  script's code path; this worktree has no tiles, so the copy of `tiles/**` is
  covered by `fs.cpSync` over `web/` rather than observed here.
