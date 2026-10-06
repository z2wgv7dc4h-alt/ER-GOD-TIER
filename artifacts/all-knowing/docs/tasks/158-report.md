# Task 158 report — "Show on map" now zooms the map the player sees

## Which component renders the map the user sees

`src/Atlas.tsx` decides between two maps:

- `engineLive` → `<EngineEmbed>`: an `<iframe src="/engine/?embed=1">` that loads
  `vendor/elden-ring-map/web/` (the vendored "EldenRingMap" engine). This is the
  map with the `+ / − / fit / player` buttons (`#zoom-*`), the world switch, the
  canvas markers and the cluster bubbles.
- otherwise → the static plate (`<div className="atlas-plate">`) that Task 155
  changed.

`engineLive` is the *default*: our own Vite plugin (`vite.config.ts`, `mapEngine()`)
serves `/engine` and always answers `/engine/api/events` with a `state` event, so
`subscribeEngine` flips `engineStatus` to `live` on any normal dev/preview load.
The static plate is only reached when the engine is genuinely down or the embed
errors. The browser repro (`Lands Between` + clusters + `+`/`−`) is therefore the
**iframe**, not the plate.

## Why Task 155 missed it

Task 155 wired `mapFocus` → `resolveFocusTarget` → `viewBox` / `focus-pin` /
banner, all inside the `!engineLive` (static plate) branch. The engine iframe
draws its own `<canvas>` and owns its own camera (`map.cx/cy/scale`), so it never
reads the host's SVG `viewBox`. The unit tests passed because they exercised the
pure resolver; nothing told the engine about the request. Task 156 kept growing
the same static branch, so the live path stayed untouched.

## The fix

Three coordinated changes.

1. `src/map/engineFocus.ts` (new) — `engineFocusMessage()` translates the host's
   resolved placement into the engine's frame:
   - `overworld → M00`, `underground → M01`, `shadow → M10` (`ENGINE_MASTER`);
   - Pack-960 worlds send `px = x/100 * 10496`, `py = y/100 * 10496`;
   - ashen/shadow stand-in plates send **no** point, so the engine finds those by
     name and uses its own position instead of a wrong projection.

2. `src/Atlas.tsx` — compute the payload from `activePlaced` (or name-only when
   the host could not ground it), pass it to `EngineEmbed`, and postMessage
   `{ type: 'all-knowing:focus', ... }` to the iframe once it has loaded and on
   every new `w.mapFocus.at` token. The iframe also carries a `data-focus`
   attribute mirroring the payload for the component test.

3. `vendor/elden-ring-map/web/js/app.js` — a new `all-knowing:focus` handler,
   `focusFromHost()`:
   - resolves the target by engine id → exact display name → partial name
     (preferring the host's category, e.g. `boss`), then by the host's point;
   - switches master when the pin lives on another world;
   - flies to `HOST_FOCUS_SCALE = 1.4` (above the `0.28` cluster threshold, so
     clusters split, and above `0.85`, so the label draws — same scale the
     engine's own search uses);
   - enables the pin's category and opens its popup (highlight);
   - a host point that matched no pin is drawn as a gold ring;
   - if the message races the async `boot()`, it is stored as
     `state.pendingFocus` and applied once the map and markers exist.

## Before / after

- Before: any `focusOnMap` from Journey › Now, Journey › Area, search, Dungeon,
  Builds, Quests, Gideon, etc. opened the full `Lands Between` engine view at
  `fit()` — no centre, no zoom, no highlight.
- After (static plate, `grace:first-step`): `viewBox` goes from
  `0 0 4096 3880` to `833.3 2147.4 1204.7 1141.2` (centred, ~3.4× zoom).
- After (engine): the iframe receives `M00:grace:first-step` /
  `M00:boss:margit` etc.; the engine switches to the right master, flies to the
  pin at scale 1.4 and opens its popup. Margit (`boss:margit` in our catalog,
  `boss:10000850` in the engine) is matched by name + kind.

## Checks (once, per AGENTS.md)

- `npx tsc -b` — OK.
- `npx vitest run` — 203 files, 1454 passed, 11 skipped.
- `npm run lint` — exit 0 (only the pre-existing warnings).
- `npm run build` — exit 0.
- `node --check vendor/elden-ring-map/web/js/app.js` — syntax OK.

New tests: `src/map/engineFocus.test.ts` (4) and `src/Atlas.focus.test.tsx` (4,
renders `AtlasWorkspace`: static `viewBox` must leave the whole-map view and the
live iframe must carry `data-focus="M00:grace:first-step"`).

## ASSUMPTIONS

- The live engine iframe is the component the user sees; fixing vendor
  `web/js/app.js` is in scope (it is tracked source, not a generated file or a
  `build:*` record).
- The engine's own search fly-in (`scale 1.4`) is the right "close" zoom; the
  brief's "individual markers visible, clusters split" is met at ≥ 0.28.
- Entity ids differ between the app (`boss:margit`) and the engine
  (`boss:10000850`), so focus matches by display name with the catalog category
  as a tie-break; `boss:margit` resolves to the boss pin, not the grace of the
  same name.
- Ashen Capital has no engine master, so it is sent by name only; if the engine
  has no such pin the request is a no-op rather than a wrong position.
- `data-focus` on the iframe is a test/debug mirror of the same payload the
  effect posts; it has no runtime behaviour.

## Not done

- No live browser/e2e check: the dev server (and `npm run dev`) is out of bounds
  here, and the engine tiles/markers need `npm run map:setup`, which was not run.
- Region-only fallbacks (no grounded position and no engine name match) still
  show nothing on the live iframe; the static plate keeps its Task 155 region
  banner.
