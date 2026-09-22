# Task 61 — Generate catalog facts from markers.json

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` (P1 Atlas + catalog notes),
`DATA.md`, `src/knowledge/catalog.ts`, `vendor/elden-ring-map` tools, `docs/ALIAS-PLANE.md`.

Run **after** Task 55 so slugs and engine ids agree. Skip-if no extract: do not fail CI on a
machine without Elden Ring.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Preflight

If `vendor/elden-ring-map/data/markers.json` does not exist, run nothing destructive. Report
"blocked on extract" and exit successfully after writing the generator so it accepts that file
when present. Do not commit `markers.json` (gitignored, FromSoftware-derived).

## Objective

A generator that turns extracted markers into catalog-compatible `Fact` stubs the interview and
Gideon can name.

## Requirements

- Script: `scripts/gen-catalog-from-markers.mjs`
- Output: `src/data/generated-facts.ts` (or json) imported by `catalog.ts` and concatenated
  **after** authored facts.
- Authored facts win on id collision. Generator must not overwrite story / lockout `implies`.
- Kinds: grace, boss, item (key / pickup markers only — skip clutter like every raw material
  node).
- `campaign` tag `base` vs `sote` from the map/world field the markers already have.
- `implies[]` left empty unless an authored rule exists. Do not guess `implies` from name
  proximity.
- Cap what `searchSync` loads: generated facts may be searched in Codex; `searchSync` stays
  capped. If you add generated facts to `searchSync`, keep the cap and prefer warps + bosses.

## Explicit exclusions

- Do not commit tiles, `markers.json`, or regulation extracts.
- Do not invent implies / lockouts from marker names.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` pass even when `markers.json` is
  absent (`it.skipIf`).
- When `markers.json` is present: generated count reported; authored ids unchanged.
