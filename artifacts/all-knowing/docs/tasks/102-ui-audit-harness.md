# Task 102 — Automated phone playtest + UI audit harness

We need a repeatable way to check "does it work and is it clear on a phone" without a human.

## Tooling

- Add devDependency `playwright-core` (NO browser download). Launch the installed browser:
  `chromium.launch({ channel: 'msedge' })`, falling back to `channel: 'chrome'`.
- Script `scripts/ui-audit.mjs`, npm script `"audit:ui": "node scripts/ui-audit.mjs"`. It expects the dev
  server at `http://localhost:5173` (env `AUDIT_URL` overrides) and does not start one.
- Output to `.scratch/ui-audit/<timestamp>/`: one PNG per step (`NN-step-name.png`, viewport-only, not
  full page) and `report.json` + `report.md`.

## Runs

Run the scenario twice: **phone** 375×812 (`isMobile: true, hasTouch: true, deviceScaleFactor: 2`)
and **desktop** 1440×900. Fresh `localStorage` each run (new context).

## Scenario (a fresh PS5 player). Each step = action + screenshot + audit

1. Open `/` → landing view.
2. Tarnished › Overview.
3. Tarnished › Update (or Setup if present) — set stats by typing into the stat editor (VIG 15,
   MND 10, END 12, STR 12, DEX 18, INT 9, FTH 8, ARC 10) and level 30 if a level field exists.
4. Omnibox/search: type "Margit", screenshot results; open the first boss hit.
5. Journey › Now (top), then scroll the main scroll container to 50% and 100% and screenshot each.
6. Journey › Map — wait for the iframe or plate; screenshot; tap the world selector if present.
7. Journey › Quests.
8. Library › Search — empty state; click category "Weapons"; toggle "I meet requirements"; open the
   first result's detail panel; screenshot; close it.
9. Library › Builds (top + scrolled), Library › Kit, Library › Reference.
10. Gideon — type "where is moonveil" + Enter, wait up to 8s, screenshot; then "what should I do now".

Every step must not throw; failures are recorded in the report, and the run continues.

## Audit per step (in-page `page.evaluate`)

- **Overlap**: every visible interactive element (`a, button, input, select, textarea, [role=button],
  [role=tab], [tabindex]`) whose bounding box intersects another visible interactive element's box by
  >4px² where neither contains the other → report both (selector path + text).
- **Tap size** (phone only): interactive elements smaller than 40×40 CSS px → report.
- **Off-screen / clipped**: interactive elements partly outside the viewport horizontally; any
  horizontal scroll on `document.scrollingElement`.
- **Covered**: for each interactive element, `document.elementFromPoint(center)` is not the element
  or a descendant → "covered by <selector>".
- **Dead links**: `a[href=""]`, `a[href="#"]` without an onclick, buttons with no text and no
  aria-label.
- **Tiny text**: visible text nodes with computed font-size < 11px.
- **Console errors** and failed network requests during the step.
- **Page length**: scrollHeight of the main scroll container ÷ viewport height (report > 4 screens).

`report.md`: a table per run: step · screenshot file · counts per issue type, followed by the top 15
issues per type with selector + text. Keep it deterministic and de-duplicated.

Acceptance: `npm run audit:ui` completes against the running dev server and writes the report;
`npx tsc -b`, `npm test`, `npm run lint` still pass (exclude `scripts/ui-audit.mjs` from tsc if needed).
Commit is NOT allowed; report back the path of the output folder and the report.md summary table.
