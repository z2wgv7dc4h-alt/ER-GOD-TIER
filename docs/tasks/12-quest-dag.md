# Task 12 — Expand the quest DAG with real lockout edges

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `ARCHITECTURE.md`, and
`docs/SCOPE.md`'s item 7 ("Quest edges, not quest prose"). A research pass already assessed the
available sources — read it first at the literal relative path
`../../docs/research/quest-dag-sources.md` from your current working directory
(`artifacts/all-knowing`); use that exact relative path, don't construct an absolute one.

**The short version of that research**: there is no usable upstream source to port from.
`mhogeveen/er-quest-tracker` is MIT-licensed but only documents 9 of 35 NPC questlines and has no
`requires`/`grants`/`lockouts` edge fields at all — hand-translating it would cost as much as
hand-authoring fresh. The EanNewton tracker (a Google Sheet) is a cross-check for gotchas, not an
import source. **This is a hand-authoring task**, grounded in general Elden Ring knowledge and
cross-checked against that sheet, not a port.

If you do fetch anything external (e.g. checking the EanNewton sheet), **save it to `./.scratch/`
inside this repo (already gitignored), never `/tmp`, `%TEMP%`, or any path outside the project**
— writing outside your sandboxed working tree gets silently auto-rejected in headless mode and
terminates the entire run immediately, not just that step. This has already killed several other
task runs the same way.

## Objective

Extend `src/knowledge/storylines.ts` and `src/knowledge/endings.ts` from the current 4 NPC
storylines (Millicent, Alexander, Varré, Leda) to meaningfully more NPC questlines, and convert
the existing `lockout` field from a prose warning string into real graph edges.

## Requirements

- Read the current `PlanStep` type and the 4 existing storylines fully first — match the
  existing style and level of detail, don't invent a parallel schema.
- Add `requires: string[]` and `grants: string[]` fields to `PlanStep` (fact ids, same `kind:slug`
  convention as the rest of the fact graph) alongside the existing `lockout?: string` prose field
  — keep the prose (it's useful as human-readable context) but make the actual lockout a real
  edge: add `lockouts: string[]` (step/fact ids this step forecloses) so `planRoute` and any
  future "what's still available" logic can traverse it programmatically instead of just
  displaying a warning.
- Expand coverage to more of the major NPC questlines — Ranni, Boc, Nepheli/Alexander (already
  have Alexander, verify Nepheli's beats are distinct or combined), Dung Eater, Fia, Rya,
  Hyetta/Dung Eater fork, Thops, Sellen/Jerren/Lusat/Azur, Yura, Rogier, Gowry, D/Fia/Maiden,
  Corhyn/Goldmask. Pick a reasonable subset (aim for meaningfully more than 4, not necessarily
  all 35 — quality of the edge data matters more than raw count) and be explicit in your report
  about which NPCs you covered and which you deliberately left for a future pass.
- **Cross-check against the EanNewton progress tracker sheet** (URL in
  `docs/research/quest-dag-sources.md`) for known gotchas/lockout conditions, but don't try to
  scrape/import it programmatically — it's a manual reference, not a data source (per the
  research memo, licensing latitude for this personal project doesn't change the fact that a
  Google Sheet isn't a machine-parseable structured source worth building an importer for).
- Preserve and correctly encode the three already-verified test cases from the research memo:
  Alexander's Limgrave hole, Leda's Enir-Ilim/Sealing-Tree invitation window, and Ranni's
  Seluvis-blade fork — these should now have real `lockouts[]` edges, not just prose.
- Wire the new `requires`/`grants`/`lockouts` fields into whatever consumes `PlanStep` today
  (`planRoute` in `endings.ts`, per the existing task 06 tests) so the new edges actually affect
  route planning output, not just sit unused in the data.

## Explicit exclusions

- Don't touch the fact graph in `src/knowledge/catalog.ts` structurally — this task is about
  quest *steps* (storylines/endings), not the underlying fact catalog, though you'll reference
  fact ids from it.
- Don't build new UI — this is data + the `planRoute` logic consuming it.
- Don't invent flag numbers or claim game-accurate internal ids — these are authored facts like
  the rest of the seed catalog, not extracted param data.

## Acceptance criteria

- `src/knowledge/storylines.ts`/`endings.ts` cover meaningfully more NPCs than the current 4,
  each with real `requires`/`grants`/`lockouts` arrays, not just prose.
- The three named test cases (Alexander, Leda, Ranni/Seluvis) have verifiable lockout edges —
  write a test proving each: e.g. applying the fact that forecloses Alexander's line prevents his
  later steps from being reachable in `planRoute`'s output.
- `npx tsc -b`, `npm run lint`, and `npm test` all pass (extend the existing Vitest suite from
  Task 06, don't create a second competing test setup).
- Final report: which NPCs you added, total step/edge count before and after, and which
  well-known questlines you deliberately left out for a future pass.
