# Task 41 — Ingest gathering nodes (P2 #20), finally unblocked

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` first, specifically item #20
under "P2 — data": "Gathering nodes (21k, nameless AEG) — not addressed (cut for scope twice:
Tasks 22, 29)." Both prior tasks cut this because they checked for the data locally and found
nothing (`msb-enemies.json` has 0 gathering entries, no Goblins gathering dump existed on disk).

**That premise is now wrong.** The data is real and fetchable right now:

```
https://raw.githubusercontent.com/VirusAlex/ERR-MapForGoblins-DLL/master/data/all_gathering_nodes_final.json
```

This returns a real ~5MB JSON array, confirmed reachable, shaped like:

```json
[{"model": "AEG099_821", "name": "AEG099_821_9000", "map": "m10_00_00_00", "area": 10,
  "p1": 0, "p2": 0, "p3": 0, "x": -90.46, "y": 15.77, "z": 24.77,
  "entity_id": 0, "instance_id": 9000}, ...]
```

~21k rows. Each row is a gathering-node **placement** (a bush/rock/pot the player can interact
with), not a named item drop — the `model` field is a generic AEG asset code (e.g. `AEG099_821`),
not a human-readable name, and there is no item/material field in this dump. Do not invent one.
This is real, honest scope: "here's where gathering nodes are," not "here's what each one gives."

This is a personal, non-commercial project — the standing project policy is to use internet data
freely, no license-gating. Scratch work → `./.scratch/` inside `artifacts/all-knowing`
(gitignored), never `/tmp`/`%TEMP%`.

## Objective

Follow the **exact pattern** Task 22 already proved out for chest facts
(`src/lib/chestFacts.ts` — read it first, this is your template): fetch/store the raw dump,
transform it into real, queryable facts with the existing coordinate frame, and wire a real UI
consumer. Do not invent a new architecture.

## Requirements

- Fetch the JSON from the URL above and save it to `public/sourced/open/gathering-nodes.json`
  (same convention as the other `open/*.json` dumps already in this repo — check `DATA.md`'s
  "Refresh" section for how other dumps are fetched/documented, and add this one the same way).
- Write `src/lib/gatheringNodes.ts` (mirror `chestFacts.ts`'s shape and style exactly): group/
  dedupe rows as needed, resolve each node's world XYZ into the existing coordinate frame used by
  `boss-xyz.json`/`grace-xyz.json` (check `src/lib/coords.ts` — do not invent a third projection),
  and attach a nearest-region label the same way `chestFacts.ts` does via `grace-xyz.json`.
- Since there's no item/name data, don't fabricate one — surface these as generic "Gathering
  node" pins/facts (by model/area, honestly labeled), not named materials.
- Wire a real consumer: extend the Atlas leftovers/coords layer pattern from Task 33
  (`src/lib/leftoverPins.ts`) or add a Codex section following Task 22's "Chests & pickups"
  pattern — your call which fits better, but it must be a real, visible UI surface, not dead data.
- Given ~21k rows is a lot to render as individual pins, consider whether clustering/limiting by
  region or a toggle is warranted — check how the existing Atlas layers handle large pin counts
  (`layerOrder`/layer toggles in `src/lib/nav.ts` and `Atlas.tsx`) and follow that pattern rather
  than dumping 21k raw markers into the DOM at once.

## Explicit exclusions

- Don't touch OCR, save parser, Gideon, or the map engine's own code.
- Don't invent item/material names for nodes — the source data doesn't have them, and Tasks 22/29
  were right to refuse to guess. If you find a *different* real source that does map node model
  ids to materials, you may use it, but cite it and verify it's real, don't assume.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: parsing/grouping logic tested against the actual fetched data (real counts, real
  region resolution), not a fixture you invented.
- Report real before/after counts (0 → N gathering-node facts) and where they're now visible in
  the app.
- `npm run dev`: demonstrate the new layer/section rendering with real data.

## How to work

Follow the git worktree + commit pattern already established in this repo's task series
(`docs/tasks/00-README.md` if present, or just: work directly, commit your changes on your
current branch with `git add`/`git commit`, write a clear final report). Run
`npx tsc -b && npm run lint && npm test && npm run build` before considering this done, and fix
any failures before reporting completion.
