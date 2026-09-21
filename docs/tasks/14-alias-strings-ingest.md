# Task 14 — Pull alias strings from Elden Refs / Carian Archive

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `docs/AWESOME-RESOURCES.md`, and
`docs/SCOPE.md`'s item 2 ("Alias plane"). A research pass already found both sources — read it at
the literal relative path `../../docs/research/ingest-jobs-sources.md` from your current working
directory (`artifacts/all-knowing`); use that exact relative path, don't construct an absolute
one. That memo flagged this job as blocked on license verification for both sources — **that
gate is lifted**: this is a personal, educational, non-commercial project, use the data. Still
don't reproduce any surrounding lore/description prose verbatim if either source includes it
alongside the plain names — names/ids are functional data either way, prose is a separate
concern.

## Objective

Generate `aliases.json` (or extend the existing alias system, your call after reading
`src/lib/aliases.ts` — it currently only covers graces and bosses per Task 06) with name-string
coverage pulled from Elden Refs (`https://ihascats.github.io/Elden-Text/`) and/or Carian Archive
(`https://github.com/AsteriskAmpersand/Carian-Archive`), per the "Alias plane" shape SCOPE.md
describes: engine id, slug, FMG name, aliases.

## Requirements

- First check for redundancy: `public/sourced/open/names.json` already has ~6,820 EN FMG names.
  Determine whether Carian Archive/Elden Refs add anything beyond that (JP names, a different id
  scheme, categories not covered) before duplicating work — the research memo flagged this as an
  open question, answer it.
- If the sources are genuinely redundant with what's already ingested, say so and stop rather
  than doing make-work — report that finding instead of forcing a deliverable.
- If they add real value, extend `src/lib/aliases.ts`'s pattern (the same `canonicalFactId`-style
  resolution already built for graces and bosses) to cover whatever new category the added names
  unlock — don't build a third, differently-shaped alias mechanism.
- Keep the output format consistent with the existing `hosted-graces.json`/`hosted-bosses.json`
  convention in `src/data/`.

## Explicit exclusions

- Don't touch the boss/grace alias logic Task 06 already built unless you're genuinely extending
  it to a new category — don't refactor working code as a side effect.
- No UI changes.

## Acceptance criteria

- Either a genuine new alias data file + resolver extension exists and is tested, or a clear
  written finding that the sources were redundant with existing data (either outcome is a valid
  result of this task — don't force output if there's nothing new to add).
- `npx tsc -b`, `npm run lint`, `npm test` all pass if any code changed.
- Final report states which outcome occurred and why.
