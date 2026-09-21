# Task 05 — Core workspace: Ledger, Atlas, Codex

## Context

Read `PROJECT_BRIEF.md` first. Tasks 01 (scaffold), 02 (data layer, `src/data/catalog/*`), 03
(knowledge fact graph + `Character` state with provenance), and 04 (Reckoning — the default pane
that populates `Character` via interview/screenshot) should already be done and reviewed — if
they're missing, stop and report instead of proceeding.

## Objective

Build the rest of the "unified workspace" MVP around the `Character` state Task 03 defined and
Task 04 (Reckoning) populates: a Ledger view over that same state, an interactive Atlas, and a
searchable Codex. **Do not create a second character/profile store** — Task 03 already owns
that; this task is Atlas + Codex + a Ledger view on top of the existing state, plus reading the
provenance/facts model instead of a bare boolean checklist.

## Requirements

### Ledger (view over the existing Character state)

- A Ledger route/page reading the `Character` store from Task 03 (do not redefine it): switch
  between characters, create a new one, edit name/class/stats/flags (content-scope flags per the
  brief's terminology: base / SotE / "Tarnished Pack").
- Progress display should read from the `facts` map (with provenance) Task 03/04 built, not a
  separate ad hoc checklist — if a lighter-weight "did I do this" checklist item has no
  corresponding fact yet, add it to `src/knowledge/catalog.ts` rather than bypassing the
  provenance model.
- You may use `_reference/tarnished-ledger-legacy/src/store/ledger.ts` and its progress-ring UI
  as a *visual/interaction* reference only — it's our own prior work, not third-party — but the
  underlying data model is Task 03's, not a re-implementation of the legacy one.

### Atlas

- A route showing the game's regions (use `public/atlas/*.jpg` as the region images already in
  the repo) with clickable region cards/areas.
- Per-region view: list Points of Interest (Sites of Grace, bosses, key items) from
  `src/data/catalog/` location data, each toggleable against the Ledger's `checks` map so
  progress persists.
- Keep this simple for MVP — static images with an overlay list is fine; a fully panned/zoomed
  map is Phase 2, don't over-build it.

### Codex

- A route with a searchable, filterable table/grid over the full item catalog (weapons, armor,
  talismans, spells, ashes, spirits) — search by name, filter by category/type, sort by a couple
  of relevant stats per category.
- Item detail view (modal or sub-route) showing full stats for one item.

### Shell

- App-wide nav: Reckoning (Task 04, already the default/first pane — don't demote it), Ledger,
  Atlas, Codex, plus a placeholder link for Forge (next task), and the rail's "Import PC save"
  entry point from Task 04. Persistent indicator of the active character.
- Reasonable responsive layout — must work at both desktop and mobile widths (this ships as a
  PWA people will install on phones).

## Explicit exclusions

- No Forge (build calculator) yet — nav link can exist as a placeholder, don't build its content
  (Task 06 covers it).
- No real save-file parsing — that stays a stub per Task 04, not this task's job to finish.
- Don't rebuild or duplicate anything Task 04 (Reckoning) already owns as the default pane.

## Acceptance criteria

- `npm run dev`: can create a character, switch between two characters, and see the Ledger
  persist across a page reload (verify by reloading and confirming state survives).
- Atlas: clicking a region shows its POI list; toggling a POI updates and persists.
- Codex: typing in search narrows results live; filtering by category works; clicking an item
  shows its detail view with real stats from the Task 02 catalog data.
- `npm run typecheck` and `npm run lint` pass.
- Take a screenshot (or describe) of each of the three pages in your final report.
