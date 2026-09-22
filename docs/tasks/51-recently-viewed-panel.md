# Task 51 — Recently-viewed / quick-nav history panel

## Context

Repo root is `artifacts/all-knowing/`. Read `src/state.tsx` (`recentFacts` — this already exists
and is tracked/cleared correctly per-profile as of Task 30's cross-profile leak fix, but check
whether it's actually *surfaced* anywhere in the UI beyond `CharacterCard`'s small "recent" chip
row in the rail) and `src/lib/links.ts` (`labelOf`, `moduleFor` — the existing navigation
helpers) first.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Give the player a real, visible way to jump back to something they were just looking at —
whether that's a Codex entry, an Atlas pin, a Related-panel link (Task 39), or a Gideon answer —
using the existing `recentFacts` tracking (extend it if it doesn't already cover every navigation
source, verify what it currently tracks before assuming).

## Requirements

- Audit what currently updates `recentFacts` (check `setSelectedMarkerId` calls across `Atlas.tsx`,
  `Codex.tsx`, `Related.tsx`, `Gideon.tsx` — does selecting something in each of these actually
  record it as "recent," or only some paths?). Fix gaps so every real navigation/selection is
  tracked consistently, not just some.
- Add a real, reachable history panel (a dropdown, a rail section, or similar — match the existing
  visual style, your call on placement) showing the last N recent facts with real names (`labelOf`)
  and one-click navigation back to each (reuse `setSelectedMarkerId`/`setModule` the same way
  existing navigation does).
- Cap the history at a sane length (the existing `CharacterCard` recent-chip row already caps at 3
  — check that constant and decide whether a dedicated history panel should show more, e.g. 10-15,
  without becoming unbounded).
- Respect per-profile isolation (Task 30's fix) — verify the history panel correctly clears/
  switches when the active profile changes, don't just assume it inherits this for free.

## Explicit exclusions

- Don't touch OCR, save parser, Gideon's answer logic, or the map engine.
- Don't build a full browser-style "history with back/forward buttons" — a simple recent-items
  list with click-to-jump is the actual scope here.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: navigating through Codex/Atlas/Related correctly populates recent history in order;
  switching profiles correctly isolates history per Task 30's existing pattern.
- `npm run dev`: demonstrate navigating to a few different entities, opening the history panel,
  and jumping back to one.
