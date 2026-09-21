# Task 02 — Canonical data layer from erdb

## Context

Read `PROJECT_BRIEF.md` at the repo root first. Task 01 (scaffold) should already be done and
reviewed — if `src/`, `package.json`, and a working `npm run dev` don't already exist, stop and
report that instead of proceeding.

## Objective

Build the item/boss/location data layer for the app, sourced from
[EldenRingDatabase/erdb](https://github.com/EldenRingDatabase/erdb) (MIT license — confirm the
license file still says MIT before using it; report back if it's changed).

## Requirements

1. Investigate erdb's actual output format: its hosted API (`api.erdb.wiki/v1/`), its pip
   package, and/or its Docker image. Pick whichever integration path is most reliable for a
   **static, offline-capable app** — most likely: use erdb (via its API or by running its
   generator) to produce local JSON files vendored into `src/data/catalog/` at build time,
   rather than fetching from the live API at runtime (the app must work offline). Document
   which path you chose and why in `THIRD_PARTY_NOTICES.md`.
2. Cover at minimum: weapons, armor, talismans, spells (sorceries + incantations), ashes of war,
   spirit ashes, and Sites of Grace / key locations, scoped to base game + Shadow of the
   Erdtree (per `PROJECT_BRIEF.md`'s locked world coverage — exclude Nightreign or other spinoff
   content if erdb includes it).
3. Write TypeScript types for each catalog category in `src/data/types.ts` (or split per
   category) — the shape should be driven by what erdb actually returns, not guessed.
4. Write a small ingestion script (e.g. `scripts/sync-catalog.mjs` or `.py` if it needs to call
   erdb's Python tooling) that regenerates `src/data/catalog/*.json` from erdb, so the data can
   be refreshed on future patches. Document how to run it in a `scripts/README.md`.
5. Strip prose/flavor text per `PROJECT_BRIEF.md`'s licensing policy — keep numeric stats,
   names, categories, locations; drop or heavily paraphrase any lore descriptions if erdb
   includes wiki-sourced prose.
6. Cross-check a handful of entries (5–10 weapons, a few bosses) against
   `_reference/tarnished-ledger-legacy/src/data/catalog/*.json` for sanity — flag any major
   discrepancies in your final report rather than silently picking one.
7. Add the erdb attribution entry to `THIRD_PARTY_NOTICES.md`.

## Explicit exclusions

- Don't build any UI in this task — data layer only.
- Don't fetch from the live erdb API at app runtime for core data (offline-first requirement);
  runtime API calls are only acceptable for something explicitly non-essential and clearly
  network-gated with a fallback.

## Acceptance criteria

- `src/data/catalog/` contains populated JSON for every category listed above, with a
  consistent, typed shape.
- `npm run typecheck` still passes.
- `THIRD_PARTY_NOTICES.md` has a complete erdb entry.
- A short written report (in your final response, not a new file) stating: which erdb
  integration path was used, total item counts per category, and any data-quality concerns
  found during the cross-check.
