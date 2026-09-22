# Task 31 — Make hidden shortcuts/QoL features actually discoverable

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md` and `src/QoL.tsx`
in full first. The search placeholder alone hints at shortcuts most users will never find:
"Search · / Ctrl+K · 1–5 rooms · S sit · paste shot". Read `src/QoL.tsx` for whatever else lives
there (command palette, keybindings, other quality-of-life features) — it's real, working code
with zero in-app documentation. The user (real feedback, verbatim): "There's still so many
undocumented actions and QOL etc to use." Scratch work → `./.scratch/` (gitignored). Personal
project — no license-gating.

## Objective
Make every real keyboard shortcut, gesture, and QoL feature actually discoverable in the app
itself — not buried in a README the user never opens.

## Requirements
- Audit `src/QoL.tsx` and any keydown handlers elsewhere (search for `addEventListener` /
  `onKeyDown` across `src/`) and produce a complete, accurate list of every shortcut/gesture that
  actually works today. Don't document intended-but-unimplemented ones.
- Add a real, reachable "shortcuts / help" surface — a `?` key or a button that opens an overlay
  listing every real shortcut, grouped sensibly. Keep it dismissible and non-intrusive.
- Consider a lightweight first-visit hint (not a blocking tutorial) pointing at the help surface,
  dismissible and not shown again once seen (localStorage flag).
- If Task 26's mobile redesign has landed, make sure this works on mobile too (a `?` keyboard
  shortcut is meaningless on a phone — needs a tappable entry point there).

## Explicit exclusions
Don't add new shortcuts/features — document what's real. Don't touch OCR, save parser, Gideon,
map engine.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Report the full audited list of real shortcuts
found (before your work) and confirm each one is now represented in the in-app help. `npm run
dev`: demonstrate opening the help overlay and using at least 2 shortcuts from it.
