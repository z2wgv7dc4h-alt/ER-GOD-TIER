# Task 59 — Embed-mode control audit (vendor map)

## Context

Repo root is `artifacts/all-knowing/`. Read `docs/MAP-ENGINE.md`, `vendor/elden-ring-map`
README / `web/` UI, and the HANDOFF-CLAUDE note on the embed sidebar bug (pinch-zoom and world
switcher lived inside `#sidebar`, hidden by `?embed=1`).

**This brief supersedes `43-embed-mode-control-audit.md`.** Do not run 43 and 59. If 43 already
landed, start from its audit table and only fix remaining holes.

Independent of Tasks 52–58. Touches vendor map only.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Audit every user-facing control in the vendor map UI. Anything that only lives in `#sidebar` is
gone in Atlas (`?embed=1`).

## Requirements

For each control: name, where it lives now, visible in embed yes/no, what you did.

Must be reachable in embed (floating copies, same pattern already used for world switcher +
category filters):

- world / plate switch (overworld, underground, shadow, ashen if present)
- category filter checkboxes
- search / find marker if it exists
- player / save slot indicator if it exists
- zoom +/− if pinch is the only zoom on desktop embed
- any "missing only" / found toggle that the engine owns

Do not break desktop non-embed. Generalize builders to populate every matching element, not one
id.

Touch targets >= 40px on the floating embed copies.

If embed controls overlap All-Knowing's mobile bottom tab bar, pad the iframe. Do not rewrite
Atlas room logic otherwise.

## Explicit exclusions

- Do not rewrite EldenRingMap.
- Do not ship tiles or `markers.json`.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` from `artifacts/all-knowing`.
- Written audit table in `docs/MAP-ENGINE.md`.
