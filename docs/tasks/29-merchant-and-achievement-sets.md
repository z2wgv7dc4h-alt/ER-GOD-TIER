# Task 29 — Merchant conditional stock, achievement-shaped item sets, gathering nodes

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first.

Three related, still-open data/product gaps from `HANDOFF-CLAUDE.md` §6 and §7, bundled since
they're all "more of the catalog, wired to real consumers" work rather than new architecture:

- §7 (product ideas still valid): "Merchant 'who sells X after I give Y scroll.'" — `findSellers`
  (`src/lib/gideon.ts`, used by the router) already answers static "who sells X," but nothing
  handles *conditional* stock — merchants whose inventory changes after the player gives them an
  item (a scroll, a bell bearing) or reaches a story beat. This is real, common Elden Ring
  knowledge (Twin Maiden Husks after bell bearings, Isolated Merchant's stock changes, etc.).
- §7: "Cookbook / bell bearing / whetblade / crystal tear sets (achievement-shaped)." Task 16
  already did this for golden seeds (7→42) and sacred tears (confirmed 12/12) — extend the same
  treatment to cookbooks, bell bearings, and whetblades, which are still just loose catalog
  entries with no "N/total, here's what's left" tracking the way Task 16 built for seeds/tears.
- §6 P2 item 20: "Gathering nodes (21k, nameless AEG) — not addressed." Lower priority than the
  other two in this task — attempt it if time allows, report honestly if it's cut for scope.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Extend the catalog and the merchant/achievement-tracking code with real, wired data for
conditional merchant stock and cookbook/bell-bearing/whetblade completion sets, following the
exact pattern Task 16 already proved out for golden seeds and sacred tears.

## Requirements

- **Conditional merchant stock**: extend `src/lib/gideon.ts`'s merchant handling (`findSellers`
  and its router branch) to answer "what does X sell after Y" questions with real, correct
  in-game knowledge — check `public/sourced/open/shops.json` (already in-repo) for what's already
  captured before adding new data; extend it if the conditional-unlock information isn't there yet.
- **Cookbook / bell bearing / whetblade sets**: same shape as Task 16's golden-seed/sacred-tear
  work — a real total count, a real per-item location/source, and a completion-tracking surface
  (Codex, following the existing `Scadutree / map fragments` section's pattern you can see in the
  live app) so a player can see "N/total cookbooks, here's what's left."
- Wire whatever you add to a real UI consumer (Codex, most likely, matching existing sections) —
  don't leave new catalog data with no way to see it in the app.
- If you get to gathering nodes (#20), same standard: real data, real consumer, not a dump with
  nothing reading it.

## Explicit exclusions

- Don't touch OCR, the save parser, Gideon's LLM path, the mobile layout, or the map engine.
- Don't rebuild Task 16's golden-seed/sacred-tear work — extend the pattern to new item
  categories, don't touch what's already correct.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests for any new parsing/matching logic, spot-checked against actual known game data the
  way Task 16 confirmed sacred tears at 12/12 and Task 17 spot-checked Malenia's resistances.
- Report before/after counts for each category you touch (cookbooks, bell bearings, whetblades,
  conditional merchant entries, and gathering nodes if attempted) — a number needs the delta to be
  useful, per the established reporting standard in this task series.
- `npm run dev`: demonstrate the new Codex sections rendering with real data.
