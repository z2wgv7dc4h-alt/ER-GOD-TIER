# Task 26 — Real mobile-first redesign, not just an unbroken layout

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first, plus
`src/index.css` in full — it's not huge, and this task touches most of it.

This app's whole product framing is "PS5 player on a phone, PC player at a desk" (see `SCOPE.md`'s
"What 'done' for the MVP actually is" — step 1 is literally "on a phone"). But the actual layout
(`.app { grid-template-columns: 200px minmax(0,1fr) 320px }`) is a fixed three-column desktop
shell with a `@media (max-width: 1100px)` override that just collapses the columns into stacked
rows without redesigning any of the content inside them.

**A real bug was just found and hotfixed directly** (not via a task — check `git log` for the
commit right before this task brief, CSS-only, in `src/index.css`): `.workspace`'s grid only
accounted for 2 of its 3 actual children, so on narrow screens the `WorldRibbon` banner (which
wraps to ~190px on a phone) stole nearly all the vertical space meant for the actual room content,
rendering every room as an effectively blank ~15px sliver. That's fixed. What's not fixed is that
the mobile experience is still, in the user's own words, "very hard to navigate and overwhelming"
even with content now visible — a horizontally-scrolling nav bar crammed with the brand mark, five
room buttons, and (previously) a character card and half a dozen save-slot action buttons; dense
desktop-density text and controls; a map area that's a small fraction of the screen.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Design and implement a real mobile layout for widths under ~700px — not a stacked/compressed
version of the desktop layout, but one that fits how someone actually holds and taps a phone.

## Requirements

- **Navigation**: a bottom tab bar (the standard, thumb-reachable mobile pattern) for the five
  rooms (Reckoning, Atlas, Build lab, Quest graph, Codex) instead of a horizontally-scrolling top
  bar. Icons + short labels, not the full desktop nav bar squeezed down.
- **Character/save controls**: the desktop rail's character card and half-dozen save-slot buttons
  (Undo/New/Rename/Forget/Save file/Load file/Diff) need a real mobile home — a collapsed summary
  with a tap-to-expand sheet/drawer is the usual pattern, not all of them visible and competing
  for space at once. Use your judgement on the exact pattern, but the bar of the answer is
  "doesn't eat the top 200px+ of the screen before the user sees anything they asked for."
- **The Atlas map**: on mobile this is arguably the single most important view (a PS5 player
  checking where they are). It needs to be able to take up most of the screen when active, with
  filters/controls tucked into a collapsible panel rather than always-visible chrome eating map
  space.
- **WorldRibbon**: currently a wrapped list of story-flag banners. On mobile, consider whether it
  should be collapsed to a single line/count with a tap-to-expand, rather than a scrollable box
  that's still visible by default — your call, but "always visible and eating 15vh permanently"
  probably isn't the best mobile answer either.
- **Touch targets and text density**: audit tap target sizes (buttons, chips) against a reasonable
  minimum (~40-44px), and check whether desktop-density text (10-11px labels, tight letter-spacing
  meant for a monitor) needs to scale up for a phone screen held at arm's length.
- **Test at real phone widths**: 375px (iPhone SE / small Android) and 430px (larger phones) at
  minimum. Use the project's existing dev-server + browser-automation setup to actually verify
  layout, not just eyeball the CSS.
- Preserve all existing desktop behavior exactly — this is additive (new mobile-width rules), not
  a rewrite of the desktop layout that already works.

## Explicit exclusions

- Don't touch the room components' actual logic/data (Atlas.tsx, Build.tsx, etc.) — this is a
  layout/CSS/shell task. If a room's internal layout genuinely needs restructuring to work well on
  mobile (e.g. Atlas's own filter chips), that's in scope for that room's own CSS, but don't touch
  its data-fetching or business logic.
- Don't add a UI framework or component library — match the existing hand-rolled CSS approach.
- Don't remove any desktop-only functionality — everything available on desktop should still be
  reachable on mobile, just organized differently.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- Real before/after verification at 375px and 430px widths for all five rooms — describe or
  screenshot each, the same way Task 07's original brief asked for a full room-by-room
  click-through. Confirm each room's actual content (not just chrome) is visible and usable
  without horizontal scrolling.
- Confirm the WorldRibbon fix from the pre-existing hotfix still holds (room content gets real,
  non-collapsed height) after your changes.
- Report specifically: bottom-nav implementation, how the character/save controls were
  reorganized, how much of the viewport the Atlas map gets on mobile before/after.
