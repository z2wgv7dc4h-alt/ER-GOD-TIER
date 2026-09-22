# Task 54 — Screenshot / paste inference chains

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` §7, `SCOPE.md` ("What done for
the MVP actually is"), `src/lib/ocr.ts`, `src/lib/infer.ts`, `src/Reckon.tsx`,
`src/lib/aliases.ts`, `src/lib/search.ts`, and Task 21 notes in `HANDOFF-CLAUDE.md`.

**This brief supersedes `45-screenshot-inference-chains.md`.** Do not run 45 and 54. If 45
already landed, audit what it added and only fill gaps — do not create a second closer.

Run **after** Task 53 so the Fingerslayer / Nokron / millicent fact ids exist.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Named evidence (OCR hit, warp-list paste, typed item) closes the world through real implication
chains, and never beats a direct deny. A Fingerslayer shot marks Nokron progress. A Great Rune
page marks that shardbearer. A warp-list paste marks those graces true without a second
interview.

## Requirements

1. `src/knowledge/inferChains.ts`

   ```ts
   { whenFact: string; implies: string[]; unless?: string[]; confidence: number; why: string }
   ```

   Seed chains (must include, using slugs that exist after Task 53):

   - Fingerslayer → Ranni Nokron-open / the catalog's existing Nokron beat
   - Godrick Great Rune held → `boss:godrick` (do not also mark "activated" unless the catalog
     distinguishes it)
   - Radahn Great Rune → `boss:radahn`
   - Rennala Great Rune → `boss:rennala`
   - black knifeprint / knifeprint-given → Rogier knifeprint beat
   - Haligtree secret medallion left **or** right implies only that half; Haligtree gate only
     when **both** are true
   - Pureblood Knight's Medal → Varré cloth done
   - Mimic Tear ashes → Mimic Tear / Nokron beat already in the catalog
   - Black Whetblade → Nokron Night's Sacred Ground progress
   - Twinned set / D-dead evidence → Fia line advanced; do **not** infer Fortissax

   Only add a chain if the target fact id exists. Skip and list omissions in the report rather
   than inventing slugs.

2. `closeWorld` / `applyFacts` already walks seed `catalog.implies`. Reuse that path. Chains are
   extra `implies`, not a second closer. If it is cleaner to put `implies` on the catalog rows
   themselves, do that **and** keep a readable `inferChains` table so Gideon can explain "I
   inferred X because you have Y".

3. Reckoning:
   - Warp-list paste (Task 34, per-line) must apply grace facts through aliases + `applyFacts`.
   - OCR hits that resolve via `searchSync` / aliases become `source: 'screenshot'` evidence and
     `applyFacts`.
   - Low-confidence OCR still must **not** become facts (Task 21 contract).
   - After a batch apply, show the inferred extras as a short "also marked" list the user can
     undo.

4. Conflict rules (Task 24) stay in charge. Inference never beats save flag or explicit deny.

5. Tests with the mid-run fixture: applying Fingerslayer implies the Ranni Nokron beat; applying
   only Godrick's Great Rune does not mark Morgott; `deniedFacts` containing `boss:radahn` plus
   an applied Radahn Great Rune keeps the deny winning and records loser evidence.

## Explicit exclusions

- Do not train a new OCR model or add icon-template matching. Names only.
- Do not read screenshot pixels as map fog = false. Fog is unknown (`docs/PS5-ATLAS.md`).
- Do not touch vendor map or AR.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- Unit tests for the chains + the conflict winner rows above.
- Report: which chains you could not add because the fact id does not exist.
