# Task 45 — Screenshot inference chains (item photo ⇒ "you did X")

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` §7 first — several related,
still-open product ideas: "Screenshot of inventory / Great Runes / grace list / map fog → infer
shardbearers and gates," "Bonfire list screenshot populates discovered graces," "Item screenshot
⇒ 'you have done X' (Fingerslayer → Nokron opened, etc.)." Task 21 already built real, working
on-device OCR (`src/lib/ocr.ts`) wired to alias/name matching, and Task 34 extended it to bulk
per-line warp-list matching — read both before starting. This task is about the *inference*
layer on top of that: recognizing an item and inferring what it implies, not building OCR itself.

The fact graph already has an `implies` mechanism (`closeWorld()` in `src/lib/infer.ts`, used by
`applyFacts`) — a `Fact` can already declare prerequisite facts it implies. Check whether the
existing catalog already encodes chains like "having the Fingerslayer Blade implies Nokron is
open" via this mechanism, or whether that's missing and this task should add it.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

When OCR recognizes an item name from a screenshot (inventory, Great Rune page, etc.), the
resulting fact application should correctly cascade through real implication chains — recognizing
the Fingerslayer Blade should mark Nokron accessible, recognizing a Great Rune should mark its
shardbearer defeated, etc. — using data that's genuinely true in the game, not guessed chains.

## Requirements

- Audit `src/knowledge/catalog.ts`'s existing facts for `implies` coverage on well-known real
  chains (shardbearer → Great Rune, key items → the area they unlock, remembrance → boss defeated
  if that's not already covered elsewhere). Add real, verified `implies` edges where they're
  missing — cite the actual game logic for each (e.g. "the Fingerslayer Blade is only obtainable
  after opening Nokron via the Mimic Tear / Radahn festival," verify this is actually correct
  before encoding it).
- Confirm `applyFacts`'s existing `closeWorld()` cascade already surfaces these correctly through
  OCR (Task 21's path) — if there's a gap in how OCR-sourced facts flow into implication, fix it;
  if it already works once the `implies` data exists, this may be primarily a data-completeness
  task, not a new code path. Verify which it is before assuming.
- Don't invent implication chains that aren't real — this is exactly the kind of thing that would
  silently corrupt a player's tracked state if wrong. When uncertain about a specific chain, leave
  it out and note it as a candidate for later verification rather than encoding a guess.

## Explicit exclusions

- Don't touch the save parser or the map engine.
- Don't build new OCR functionality — Task 21/34 already did that; this is about the data/
  inference layer consuming its output.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: OCR-recognized text for a known item correctly cascades to its real implied facts
  (e.g. recognizing "Fingerslayer Blade" in a screenshot results in the correct implied facts
  being set, verified against real game knowledge, not just "something got added").
- Report exactly which chains you added/verified and which you deliberately left out due to
  uncertainty.
