# Task 93 — Shell polish (review findings on Task 91)

Found by viewing the Task 91 shell at 375×812 (phone) and 1440×900 (desktop). Fix every item.

1. **Help hint covers the sub-tabs.** The first-visit "New here? Press ?" hint sits on top of the
   segmented sub-tabs on phone. Render it in normal flow (not overlaying anything) or as a small toast
   above the tab bar, and dismiss it automatically after the first section/sub change.
2. **World ribbon everywhere.** The "N story flag(s)" ribbon renders on every section. Show it only on
   `me/overview` and `journey/now`.
3. **Stat editor is a wall.** On `me/overview` the eight stat inputs stack full-width. Make it a compact
   4×2 grid (label + small number input, `inputmode="numeric"`), collapsed behind an "Edit stats"
   button by default; the read-only stat grid in the character card stays visible.
4. **Misleading source label.** The character card header says "MAP ENGINE · LIVE SAVE" even with no
   save loaded. Show the real source ("No save loaded — demo / manual", "Save file · <name>",
   "Screenshot", etc.) and link "Update" → `me/update`.
5. **Journey › Now is a chip wall.** Lead with: goal title, current beat, the next 3 steps, and the
   action buttons (Show on map / Done / Blitz / Ask Gideon). Put the long Related chips list behind a
   collapsed "Related (N)" disclosure.
6. **Desktop width wasted.** On ≥1100px, `journey/now` and `me/overview` use a responsive card grid
   (`grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`) instead of one narrow column.
7. **Phone map controls collide.** On `journey/map` at 375px the engine iframe's world buttons wrap
   and overlap each other, "Tools", and pins; there are two filter buttons ("Filters" from the engine,
   "Filters & details" from us). In `vendor/elden-ring-map/web` (embed mode only, ≤700px): make the
   world switch a single compact `<select>` or one-row scrollable segmented control with short labels
   (Lands Between / Underground / Shadow / Shadow Under); keep Tools and Filters as icon-sized buttons
   that do not overlap. In our Atlas, hide our "Filters & details" button while the live engine is
   showing on phone (the engine's Filters already covers it), or merge them — only one filter entry
   point may be visible. Keep the Task 59 "populate every class copy" pattern.
8. **Lossy location persistence.** The vault stores the last location as a legacy ModuleId
   (`journey/now → map`, `me/* → reckon`). Persist `section` + `sub` directly (keep reading the old
   field for migration).

Acceptance: `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; add tests for 2, 4 and 8.
