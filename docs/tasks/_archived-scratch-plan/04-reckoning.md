# Task 04 — Reckoning (the front door)

## Context

Read `PROJECT_BRIEF.md` at the repo root in full, especially **"Reckoning — the front door."**
Task 03 (knowledge fact graph + `Character` state with provenance) must already exist and be
reviewed — stop and report if `src/knowledge/catalog.ts` or the character store's `facts` map
with provenance don't exist yet.

## Objective

Build Reckoning as the app's **default pane on open** — the interview + screenshot-triage flow
that gets a PS5 player (who has no save file to hand over) into a populated `Character` state.
PC players keep a save-drop entry point in the rail/sidebar (a stub route is fine for this task —
real `.sl2` parsing is a separate future task; don't block Reckoning on it).

This task is UI + matching logic, not OCR. Per the brief: **the reliable loop right now is
manual and must stay real** — screenshot stored in-tab → player confirms the screen type →
player types the names they can read → matcher → inference receipts shown. Do not fake or skip
the confirm/type step, and do not stub in fake OCR output.

## Requirements

### Interview

A short flow, four questions, in this order:
1. Platform (PS5 / Xbox / PC — this determines whether save-drop is even offered).
2. Starting class — full class list, must include Heavy Knight and Idus Knight by name (cross-
   check exact naming against `src/data/catalog/` from Task 02).
3. How far the map has opened — a simple staged picker, Limgrave through Shadow (of the
   Erdtree), not a free-text field.
4. Which shardbearers are dead — multi-select against the shardbearer facts in
   `src/knowledge/catalog.ts`.

Each answer writes fact(s) into the `Character` state with source `"answer"`, then runs the
implication resolver from Task 03 and shows the player what got inferred (don't apply facts
silently with no feedback).

### Screenshot triage

Let the player attach screenshots (file picker + drag-drop; a live phone camera capture is a
nice-to-have, not required). For each screenshot:
1. Store it in-tab (local, not uploaded anywhere — this must stay local-first, no backend for
   this feature).
2. Player confirms which screen type it is, from this fixed list (priority order, matches the
   brief): **Warp list** (every named grace reachable — the single best capture), **Map** (gold
   pins vs. fog), **Great Runes / key items**, **Pickup banner**, **Remembrance / "legend
   felled."**
3. Player types the names they can actually read off the image (free text, one name per line or
   similar — don't require perfect formatting).
4. Run those typed names through a matcher against `src/knowledge/catalog.ts` (and
   `src/data/catalog/` where relevant, e.g. matching a grace name). Fuzzy-match reasonably
   (typos, partial names) but surface ambiguous matches to the player for confirmation rather
   than silently guessing wrong.
5. Confirmed matches write facts with source `"screenshot"`, carrying the screen type and the
   raw typed text as provenance. Run the implication resolver and show what got inferred, same
   as the interview step.

### Receipts view

Somewhere reachable from Reckoning (or the Character/Ledger page), show the full fact list with
its provenance — source type, and for inference, which fact triggered it. This is the "why do
you think this?" surface the brief requires; it doesn't need to be fancy, a filterable list is
enough.

### Rail entry point for PC save-drop

Add a sidebar/rail entry "Import PC save" that routes to a stub page (placeholder UI: "drop your
ER0000.sl2 here," no real parsing logic yet — that's a future task). Reckoning must not be the
only door in; this one just doesn't need to work yet.

## Explicit exclusions

- No OCR/image recognition — typed-by-player names only, per the brief.
- No real `.sl2` save parsing — stub route only.
- Don't touch `src/data/catalog/` (Task 02) or `src/knowledge/catalog.ts` (Task 03) content in
  this task beyond what's needed to wire the matcher — this is a UI/flow task.

## Acceptance criteria

- On first load (no existing character), the app opens directly to Reckoning, not to Atlas/Codex.
- Completing the four-question interview visibly populates the Character's fact list, including
  at least one inferred (not directly answered) fact shown to the player.
- Attaching a screenshot, confirming its type as "Great Runes / key items," and typing "Godrick's
  Great Rune" results in: the Great Rune fact recorded with source `"screenshot"`, plus Margit-
  dead and Stormveil-graces-reachable inferred and shown, matching the Task 03 worked example.
- The receipts view shows a mix of `"answer"`, `"screenshot"`, and `"inference"` sourced facts
  after a normal walkthrough of the flow, each traceable to what produced it.
- The rail's "Import PC save" entry exists and routes correctly, clearly labeled as not yet
  functional.
- `npm run typecheck` and `npm run lint` pass. Describe or screenshot the interview flow and one
  screenshot-triage cycle in your final report.
