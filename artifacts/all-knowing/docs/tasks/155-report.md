# Task 155 — "Show on map" must zoom to the thing

## Root cause

Every "Show on map" entry point did the same two things:

```
setSelectedMarkerId(id); setModule('map')
```

`AtlasWorkspace` (`src/Atlas.tsx`) then derived its viewBox from `focus`, but that
value was built **only** from session *result* pins and *note* pins in the
currently-viewed world:

```ts
const focusPin = w.selectedMarkerId
  ? resultList.find(...) ?? noteList.find(...)
  : undefined
```

Consequently, when the target was an ordinary seed/grace/coords pin (a boss, a
grace, a dungeon, an entity from the catalogue):

1. **No coords → no centre.** `focusPin` was `undefined`, so `viewBox` stayed the
   full `0 0 vw vh`; the map opened but did not move or zoom.
2. **Wrong layer.** the plate (`world`) is local React state initialised from the
   DLC answer; nothing switched it to the target's layer, so an underground/DLC
   target was looked for on the overworld plate (and `focusHere` was false).
3. **Not highlightable.** the pin's id often does not equal the marker id on the
   plate (e.g. a boss fact `boss:godrick` vs its `bossflag:…` coords row), so the
   selected-marker highlight was not drawn either.
4. The live-engine branch (`engineLive`) never applied focus at all.

There was no single, shared rule from target id → layer + centre + zoom.

## Fix

### One shared, pure rule — `src/map/focusTarget.ts` (new)

`resolveFocusTarget(id, { coords, region })` returns either

- `{ kind: 'placed', layer, center, zoom, name, id }` — resolved through the
  existing `resolveEntityPin` (authored graces, coords/boss pins, loot rows), so
  the target's true `AtlasWorld` layer travels with it, or
- `{ kind: 'region', region, message, name }` — no grounded position, so the UI
  names the region instead of opening on nothing, or
- `{ kind: 'none', message }`.

`FOCUS_ZOOM = 3.4` is the close zoom for a located target.

### A real focus request — `src/state.tsx`

Added `mapFocus: { id, at } | null` and `focusOnMap(id)` to the workspace. It
selects the id, records the request, and opens the Atlas. All entry points now
call `focusOnMap` instead of hand-rolling `setSelectedMarkerId` + `setModule('map')`.

### Atlas consumes it — `src/Atlas.tsx`

- `focusPlan = resolveFocusTarget(w.mapFocus?.id, { coords })`.
- The plate layer is seeded from the plan (fresh open) and adopted once per
  request via a token ref (coords load lazily), so a later manual plate switch is
  not dragged back.
- `focus`/`viewBox` now prefer the plan's centre at `FOCUS_ZOOM`, falling back to
  follow mode, then result pins as before.
- The target is drawn as a pulsing halo + label on top of every layer
  (`.pin.focus-pin`), so it is highlighted even when its id is not a visible pin.
- A `focus-banner` (`role="status"`) states the region fallback when there is no
  position: "No map position for X — showing <region>." (styled in `index.css`).

## Entry points fixed

All previously `setSelectedMarkerId(id); setModule('map')`, now `focusOnMap(id)`:

- `src/EntityActions.tsx` (the shared four-action chip)
- `src/Dungeon.tsx` (dungeon beat grace)
- `src/Build.tsx` (hunt pin, "Show on atlas", hunt rows ×2, helper)
- `src/build/BuildPowerTools.tsx` (smithing source pin)
- `src/library/BuildPlanner.tsx` (upgrade/advisory pins)
- `src/peek/PeekCard.tsx` (entity peek card)
- `src/Gideon.tsx` (the `showOnMap` action, desktop auto-nav map case, nearby-leftover grace)
- `src/shell/JourneyNow.tsx` (goal "Show on map", here-list row, missed-nearby row)
- `src/shell/JourneyArea.tsx` ("Show area on map"; no target still navigates)
- `src/library/LibraryBrowser.tsx` and `src/library/EntityOverlay.tsx` (entity panels)
- `src/Quests.tsx` (current quest beat)
- `src/watch/WatchlistCard.tsx` (starred entity)
- `src/shell/MeOverview.tsx` ("Show all on map"; no missing id still navigates)
- `src/QoL.tsx` (WhisperGrace nearby warps; Recents for map-module entities)

Search results are covered through the entity overlay (`openEntity`), which owns
the same action.

## Tests

New `src/map/focusTarget.test.ts` — 6 cases on the pure rule:

- overworld boss (coords pin) → `overworld`, exact centre, `FOCUS_ZOOM`
- underground place (`grace:siofra`) → `underground`
- DLC place (`grace:gravesite`) → `shadow`
- overworld grace (`grace:first-step`) → `overworld`, authored point
- no coords (`boss:godrick` with empty coords) → region `Stormveil` + message
- explicit region + empty target → region / `none`

## Checks (run once at the end)

- `npx vitest run` — **200 files passed**, 1439 passed / 11 skipped (was 199/1433
  before; +1 file, +6 tests).
- `npm run lint` — exit 0 (warnings only, pre-existing).
- `npm run build` — ✓ built.
- `npx tsc -b` — clean.

## ASSUMPTIONS

- **Live engine iframe**: on a PC with the local engine running (`127.0.0.1:8099`,
  the production base) `engineLive` is true and the iframe owns its own pin set;
  focus/zoom there is the engine's job and was **not** changed in `vendor/`. On
  the owner's PS5/phone the engine is unreachable, so the static plate — the path
  this task fixes — is what renders. This is the only "not done".
- `FOCUS_ZOOM = 3.4` (a close zoom, same order as follow mode's 2.4); the existing
  `focusViewBox` clamps it inside the plate.
- Zoom magnitude and the focus request are session state; a `Show on map` request
  re-applies when the Atlas remounts (the vault-persisted `selectedMarkerId` is
  unchanged).
- "Layer" means the Atlas plate world (`overworld` / `underground` / `ashen` /
  `shadow`).
- A target with a known region but no pin falls back to naming that region — no
  coordinates are invented.
- `Recents` (a map-navigation helper, not labelled "Show on map") was updated too
  so map-module history entries also land on the target.
- The worktree's `node_modules` junction was broken (target
  `C:\C:\Users\…`); it was repointed at the existing
  `ER MASTER TOOL\artifacts\all-knowing\node_modules`. No packages were installed.
