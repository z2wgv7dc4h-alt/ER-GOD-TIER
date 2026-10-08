# Task 174 — Docs + in-app Help drift (audit 171, Batch D)

Follow AGENTS.md (completion contract). Branch `task-174`. Read `docs/tasks/171-report.md` §FIX LIST
Batch D (items 14–16). You own `DATA.md`, `docs/ALIAS-PLANE.md`, `HANDOFF.md`, `README.md`,
`src/Help.tsx` (+ its test). Do NOT edit `docs/STATUS.md`, `CLAUDE.md`, `AGENTS.md`,
`docs/ORCHESTRATION.md` (Claude's). Tasks 172/173/175 are changing code/data in parallel — use numbers
from master as merged, and prefer wording that doesn't hard-code counts that change every batch (point
to the generated report instead).

1. Items 14–16 as written. 2. Every tab/section the Help names must exist in `src/shell/sections.ts` —
add a test that enforces it. 3. Broken relative links in docs = 0 (excluding Claude-owned files; list
any there). Gates once at the end.
