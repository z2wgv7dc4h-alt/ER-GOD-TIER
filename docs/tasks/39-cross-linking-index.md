# Task 39 — Real cross-linking between every entity: items, bosses, quests, locations

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md`,
`src/knowledge/catalog.ts`, and `src/lib/infer.ts`'s `closeWorld`/`implies` graph first. The
fact graph already has `requires`/`grants`/`implies` edges (Task 06's kernel, Task 12's quest DAG)
— the underlying data model supports real interconnection. What's missing is surfacing it: a
player looking at an item in the Codex has no way to jump to the boss that drops it, the quest
step that needs it, or its location on the Atlas, even when that data already exists somewhere in
the app. The user's own words: "Index and mapping and linking things etc it all should be
interconnected... intuitive and incredible." Scratch work → `./.scratch/` (gitignored). Personal
project — no license-gating.

## Objective
Make every entity detail view (Codex item/boss/quest cards, Atlas pin details, Build lab boss-
matchup panel) show real, clickable links to every other entity it's actually connected to in the
data — turning the app from a set of separate lookup tables into one navigable graph, using data
that's already there.

## Requirements
- Audit what cross-references already exist in the data but aren't surfaced: `implies`/`requires`/
  `grants` edges (`catalog.ts`, `endings.ts`), boss ↔ drop-item relationships, quest-step ↔ item/
  boss/location relationships, alias-plane engine-id links (Task 23). Build a real map of "what
  can this entity actually link to" from data, don't guess or fabricate connections that aren't
  real.
- Add a consistent "related" section/component usable across Codex item cards, boss cards, quest
  steps, and Atlas pin details — one shared component, not four one-off implementations.
- Every link must be a real navigation (jump to the right room/entity, using the existing
  `GideonAct`-style `module`/`factId` navigation pattern already used elsewhere — check
  `ARCHITECTURE.md`'s contract) — not just decorative text.
- Where an entity has no real connections in the data, say so honestly (e.g. "no known
  quest ties") rather than hiding the section inconsistently or showing something misleading.

## Explicit exclusions
Don't invent new relationships that aren't backed by real data — this is about surfacing existing
graph edges, not authoring speculative new ones (that's Task 25's/29's territory for specific
content, not this task's). Don't touch OCR, save parser, or the map engine's own code.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Real tests: pick 3 real entities (an item, a boss,
a quest step) with known real-game connections and assert the related-links component surfaces
the correct ones. `npm run dev`: demonstrate clicking through item → boss → quest → map pin and
back, showing the graph is actually navigable end to end.
