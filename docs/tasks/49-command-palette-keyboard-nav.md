# Task 49 — Command palette keyboard navigation

## Context

Repo root is `artifacts/all-knowing/`. Read `src/QoL.tsx` (`CommandHits`, `useHotkeys`),
`src/lib/search.ts` (Task 32's `searchSync`/`groupHits`), and Task 31's `src/lib/shortcuts.ts`/
`src/Help.tsx` (the discoverability overlay — this task should also register any new shortcut it
adds there, following that established pattern, so it's not another undiscoverable feature).

Right now the command palette (`/` or `Ctrl+K` to focus search, per the existing placeholder text
and Task 31's help overlay) shows grouped results (Task 32) but has no keyboard navigation between
them — a user has to reach for the mouse/trackpad to click a result, which is slow and breaks the
"stay on the keyboard" flow the shortcuts already establish.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Add real arrow-key navigation and Enter-to-select through the command palette's grouped search
results, plus Escape to close/clear — standard command-palette UX, implemented against the real
existing `searchSync`/`groupHits` result set, not a new search index.

## Requirements

- Arrow Up/Down moves a visible "active" highlight through the flattened list of results across
  all groups (not just within one group) in the order they're rendered.
- Enter on the active result performs the same action clicking it already does (navigate/select/
  apply — check what the existing click handlers do and reuse them, don't duplicate).
- Escape clears the search / closes the results dropdown.
- Wrapping behavior (does Down past the last result wrap to the first?) — your call, but be
  consistent and don't leave it undefined/janky.
- Register this in `src/lib/shortcuts.ts`'s catalog (Task 31) so it shows up in the `?` help
  overlay — don't add an undocumented shortcut.
- Visible focus indicator on the active result (so keyboard users can actually see where they are)
  — check existing chip/button focus styling in `index.css` and stay consistent with it.

## Explicit exclusions

- Don't touch OCR, save parser, Gideon's answer logic, or the map engine.
- Don't change `searchSync`/`groupHits`'s matching or grouping logic — this is purely the
  keyboard-interaction layer on top of the existing results.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests for the keyboard-navigation state logic (active index moves correctly across group
  boundaries, wraps or clamps consistently, Enter/Escape behave correctly).
- `npm run dev`: demonstrate typing a query, navigating results with arrow keys, and selecting one
  with Enter, entirely without touching the mouse.
