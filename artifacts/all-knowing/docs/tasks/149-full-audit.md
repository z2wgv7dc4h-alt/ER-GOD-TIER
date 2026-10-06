# Task 149 — Comprehensive read-only audit: is the project ready?

READ-ONLY: do not edit any tracked file. Scripts go in `.scratch/149/`; the only committed file is
`docs/tasks/149-report.md` (branch `task-149`). NEVER read, list or open `.env` / `.env.local`.
No dev servers, no `npm install`. Read first: `README.md`, `HANDOFF-CLAUDE.md`, `docs/ARCHITECTURE.md`,
`docs/DATA-CATALOG.md`, `DATA.md`, `docs/tasks/147-report.md`, `docs/tasks/148-report.md`.
Reuse `.scratch/147/` scripts if present. The user plays on PS5 (phone photos of the TV, no save
access): judge features by whether they work for a PS5 player.

## A. Gates (run each ONCE, record numbers)
`npx tsc -b`, `npx vitest run`, `npm run lint`, `npm run build`, `npm run audit:pages`,
`npm run audit:links`, `npm run audit:progress`, `npm run audit:inference`, `npm run coverage:entities`,
`npm run data:offline`. Check `package.json` for any other `audit:*`/`check:*` scripts and run them.

## B. Data (entity-index.json + aliases)
1. Completeness vs the game's name tables (`public/sourced/open/text/*Name.json`): per table, real
   names and how many resolve (record or alias). List unresolved real names (skip cut/upgrade tiers).
2. Per kind field coverage (description, region, coords, picture incl. `src/data/image-index.json`
   runtime match, stats, drops); compare with the 147 report numbers (better/worse).
3. Quality: template/filler descriptions (`in Elden Ring.`, `a melee armament`, `The is a`), raw
   ids or map codes (`m60_`, `npcs:`, `c1234`) shown as names/locations, wrong-kind records,
   duplicates (same kind + same normalised name), mod/Reforged content, empty pages.
4. 25 random records per kind: read them as a player would — is anything wrong, missing or odd?
5. Bosses: every GameAreaParam fight has a page; kill flags resolve; every multi-location boss
   has per-location pages; runes/drops coverage.
6. Old ids: every id in `git show 07e7eb0:artifacts/all-knowing/public/sourced/entity-index.json`
   either exists or resolves via alias — count the ones that now go nowhere, with examples.

## C. App
1. Routes/sections (`src/shell`, `src/library`): list each screen and what data it uses; any
   screen reading a file that no longer exists or a field no longer produced.
2. PS5 photo path (`src/lib/ps5Capture*.ts`): run its tests; does OCR text resolve to entities via
   the alias plane for sample game strings (20 names from the game tables)?
3. Progress/inference: what the 6 audit:progress scenarios cover; any kind of record that can't be
   marked done.
4. Builds (`build:*`) untouched and still rendering (count vs master `878fb28`).
5. TODO/FIXME/skipped tests (`it.skip`, `describe.skip`): list them.
6. Docs: README/HANDOFF claims that are now false.

## Report `docs/tasks/149-report.md` (also print it)
Start with a one-paragraph verdict: READY / NOT READY and why. Then A–C with numbers and examples.
Then "MUST FIX before ready" (ranked, each with file + evidence) and "NICE TO HAVE". State anything
you could not check. No fixes.
