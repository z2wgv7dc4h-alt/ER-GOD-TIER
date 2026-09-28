# Task 128 — Retire the broken Shadow underground map; audit every screen at every size

## 1. Shadow underground (M11) is broken — retire it
In `?embed=1` choosing "Shadow Under" shows a small partial patch of dark map art on a grey square; the pins sit
on grey, not on the art (Task 121/122 found the M11 tile set is a partial patch and no projection maps the pins
onto it). Stop presenting it as a map:
- Remove M11 from every world switcher copy (buttons + `<select>`, sidebar and embed) and from our Atlas world
  chips; `manifest.json` may keep the tiles but mark M11 `hidden: true` and the UI skips hidden masters.
- Route the SotE-underground markers (areas 22, 25, 40–43; the 24 currently on M11) back to **M10** at their
  surface entrance position, with an "Underground" badge/suffix in their label and popup
  (e.g. "Stone Coffin Fissure · underground"). Counts per category must not change; re-verify with the Task 122
  per-category diff (back up first).
- If a stored preference points at M11, fall back to M10.
- Tests: hidden master excluded from switchers; marker routing puts those areas on M10 with the badge.

## 2. Multi-viewport audit — find every remaining overlap / conflict
The audit so far only ran 375×812 and 1440×900. Extend `scripts/ui-audit.mjs` with a `VIEWPORTS` list and run all:
360×740 (small Android), 390×844 (iPhone), 430×932 (large phone), 812×375 (phone landscape), 768×1024 (tablet
portrait), 1024×768 (tablet landscape), 1280×800 (laptop), 1440×900, 1920×1080. For each viewport run the full
scenario, and ADD steps for the in-app Map with the live engine: switch each remaining world, open Filters, open
Tools/embed-tools, open a pin popup, zoom in — auditing the engine iframe's document too (same-origin: use
`frame.evaluate`), including overlaps between our Atlas chrome and the iframe's floating controls.
Fix every overlap / covered / clipped / text-overflow / tap-size issue found at any size (breakpoints in
`index.css`, `src/ui/ui.css`, `library.css`, engine `app.css`). Known one: the embed's 2×2 world buttons crowd
"Tools" at tablet/laptop widths — use the compact select below 1100px of iframe width.

## 3. Everything else
Run `npm run crawl:ui` at 390×844 and 1280×800 and fix: console errors, controls that do nothing (other than
already-active tabs/chips), duplicate controls on one screen.

Report: per-viewport summary table (before → after), what was fixed, M11 retirement evidence (switcher options,
marker counts per master/category before/after). NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`,
`npm run build` pass. **Commit after each numbered section** (so a timeout never loses work).
