# Task 15 — NPC display cards from the EanNewton stats sheet (cosmetic only)

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `docs/REVIEW.md`, and
`docs/SCOPE.md`'s item 8 ("Enemy absorb table") **carefully** — this task exists because of an
explicit warning in those docs, and getting the scope wrong defeats the point.

**Read this twice before starting**: `docs/REVIEW.md` says *"Zullie NPC stats sheet is
player-model NPCs, not `NpcParam` absorb. Label it that way in the lab or it will lie about
Malenia."* A research pass (at the literal relative path `../../docs/research/ingest-jobs-sources.md`
from your working directory — use that exact relative path, don't construct an absolute one)
confirmed the EanNewton NPC stats sheet (URL in that memo) is the **same category of source**:
player-model/cosmetic data (character model, animation set, appearance), **not** combat stats
(absorb, resistances, poise, stance). The project's real combat-stats need (for the Build lab's
"what should I hit this with" question) is `NpcParam` from ERDB, a completely different source,
not yet actionable without a local game install.

The user has confirmed this job is authorized to proceed — but **scoped to cosmetic display
only**. Do not let this data anywhere near combat calculations.

## Objective

Import the EanNewton sheet's player-model/cosmetic NPC data as a small, clearly-labeled
`src/knowledge/npc-display.ts` (not `npc-stats.ts` or anything that could be confused with combat
stats — naming matters here) for use as flavor/display cards (e.g. an NPC's appearance/model
notes shown in the Codex or Thread view), with zero connection to any Build lab or combat-facing
code path.

## Requirements

- Fetch the sheet (public Google Sheet — work out a CSV/export URL or parse the page, same
  approach question as Task 13).
- Parse and import only cosmetic/display fields (character model notes, appearance, whatever the
  sheet actually contains — read it first, don't assume its columns).
- Name the file, the export, and any UI label unambiguously as cosmetic/display data — e.g. a
  code comment at the top of `npc-display.ts` stating explicitly: *"Player-model/cosmetic data
  only. NOT combat stats. Do not use for absorb/resistance/damage calculations — see
  docs/REVIEW.md."* This comment is not optional; it's the whole point of scoping this task the
  way it's scoped.
- If you wire it into any UI (a Codex NPC card, say), label it there too — something like "Model
  notes" or "Appearance," not "Stats," so a player never reads it as combat information.

## Explicit exclusions

- **Do not touch the Build lab, `estimateAR`, or any combat/damage calculation path** — this data
  must never feed into attack rating, resistances, or "what should I hit this with" logic. If
  Task 10 (Build lab AR) has already landed, double-check this task's output isn't accidentally
  imported anywhere near it.
- Don't rename or repurpose this as a stand-in for the still-missing ERDB `NpcParam` combat data
  — that's a separate, not-yet-actionable future task, not something this sheet can substitute
  for.

## Acceptance criteria

- `src/knowledge/npc-display.ts` (or equivalent) exists, clearly commented as cosmetic-only, with
  real data from the sheet.
- Grep-confirm in your final report that nothing in `src/lib` or any Build-lab-adjacent code
  imports this new file — it should only be reachable from display/Codex-style UI, if wired in at
  all.
- `npx tsc -b`, `npm run lint`, `npm test` pass.
- Final report: what the sheet actually contained, how it was fetched, and explicit confirmation
  this was kept isolated from combat stats.
