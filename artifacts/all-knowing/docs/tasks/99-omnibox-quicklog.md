# Task 99 — Omnibox + Quick log

Read `docs/USAGE-MODEL.md` §2 "One omnibox" and moments 3 and 8.

## Omnibox (`src/lib/omnibox.ts` pure classifier + existing command palette UI in `QoL.tsx`)

`classify(text) → { kind: 'entity'|'log'|'question'|'command', ... }`
- log verbs: killed / beat / defeated / got / found / picked up / bought / rested at / reached /
  gave X to Y / talked to / finished → `{ kind:'log', factIds, verb }` (reuse Gideon's `DONE_REPORT`
  and `matchMany`; move that regex into this module and import it from `gideon.ts`).
- questions (where/how/what/why/should/best/can I/…?) → Gideon; show the answer **inline in the
  palette** with EntityLinks, plus "Continue in Gideon".
- commands: section/sub names, "setup", "map", "glance".
- otherwise entity search (existing).
Results render as grouped rows: **Do** (log/command) · **Things** (entities) · **Ask** (Gideon).

## Quick log

- A floating `+` button (phone: above the tab bar, right thumb; desktop: header) on every section,
  opening a sheet: one input with fuzzy suggestions and recent/near-me suggestions (bosses/graces in
  `currentArea` not done), multi-select, "Log".
- Logging runs `applyFacts` + inference, then a toast: "Logged Margit ✓ — unlocked: Stormveil;
  next: …" with Undo (existing Ctrl+Z undo stack) and "What now?".
- Before applying, if any fact trips a gate/lockout, show the existing `LockoutPrompt`.

Acceptance: classifier table tests (≥30 phrasings across the four kinds), quick-log applies +
undo test, lockout prompt test; `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
