# Task 38 — Document live-memory / EAC caution properly

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md`, plus
`vendor/elden-ring-map/server/lib/liveMemory.js` (or wherever `--live-memory` is implemented —
check `server/index.js`'s `args.liveMemory` handling) first. `HANDOFF-CLAUDE.md` §6 P2 #29:
"Live-memory / EAC caution documentation — not touched beyond what was already there." The map
engine has an opt-in `--live-memory` flag that reads the running game's process memory for a
real-time player dot — this is exactly the kind of feature that can trip anti-cheat (Elden Ring
uses EasyAntiCheat) if a player enables it without understanding the risk. Scratch work →
`./.scratch/` (gitignored). Personal project — no license-gating.

## Objective
Write clear, accurate, prominent documentation and in-app messaging about what `--live-memory`
actually does, why it's opt-in and off by default, and the real risk profile — so a user can make
an informed choice, not stumble into it.

## Requirements
- Read the actual `liveMemory` implementation to describe accurately what it does (read-only
  memory access, what triggers it, what it doesn't do) — don't write vague boilerplate, describe
  the real mechanism.
- Document: what EAC is, why memory-reading tools carry ban risk with anti-cheat systems in
  general, that this reads (never writes) the game process, and that it's entirely opt-in (off by
  default, a separate `--live-memory` flag, not part of the default `npm run map`).
- Put this somewhere a user will actually see it before enabling the flag — a README section near
  wherever `--live-memory` is documented, and/or a warning if the app's own UI ever surfaces a
  toggle for it (check whether one exists in `Atlas.tsx` or elsewhere).
- This is a documentation/warning task — do not change how `liveMemory` itself behaves.

## Explicit exclusions
Don't touch OCR, save parser, Gideon, or any functional code — docs and, if a real in-app toggle
exists, its accompanying warning copy only.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass (should be unaffected — no functional changes
expected). Report where the documentation was added and quote the actual warning copy.
