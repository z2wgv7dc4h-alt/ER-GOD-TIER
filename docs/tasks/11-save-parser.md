# Task 11 — Real PC `.sl2` save parsing

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `ARCHITECTURE.md`, and
`docs/REVIEW.md` (this is its explicit #5 "product order" item, right after the AR port in Task
10). `src/lib/save.ts` is a thin stub today — read it, it already names the exact target:

> "The production parser should be adapted from `EthanShoeDev/elden-ring-compass`
> `packages/save-parser` (pure TypeScript, runs in a worker, never writes the file back). Do not
> upload `.sl2` anywhere. File System Access / input[type=file] only."

That's the spec. This task is filling in `ingestSave()` for real.

**Clone into `./.scratch/` inside this repo first (gitignored), never `%TEMP%` or any path
outside the project** — a headless run cloning into system temp will silently auto-reject (the
permission allowlist only matches Windows-style backslash paths, not the forward-slash paths a
git-bash shell produces for the same location).

## Objective

Replace the stub in `src/lib/save.ts` with a real, local, read-only `.sl2` parser adapted from
`EthanShoeDev/elden-ring-compass`'s `save-parser-ts` package (published as
`@elden-ring-compass/save-parser-ts`), producing a real `Character` from an uploaded save file
instead of the current hardcoded demo-character passthrough.

## Requirements

- **Check the actual license file in the `elden-ring-compass` repo before vendoring anything** —
  an earlier check of the repo's page didn't turn up a clear license; don't assume MIT, confirm
  it. If it's not a permissive license (MIT/Apache/BSD) compatible with this project's licensing
  policy (see the outer project's `PROJECT_BRIEF.md`), stop and report rather than vendoring code
  under an incompatible license — port the *format understanding* (BND4 container, event-flag
  tables, checksum/key handling) into an original implementation instead if needed, citing the
  format documentation rather than copying code.
- Parse: character stats, inventory-adjacent progression (bosses defeated, event flags), graces/
  map markers, matching what `HANDOFF-CLAUDE.md` describes elsewhere as the `Character` shape
  (`defeatedBosses[]`, `discoveredGraces[]`, `collectedItems[]`, `completedQuestSteps[]`) — read
  `src/types.ts` for the exact target shape, don't invent a parallel one.
- **Must run entirely client-side** (a Web Worker per the existing comment is fine and probably
  right for a binary-parsing workload) — no upload, no server round-trip, matching this project's
  explicit "no uploading saves" rule (`HANDOFF-CLAUDE.md` §1 "Must/Non-goals").
- **Read-only.** Never write back to the file. Don't add any save-editing capability even if the
  upstream library exposes one — `HANDOFF-CLAUDE.md` explicitly refuses "save editing / cheating"
  as a non-goal.
- Feed parsed facts through the existing `applyFacts()` pipeline (`src/lib/infer.ts`) with
  evidence source `'save'`, not a new bespoke ingestion path — this project's fact/evidence model
  already exists and expects everything to flow through it (per `ARCHITECTURE.md`: "Gideon
  mutates it only through `setCharacter` / `applyFacts`" — the save parser should follow the same
  discipline even though it's not Gideon).
- Multi-character save files: `.sl2` files hold up to 10 character slots. Decide (and document)
  whether v1 handles slot selection or just takes the first populated slot — check if
  `EngineCharacter`/`EngineState` in `src/lib/mapEngine.ts` already has a slot-selection pattern
  from the live engine path you should mirror for consistency, rather than inventing a different
  UX for the same concept.
- Alias resolution: parsed flag/marker ids from the save will be in whatever id dialect Compass's
  parser produces — run them through `canonicalFactId()` (`src/lib/aliases.ts`, extended by Task
  06 to also cover bosses) rather than assuming they already match the seed catalog's `kind:slug`
  format.

## Explicit exclusions

- No save editing, no item spawning, no flag writing — parse only.
- No OCR, no map tiling/engine work — unrelated to this task.
- Don't build new UI beyond what's needed to wire a real result into whatever upload UI already
  exists in `Reckon.tsx` or elsewhere for the PC save-drop entry point (check what's there first
  — per `HANDOFF-CLAUDE.md`, a stub entry point already exists in the rail).

## Acceptance criteria

- Uploading a real `.sl2` file (you may need to ask the user for a sample, since there's no
  local game install to generate one from — say so in your report if you couldn't test against a
  real file and instead relied on the upstream library's own test fixtures) produces a
  `Character` with real, non-demo stats and fact lists.
- Confirmed no network request is made during parsing (check the network tab / add a test that
  asserts no `fetch`/`XMLHttpRequest` fires from the parse path).
- Confirmed nothing about the parser can write to or modify the original file.
- `npx tsc -b` and `npm run lint` pass.
- `THIRD_PARTY_NOTICES.md` updated with the license actually found (not assumed) for whatever was
  ported or referenced.
- Final report: license finding for `elden-ring-compass`, whether you tested against a real save
  file or fixtures only, and the multi-slot decision you made.
