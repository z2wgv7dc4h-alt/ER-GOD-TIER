# Task 23 — Generate the real `aliases.json` from a live game extract

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first, plus
`SCOPE.md` item #2 ("Alias plane") in full — it is the most load-bearing open item left:

> One generated `aliases.json` after extract. Every other plane keys off the slug. This is the
> last real blocker between Reckoning and the live map.

Today the alias system (`src/lib/aliases.ts`) is hand-authored/curated for graces and bosses
(Task 06's work). What's still missing is the *generated* half described in `SCOPE.md`: a real
`aliases.json` produced by an actual extraction pass over the game's param tables and FMG text,
mapping `engineId` (e.g. `grace:10000800`) → `slug` (e.g. `grace:elleh`) → `fmgName` (e.g.
"Church of Elleh") → alias strings, for every fact category — not just graces and bosses, but
items, quests, and everything else the catalog covers.

A real Elden Ring install exists on this machine
(`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\`) and `erdb`/param extraction is
already proven working here (Tasks 09 and 17). Task 14 already investigated the FMG-name side of
this and found the two sources it checked (Elden Refs, Carian Archive) redundant with
`names.json` already in-repo — read that finding (`docs/research/` if it exists, or the Task 14
run log) before re-doing that specific comparison.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Produce a real, generated `public/sourced/aliases.json` (or wherever fits the existing
`public/sourced/` layout best — check `DATA.md`) covering the full breadth of the fact catalog
(`src/knowledge/catalog.ts`'s prefix kinds: grace, boss, quest, item, invader, etc.), each row
shaped like `SCOPE.md`'s example:

```
engineId   grace:10000800
slug       grace:elleh
fmgName    Church of Elleh
aliases    elleh, church of elleh
```

Wire it into `src/lib/aliases.ts` / `canonicalFactId` / `searchSync` so every fact category gets
real alias matching, not just graces and bosses.

## Requirements

- Reuse the existing extraction tooling this repo already has proven out (erdb, the param/FMG
  readers Tasks 09/17 already used) rather than building a new pipeline from scratch.
- The generated file must be reproducible from the local game install — document the exact
  command(s) to regenerate it (README or a `docs/` note), the same way `vendor/elden-ring-map`'s
  tools are documented, since this file is derived-from-the-game-install and should follow the
  same gitignore convention as `vendor/elden-ring-map/data/markers.json` if it's large/game-asset-
  derived — check with the existing `.gitignore` reasoning before deciding whether to commit it or
  document it as regeneratable-only. State your reasoning either way in your report.
- `canonicalFactId` (currently id-based matching for bosses per Task 06, but per
  `HANDOFF-CLAUDE.md` #28 "not audited across every fact category") should be extended to use the
  new generated aliases for every category it covers, not just graces/bosses.
- Don't break the existing hand-curated alias data for graces/bosses — the generated file should
  supplement/replace the generation step, not the curation that's already been verified correct.

## Explicit exclusions

- Don't touch the map engine, OCR, save parser, or Gideon/LLM code.
- Don't re-litigate Task 14's FMG redundancy finding unless you find it's actually wrong — if you
  do find it's wrong, say so explicitly and explain what changed.

## Acceptance criteria

- `npx tsc -b` and `npm run lint` pass.
- Real tests: alias lookup round-trips for a sample across every fact category (not just grace/
  boss), including at least one item and one quest.
- Report the regenerate command, file size/row count, and before/after alias coverage per category
  (how many facts had zero generated aliases before vs after).
- `npm run dev`: demonstrate `searchSync` correctly matching an alias for a category that
  previously had none (e.g. search for an item by a colloquial name, not its exact catalog name).
