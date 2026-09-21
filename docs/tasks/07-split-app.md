# Task 07 — Split App.tsx into room files

## Context

**Updated 2026-09-22**: this task was queued right after Task 06 but never actually run — tasks
08 through 20 all landed in the meantime, several of them (10, 17, 19) piling more into
`BuildWorkspace` specifically. Run now, based on current `master`, not the original Task 06-era
state. If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%` — see the standing rule in `docs/tasks/00-README.md`.

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first.

`src/App.tsx` is now 776 lines. `MapWorkspace` (the dead-code duplicate this brief originally
also targeted) is already gone — Task 06 removed it, superseded by `Atlas.tsx`. What's left to
extract, confirmed by reading the file's current top-level functions: `BuildWorkspace` (lines
~296–510, the largest — Task 10's AR calculator + Task 17's boss-matchup panel + Task 19's
detour wiring all live here), `QuestWorkspace` (~510–577), `CodexWorkspace` (~577–end, includes
Task 08/16's Scadutree/hunts sections and Task 15's cosmetic NPC display cards). Shell-level
pieces that should probably stay in `App.tsx` (or a small shared shell file, your call):
`EngineBridge`, `AppShell`, `WorldRibbon`, `CharacterCard`, `SaveDrop`, and the `estimateDefense`
helper. Separate top-level room components already exist as their own files (`Atlas.tsx`,
`Reckon.tsx`, `Gideon.tsx`, `FirstSit.tsx`, `Thread.tsx`, `QoL.tsx`) — follow that existing
convention, don't invent a new file-organization scheme.

## Objective

Extract each room component currently defined inline in `App.tsx` into its own file, following
the sibling convention already established by `Atlas.tsx` / `Reckon.tsx` / etc. `App.tsx` should
end up as primarily the shell/layout plus imports, not the room implementations themselves.

## Requirements

- One file per extracted room (e.g. `Build.tsx` for `BuildWorkspace`, `Quests.tsx` for
  `QuestWorkspace`, `Codex.tsx` for `CodexWorkspace` — match existing naming style, check
  whether `Atlas.tsx` already covers what `MapWorkspace` does or if they're distinct before
  assuming a 1:1 split).
- Preserve all behavior exactly — this is a mechanical extraction, not a rewrite. Don't change
  component logic, prop shapes, or the `GideonAct` → `setModule` contract described in
  `ARCHITECTURE.md`.
- `WorldRibbon` and `CharacterCard` (shell-level, not room-level) can stay in `App.tsx` or move
  to a small shared shell file — your call, but don't bury them inside a room file where they
  don't belong.
- Keep imports/exports clean — no circular imports between the new room files and `App.tsx`.

## Explicit exclusions

- No behavior changes, no new features, no fixing unrelated bugs you notice (note them in your
  report instead — a separate task can pick them up).
- Don't touch `src/lib/`, `src/knowledge/`, or `src/state.tsx` — this is a UI file split only.

## Acceptance criteria

- `npx tsc -b` and `npm run lint` still pass (should already be clean from Task 06 — if they
  aren't, stop and report rather than proceeding on a dirty base).
- Existing tests (from Task 06) still pass unmodified.
- `npm run dev`: manually click through all five rooms (Reckoning, Atlas, Build lab, Quest
  graph, Codex per the nav) and confirm each renders identically to before the split — describe
  or screenshot each in your final report.
- `App.tsx` line count reduced substantially (report before/after line counts for `App.tsx` and
  each new file).
