# Task 36 — Wire real item/boss images into the Codex

## Context
Repo root `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md` and
`docs/REVIEW.md` first. `HANDOFF-CLAUDE.md` §6 P2 #21: "FanAPI images via `fanImage()` — not
addressed." `docs/REVIEW.md` already names `deliton/eldenring-api` (MIT-licensed JSON: weapons,
bosses, items, images — "pre-SotE-complete and not param-accurate, bootstrap Codex only"). Right
now the Codex is text/icon-driven with no real item/boss photography — a big usability gap for a
"knows everything" app: players recognize items by picture, not by catalog id. Scratch work →
`./.scratch/` (gitignored). Personal project — no license-gating on data/code.

## Objective
Wire real item/weapon/boss images into the Codex using the FanAPI (or an equivalent well-licensed
image source if you find FanAPI's coverage or terms don't actually fit — check and report either
way), so catalog entries show real pictures, not just text and generic category icons.

## Requirements
- Check whether `fanImage()` or similar already exists as a stub/placeholder (name suggests it
  might) before building fresh.
- FanAPI is pre-SotE — for DLC content, either accept the gap (base-game images only) or find a
  supplementary source; report the actual coverage you end up with, base game vs DLC.
- Cache/store images sensibly (local `public/sourced/` following the existing convention, or
  runtime-fetched with the PWA's caching from Task 28 if that's landed — check master first) so
  this doesn't become a live network dependency for every Codex render.
- Wire into real Codex entries — don't leave this as data with no visible consumer.

## Explicit exclusions
Don't touch OCR, save parser, Gideon, map engine, or the existing map-pin icon system
(`src/lib/sourcePack.ts`'s `mapIcons`) — this is Codex item/boss photography specifically.

## Acceptance criteria
`npx tsc -b`, `npm run lint`, `npm test` pass. Report exactly what coverage you achieved (X/Y
catalog items got real images) and what didn't. `npm run dev`: demonstrate real images rendering
in the Codex.
