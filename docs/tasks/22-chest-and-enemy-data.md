# Task 22 — Chest/gathering item data + real enemy table (not just bosses)

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first, plus
`DATA.md` for the current `public/sourced/` data inventory.

A real Elden Ring install now exists on this machine
(`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\`) and `erdb` extraction is
already proven working in this repo (Task 17 pulled real `NpcParam` boss combat stats via it —
see `src/lib/enemy.ts` and `public/sourced/npc-combat.json`). The user has explicitly asked for
more of the game's underlying data to be filled in — specifically chest/pickup facts and regular
(non-boss) enemy data are still open per `HANDOFF-CLAUDE.md` §6 P2 items 18–20:

- #18: `ItemLotParam_*` chest facts from `world-lots.json` — not addressed
- #19: Query-load `msb-enemies.json` — not addressed
- #20: Gathering nodes (21k, nameless AEG) — not addressed

`public/sourced/open/world-lots.json` should already exist in this repo from an earlier ingestion
pass — check it before re-fetching anything. `src/lib/enemy.ts` already has the loader pattern
(`effectiveDamage`/`bestDamageType`) for boss combat data from Task 17 — follow that same
established pattern for regular enemies rather than inventing a new one.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Two related but separable pieces of data completeness work:

1. Turn `world-lots.json` (or a fresh `ItemLotParam_*` extraction if that file doesn't already
   have what's needed) into real, queryable chest/pickup facts consumable by the Codex/catalog —
   "this chest in this location contains this item," not just a name dump.
2. Extend the enemy table from boss-only (Task 17's `npc-combat.json`) to cover regular field
   enemies too, sourced from `msb-enemies.json` (query-load it if it doesn't already exist —
   `erdb`'s MSB extraction, same tooling Task 17 already proved out) so the Build lab's "what
   should I hit this with?" question (`SCOPE.md` item #8) works against real field enemies, not
   just named bosses.

## Requirements

- Check what's already in `public/sourced/open/` and `public/sourced/` generally before
  re-extracting — this repo already has several open-dump JSON files (`world-lots.json`,
  `enemies.json`, `boss-xyz.json`, etc. — see the network request list in `docs/MAP-ENGINE.md` or
  just `ls public/sourced/open/`). Don't duplicate data that's already there under a different
  file name; extend/wire the existing files if they already have the raw data but no consumer.
- Chest facts: each entry needs at minimum a location/coordinate reference (reuse the existing
  coordinate/pin system in `src/knowledge/graces.ts` / `bossPins.ts` / `coords.ts` rather than
  inventing a third), the item(s) it can contain, and enough of an id to dedupe against the
  existing item catalog (`src/knowledge/catalog.ts`).
- Enemy table: follow `src/lib/enemy.ts`'s existing shape for boss combat data — same fields
  (absorb/resistances/poise/etc per `SCOPE.md` item #8's requirements: "absorb, stance,
  resistances, status") — so Build lab code can consume both boss and regular-enemy rows through
  one interface rather than two incompatible ones.
- Wire at least one real consumer for each: chest facts should surface somewhere in Codex or the
  Atlas pin detail view (your call which, given what's cleanest given current code); enemy data
  should extend Build lab's existing boss-matchup panel (Task 17/19's work) to also answer
  "what's strong/weak against a Cave enemy" or similar for non-boss enemies.
- If the raw extraction turns out too large to wire fully in one pass (MSB enemy placement data
  can be huge), it's fine to scope down and say so explicitly in your report — partial real data
  wired end-to-end beats an ambitious half-broken pipeline.

## Explicit exclusions

- Don't touch the map engine, save parser, OCR, or Gideon/LLM code.
- Don't rebuild the existing boss combat table (Task 17's `npc-combat.json`/`enemy.ts`) — extend
  it, don't replace it.
- No new UI framework — match existing Codex/Build-lab visual style.

## Acceptance criteria

- `npx tsc -b` and `npm run lint` pass.
- Real tests for any new parsing/loading logic (not just "file exists" checks — verify actual
  field values against something checkable, the way Task 17 spot-checked Malenia's resistances).
- `npm run dev`: demonstrate at least one real chest lookup and one real non-boss enemy lookup
  working through the UI, describe what you checked in your report.
- Report before/after counts (how many chest facts, how many enemy rows) the way prior tasks have
  (Task 18's 89→226 catalog facts, Task 16's 7→42 golden seeds, etc.) — a number with no context
  isn't useful, but the delta is.
