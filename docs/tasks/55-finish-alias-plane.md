# Task 55 — Finish the alias plane

## Context

Repo root is `artifacts/all-knowing/`. Read `docs/ALIAS-PLANE.md`, `src/lib/aliases.ts`,
`scripts/gen-aliases.mjs` (or the current generator), `public/sourced/aliases.json`,
`src/lib/search.ts`, `src/lib/infer.ts` (`prefixKind`), and `HANDOFF-CLAUDE.md` §5 fact-id
dialects.

Task 06 aliased graces + bosses. Task 23 generated an aliases plane. This task is the
completeness pass: PC live map still speaks `grace:{paramRow}` / `bossflag:{n}` while Reckoning
and Gideon speak `grace:elleh` / `boss:godrick`. Missing-only Atlas and "I'm done" break across
that seam.

Independent of Tasks 52–54. Can run in parallel with 56, 58, 59, 60, 62.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

One generated `aliases.json` covering grace, boss, invader, hunt, and the goods/items the
catalog actually cares about.

## Requirements

- Regenerating is `node scripts/gen-aliases.mjs` (keep that entrypoint; create it if missing).
- Sources already in-repo: `checklists/graces.json` (418), `open/boss-xyz.json`,
  `checklists/hunts.json`, `catalog.ts`, `open/names.json`, paramdex name dumps. Do not fetch new
  remotes unless a file is missing, and if you fetch, clone into `./.scratch/`.
- Every catalog slug must resolve from at least one engine/dump id when a dump id exists for
  that entity.
- `canonicalFactId(engineId)` and `canonicalFactId(slug)` return the same slug.
- `searchSync("church of elleh")` and `searchSync("elleh")` hit `grace:elleh`.
- Do not put 10k lot ids into `searchSync`. Lots stay Codex-only.
- Keep `prefixKind` buckets unchanged unless you add a prefix that already has a documented
  bucket.
- Tests: `aliases.test.ts` — Elleh row id ↔ slug; Godrick kill flag ↔ `boss:godrick`; at least
  50 graces from `graces.json` have a slug **or** an explicit unmatched list written to
  `docs/ALIAS-PLANE.md`.
- Honest unmatched report in the task output: count of warps with no slug, bosses with no slug.
  Do not silently drop them.

## Explicit exclusions

- No UI redesign.
- No inventing coordinates.
- No `regulation.bin` unpack if `markers.json` / `graces.json` already exist.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- `node scripts/gen-aliases.mjs` is deterministic (second run, no diff).
