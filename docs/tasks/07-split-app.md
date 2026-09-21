# Task 07 — Split App.tsx into room files

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first.
Run this task **after** Task 06 (alias table / tests / CI / honest empty states) has been run
and reviewed — both tasks touch shared code paths and running them out of order risks conflicts.

`src/App.tsx` (771 lines) is called out in `HANDOFF-CLAUDE.md` as "a god file — split rooms when
you touch UI." It currently contains the shell (rail/stage/guide layout, `WorldRibbon`,
`CharacterCard`, and more) plus inline definitions for at least `MapWorkspace`, `BuildWorkspace`,
`QuestWorkspace`, `CodexWorkspace` (referenced from a room switch — confirm the full list by
reading the file). Separate top-level room components already exist as their own files
(`Atlas.tsx`, `Reckon.tsx`, `Gideon.tsx`, `FirstSit.tsx`, `Thread.tsx`, `QoL.tsx`) — follow that
existing convention, don't invent a new file-organization scheme.

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
