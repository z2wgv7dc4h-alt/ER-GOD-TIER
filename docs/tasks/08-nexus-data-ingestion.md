# Task 08 — Ingest quick-win data from the Nexus packs

## Context

Repo root is `artifacts/all-knowing/` (`cd` there first). Read `HANDOFF-CLAUDE.md`, `DATA.md`
before starting. A research pass already analyzed four Nexus Mods packs the user downloaded —
full report at `docs/research/nexus-packs-analysis.md` (path relative to the outer
`ER MASTER TOOL` folder, i.e. `../../docs/research/nexus-packs-analysis.md` from the repo root).
Read that report in full before starting this task — it has exact field names, entry counts,
and JSON structure samples for everything below. This task only covers the report's low-risk
"quick win" items; **do not attempt the map-tiling work** (separate task, `09-map-tiling.md`, a
bigger architectural lift) or touch Pack 9974 (binary mod, correctly rejected — no action).

**Extraction/scratch space: use `./.scratch/` inside this repo (already gitignored), never
`%TEMP%` or any path outside the project.** A prior run of this task failed because it tried to
`mkdir`/extract into `%TEMP%\opencode\...` and got auto-rejected — the permission system's
external-directory allowlist is pattern-matched against Windows-style backslash paths, and a
Unix-style (forward-slash, git-bash) path to the same real location doesn't match it, so the
request silently auto-rejects in a non-interactive run. Staying inside the repo avoids the
external-directory permission check entirely.

Source zips (re-extract from these, don't rely on any temp extraction from the research pass —
that may not still exist):
- `C:\Users\RIGGUSPIG\Downloads\Elden Medusa(En) 10286 1.1 2026-07-06T16-53Z UAfVnovwk.zip`
- `C:\Users\RIGGUSPIG\Downloads\EldenRingMapV1.2 10354 1.2 2026-07-15T21-46Z Qgpq1zD52.zip`
- `C:\Users\RIGGUSPIG\Downloads\COMPLETE Resource Pack-960-1-0-1651278607.zip`

## 1. Medusa Act 9 (Shadow of the Erdtree) chapter completion

`src/knowledge/medusa.ts` covers Acts 1–8 fully but only chapters 1–2 of Act 9's 8 chapters. The
research report identifies the missing six: Castle Ensis, Scadu Altus, Shadow Keep, Ancient
Ruins of Rauh, Optional Zones, Enir-Ilim (chapter ids `act9_chapter3` through `act9_chapter8`).

For each, from `data/en/act9/*.json` in the Medusa pack: take the chapter `name` (a functional
label, fine to use verbatim) and write a **short, paraphrased-in-your-own-words** one-sentence
goal — read the `mainGoal` field for what the beat actually is, then write your own sentence,
matching the style of the existing entries in `medusa.ts`. **Do not copy the `mainGoal`,
`summary`, or `lore` field text verbatim, even partially** — the pack has no license file and its
`index.html` credits a named author ("Medusa"); treat it as proprietary, same caution the
existing 24 entries already apply (per `HANDOFF-CLAUDE.md`: "Medusa: chapter titles only. Do not
paste walkthrough prose"). A paraphrased functional summary is fine; a lightly-edited copy is
not — if you're unsure whether your sentence is too close to the source, rewrite it further from
scratch based on your own general Elden Ring SotE knowledge instead of the source text.

## 2. Scadutree fragments, golden seeds, sacred tears from EldenRingMapV1.2

This pack (`DATA/scadutree_en.json`, `golden_seeds_en.json`, `sacred_tears_en.json`) is
**MIT-licensed** (license file included in the zip, confirmed by the research pass — attribute
to "CreateDDy, 2026" wherever the project tracks third-party attributions, i.e.
`THIRD_PARTY_NOTICES.md` if that file exists yet, create it if not, matching the pattern
described in the outer project's `PROJECT_BRIEF.md` licensing policy if you want the full
policy text — same spirit as everything else already ingested here).

- `src/knowledge/collectibles.ts`: currently has ~31 scadutree fragments. Merge in the pack's 41
  entries — cross-reference by coordinates/name to find the genuinely new ones (report says ~10
  new) rather than duplicating. Same for golden seeds (pack has 44, more complete than the
  current authored subset) — reconcile rather than blindly appending duplicates.
- Sacred tears: pack has 12, matching what's already there per the research report — just
  confirm the match, don't duplicate.
- Coordinate format differs from the project's existing convention (the pack uses flat map-space
  x/y pixel coordinates, param IDs like `11100`). Check how `collectibles.ts` currently encodes
  location — you likely need to project these into whatever frame it already uses, or store them
  alongside as a second reference the way graces already handle two coordinate frames (see
  `ARCHITECTURE.md`'s "Two map frames — do not mix" note) rather than guessing a conversion.

## 3. Icons from Pack 960

The pack has ~103 icons organized by prefix (`marker-*`, `location-*`, `character-*`,
`mp-status-*`, `npc-*`, plus two `icon-atlas-*.png` sprite sheets). The project currently has
only 12 in `public/sourced/pack-icons/`. Diff the filenames against what's already in
`public/sourced/pack-icons/` and `public/sourced/map-icons/` and copy over only the genuinely
new prefixes — don't duplicate what's already covered. Redistribution permission for this pack
has been confirmed cleared by the project owner — proceed without re-checking Nexus permissions
yourself. (This clearance covers *this specific asset pack's* icons/images only — it does not
extend to the Medusa pack's prose text in item 1 above, which is a separate copyright concern
about reproducing another author's specific creative writing, not a redistribution-permission
question. Keep the paraphrase requirement in item 1 regardless.)

## Explicit exclusions

- No map tiling (Task 09).
- No touching Pack 9974 — already correctly rejected, nothing to do there.
- Don't reproduce any Medusa prose text anywhere, including in commit messages or code comments.

## Acceptance criteria

- `medusa.ts` has all 8 Act 9 chapters, each with an original (not copied) one-sentence goal.
- `collectibles.ts` scadutree/golden-seed counts increased with genuinely new entries only (no
  duplicates) and sacred tears confirmed matching.
- New icons present in `public/sourced/pack-icons/` with no duplicate filenames/prefixes from
  what already existed.
- `THIRD_PARTY_NOTICES.md` (or wherever the project tracks this) has an entry for the
  EldenRingMapV1.2 MIT-licensed data.
- `npx tsc -b` and `npm run lint` still pass.
- Final report: exact counts added per category, and explicit confirmation of whether Pack 960's
  redistribution permissions were verified (and how) before any icon was copied in.
