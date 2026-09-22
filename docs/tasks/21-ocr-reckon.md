# Task 21 — Wire real Tesseract OCR into Reckon

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first.

`src/lib/ocr.ts` is an intentional, honestly-labeled empty stub — it currently returns `''` for
any input. `HANDOFF-CLAUDE.md` §6 P1 item 6 has stood open since the project's original handoff:
"Wire Tesseract in Reckon **or** delete `ocr.ts` pretence." The user has since pushed for more of
the app's "behind the scenes" automation to actually work end-to-end, and screenshot-driven state
entry (photograph a warp list / Great Rune page / bonfire list on a PS5, paste or upload it on
Reckon, get real facts back) is one of the core v1 flows described in `SCOPE.md`'s "What 'done'
for the MVP actually is" section (steps 2–3: "Photograph a warp list and a Great Rune page" /
infer facts from it).

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%` — see the standing rule in `docs/tasks/00-README.md`.

This is a personal, non-commercial project; do not gate this work on license verification for
data or code — the user has explicitly authorized using internet sources freely here.

## Objective

Replace the `ocr.ts` stub with a real, working Tesseract.js OCR pipeline that turns a pasted or
uploaded screenshot into recognized text, and wire that text into the existing fact-inference path
(`src/lib/infer.ts`) so a warp-list or Great Rune screenshot actually populates real facts in
Reckon — not just returns raw text with no consumer.

## Requirements

- Add `tesseract.js` (or an equivalent well-maintained pure-JS/WASM OCR library that runs client-
  side, no server) as a dependency. Confirm it works in a Vite + browser + Web Worker context
  (this app is local-first, no backend) — a worker is strongly preferred so OCR doesn't block the
  UI thread.
- `ocr.ts` should expose a real async function that takes an image (File/Blob or data URL) and
  returns recognized text, replacing the current `''` stub. Keep the existing function signature
  if reasonably possible so callers don't need rewiring; adapt it if there's a real reason not to,
  and say why in your report.
- Wire the OCR output into whatever screenshot-intake UI already exists in `Reckon.tsx` (check
  what's there now — there may already be a paste/upload handler wired to the stub). The
  recognized text should flow into `infer.ts`'s existing name-matching / alias-matching path
  (`src/lib/aliases.ts`, `searchSync`) to produce real `Evidence` entries with `source:
  'screenshot'`, not just display raw OCR text to the user.
- Handle the honest failure cases: OCR confidence too low, no matches found, blurry/unreadable
  image. Don't silently claim facts from garbage OCR output — this app's whole design principle
  (per `SCOPE.md`) is distinguishing "confirmed" from "unknown," so a bad OCR read should stay
  `unknown`, not get force-fit into a false positive.
- Keep it fully client-side and offline-capable after the initial model/wasm download (per this
  app's local-first, PWA-oriented architecture) — do not add a server-side OCR call.

## Explicit exclusions

- Don't touch the save-parser (`src/lib/sl2/`), the map engine, or Gideon/LLM code — this task is
  scoped to OCR + Reckon's screenshot intake + the inference wiring only.
- Don't build a generic "upload any image" gallery feature — stay scoped to the warp-list / Great
  Rune / bonfire-list / inventory screenshot use cases already described in this app's docs.
- No new UI framework or design overhaul — match the existing Reckon.tsx visual style.

## Acceptance criteria

- `npx tsc -b` and `npm run lint` pass.
- New/updated tests cover: OCR text → alias match → real `Evidence` with correct `source` and a
  sane confidence score; low-confidence/no-match input does not fabricate facts.
- `npm run dev`: manually test with at least one real screenshot (a Great Rune page, warp list, or
  similar — take one yourself if needed, e.g. a screenshot of any in-game menu-like text, or find
  a public one) pasted/uploaded into Reckon, and confirm real recognized text appears and at least
  one real fact gets inferred from it. Describe what you tested and what came back in your report.
- Report honestly if full OCR accuracy on real game-menu fonts is poor — that's useful information,
  not a task failure, as long as the pipeline itself works end-to-end.
