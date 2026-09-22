# Task 30 — Surface multi-profile support in the UI

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md` first.
`src/lib/vault.ts` already has a full `Profile` type and `addProfile`/`switchProfile`/
`deleteProfile`/`activeProfile` — `HANDOFF-CLAUDE.md` §6 P3 #30 confirms the backend has existed
since before this project's current task series started, but it was never surfaced in the rail
UI. "A household is more than one Tarnished" (`SCOPE.md` #3). Scratch work → `./.scratch/`
(gitignored), never `/tmp`/`%TEMP%`. Personal project — no license-gating on data/code.

## Objective
Add a real profile switcher to the app shell (rail on desktop; check what Task 26's mobile
redesign lands as before assuming a specific mobile pattern — coordinate by reading its final
shell structure, don't fight it) using the existing `vault.ts` functions. Create, switch, rename,
delete profiles; each profile has its own `Character` + evidence, fully isolated.

## Requirements
- Use `vault.ts`'s existing functions — don't add a second profile system.
- Profile switcher visible from every room, not buried in a settings-only screen.
- Switching profiles must not leak state between them (test this explicitly).
- If Task 26 (mobile redesign) has already landed on master when you start, build against its
  shell structure. If not, build against the current desktop rail and note that the mobile
  presentation may need a follow-up once 26 lands.

## Explicit exclusions
Don't touch OCR, save parser, Gideon, map engine, or vault.ts's actual persistence logic — UI only.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Real tests: create 2 profiles, add facts to one,
confirm the other is unaffected, switch back, confirm first profile's facts persisted. `npm run
dev`: demonstrate creating, switching, renaming, deleting a profile.
