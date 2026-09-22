# Task 35 — Extend Gideon's "I'm done" to arbitrary dump ids

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md` and
`src/Gideon.tsx` first (search for `'I'm done'` / `navigateNow` / the current-objective card).
`HANDOFF-CLAUDE.md` §6 P1 #15: "'I'm done' → extend to dump ids — not addressed." Today the
"I'm done" button (visible on the current-objective card, confirmed live in the app) marks a
single planned `factId` complete via `applyFacts(w.character, [plan.current.factId], ...)`
(`Gideon.tsx`). It can't handle a step that's really satisfied by *any one of several* dump ids
(e.g. several equivalent item drops, or a step where the game tracks completion under a different
flag family than the plan step's primary id). Scratch work → `./.scratch/` (gitignored). Personal
project — no license-gating.

## Objective
Let "I'm done" (and the underlying plan-step completion machinery in `src/knowledge/endings.ts`)
accept and correctly resolve a step against a *set* of acceptable dump ids, not just one.

## Requirements
- Check `PlanStep`'s shape in `endings.ts` (Task 12's work) — extend it to optionally carry
  several acceptable completion ids where the real game data supports it, rather than forcing a
  single canonical id where none is truly canonical.
- `Gideon.tsx`'s "I'm done" handler should apply facts for whichever id(s) are actually relevant,
  using the existing `applyFacts`/`canonicalFactId` machinery — don't build a parallel path.
- Don't invent ambiguity that doesn't exist in the real game — only add multi-id support where you
  can verify from real game knowledge that a step genuinely has more than one valid completion
  marker.

## Explicit exclusions
Don't touch OCR, save parser, the map engine, or unrelated parts of Gideon.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Real tests: a step with multiple acceptable ids
resolves correctly when "I'm done" is pressed regardless of which one is actually true for the
character. Report which real steps you found and fixed this for.
