# Task 174 report — Docs + in-app Help drift (audit 171, Batch D)

Branch `task-174`. Did items 14–16 of `docs/tasks/171-report.md` FIX LIST Batch D, added the
Help/`sections` enforcement test, and checked doc links. All numbers below come from files on disk.

## What changed

### Item 16 — `src/Help.tsx` (Tarnished / Journey)
The "Four sections" paragraph now matches `src/lib/sections.ts`:

- **Tarnished**: `(overview / update / profiles)` → `(overview / gear / setup / profiles)` — added **Gear**
  and the real **Setup** view, dropped the `update` alias name.
- **Journey**: `(now / map / quests)` → `(now / area / map / quests)` — added **Area**.
- Follow-on: the goods-paste note `Tarnished → Update` → `Tarnished → Setup` (the `setup` sub-view is
  where the paste box lives).

### Item 2 — enforcement test (`src/Help.test.tsx`)
New test `names only sections and sub-views that exist in the shell model`:

- for every `SECTIONS` entry, asserts the section label and every sub-view label appear in the rendered
  Help, and
- parses each `Section (a / b / …)` parenthetical and asserts it equals that section's real `subs`
  exactly — so the Help can never name a tab the shell does not have, and cannot silently drop one.

`src/Help.test.tsx`: 5 passed (was 4).

> Note: the brief says `src/shell/sections.ts`; the shell model actually lives at `src/lib/sections.ts`
> (no `src/shell/sections.ts` file exists). The test imports the real module.

### Item 14 — `DATA.md` + `docs/ALIAS-PLANE.md` (alias plane)
`public/sourced/aliases.json` (identical to `src/data/aliases.json`): **7,192 rows / 1,408,173 B
(~1.34 MB)**, measured off disk. Documented before: "7,120 rows / ~1.3 MB" / "7,120 rows (~1.4 MB)".

- Removed the stale `grace-stub 359` source-mix entry and the "Task 73 warp slug stubs" prose; rewrote
  it as **warp resolution (Task 73, revised in Task 160)**: committed rows have **0** `source:
  'grace-stub'` (every warp maps to an authored grace or the index's own `grace:<warpId>` record). The
  old text claimed 354/359 synthetic stub rows that no longer exist.
- Refreshed the source mix to the real leaders from `aliases.json` (`enemy-name` 3,924,
  `game-name-table` 1,000, `legacy-id` 958, `entity-index` 360, `boss-roster` 261, then `authored` 128,
  `paramdex-npc` 115, `npc-combat` 79, `hunts` 74).
- `checklists/hunts.json` → **`src/data/hunts.json`** (what `scripts/gen-aliases.mjs` reads).
- The `~138 KB` "small enough to bundle" note → **`~1.34 MB`** (the file is 1.4 MB).

### Item 15 — `HANDOFF.md` (game text / dialogue)
- Dialogue attribution ceiling `2,129` → **`2,083`** ESD-referenced lines of 9,818. That matches
  `public/sourced/open/dialogue-owners.json` (`byLine` has 2,083 keys; `npcs` 260 / 146 speakers as the
  surrounding prose already stated) and removes the internal inconsistency at `HANDOFF.md:143`.
- **FMG count deliberately left at "36 FMG tables, 34,053 strings"** (not changed to 37 / 34,057) —
  see ASSUMPTIONS. `open/text/manifest.json` on disk reports `tableCount: 36`, `stringCount: 34,053`,
  and Task 169 verified the same.

### Item 3 — links + gates
- Markdown relative links across all 134 `.md` files: **0 broken** in owned docs; **0 broken** in the
  Claude-owned files (`docs/STATUS.md`, `CLAUDE.md`, `AGENTS.md`, `docs/ORCHESTRATION.md`), so nothing to
  list there.
- Gates run once at the end (below). `npm run audit:pages` and `npm run audit:links` regenerated
  `docs/PAGE-AUDIT.md` and `docs/LINKS-AUDIT.md`; committed as the repo does after each gate run.

## Final checks (run once)

| command | result |
|---|---|
| `npm run index:entities` | 5,621 records; the only diff vs committed was the `generatedAt` timestamp (all 5,621 records byte-identical), so the regenerated file was **reverted** (no content change) |
| `npx vitest run` | **1,524 passed / 11 skipped** (1,535); one more than 171's 1,523 — the new Help test |
| `npm run lint` | exit 0 (pre-existing warnings only) |
| `npm run build` | exit 0 (`tsc -b` clean, vite build + engine-dist OK) |
| `npm run test:bundle` | 7 passed |
| `npm run audit:pages` | 5,625 entities, **0 flagged** (before 1,859); `docs/PAGE-AUDIT.md` regenerated |
| `npm run audit:links` | dead data **0**, dead renderer **0**, guard violations **0**; `docs/LINKS-AUDIT.md` regenerated |

Commits: `3ea878b` (Help + test), `36658de` (docs), `ed38fab` (regenerated audit docs).

## ASSUMPTIONS

- **`src/shell/sections.ts` does not exist**; the shell model is `src/lib/sections.ts` (the brief and the
  171 report both name the wrong path). The test and edits use the real file.
- **Item 15's "37 FMG tables, 34,057 strings" is not applied.** `public/sourced/open/text/` holds 37
  `.json` files = **36 FMG tables + `manifest.json`**; `manifest.json` itself says `tableCount: 36`,
  `stringCount: 34,053`. The audit's 37 = 37 files and 34,057 = 34,053 + the manifest's 4 top-level keys
  (`locale`, `tableCount`, `stringCount`, `tables`), i.e. `open/text/manifest.json` was counted as a
  table. Task 169's report also verified "36 FMG tables / 34,053". Per AGENTS ("values must come from a
  file on disk"; update counts only when they legitimately changed) I kept the correct 36 / 34,053.
- The alias source mix is a per-batch-generated count; I set it to the current on-disk values and kept the
  "generator's printed counts are authoritative" caveat already in the doc.
- "Broken relative link" = an inline Markdown `[..](path)` to a repo-relative file that does not resolve
  (markdown only). A stricter backticked-path-claim heuristic also flags *historical* file names inside
  `docs/tasks/**` and `docs/history/**` (renamed/removed modules and scratch scripts) and known
  gitignored/generated paths (`vendor/elden-ring-map/data/markers.json`, `.scratch/...`, `DATA/...`);
  those are records of past work, not links, so they are not counted. Owned refs like `hunt-flags.json`
  are explicitly described as deleted in the same sentence.
- `docs/PAGE-AUDIT.md` / `docs/LINKS-AUDIT.md` are generated by the gates. I regenerated and committed
  them (the 171 report asked the next batch to do so; earlier batches 160/165/166 did the same).

## Not done / could not check

- Nothing in the brief was skipped. `npm run audit:ui` / `crawl:ui` need a live dev server (forbidden).

## Checklist

- [x] Item 14 — DATA.md + ALIAS-PLANE.md: 7,192 rows / ~1.34 MB, `grace-stub` removed (now 0), `checklists/hunts.json` → `src/data/hunts.json`
- [x] Item 15 — HANDOFF.md: dialogue ceiling 2,129 → 2,083; FMG "36 / 34,053" kept correct (37 / 34,057 not applied — audit double-counted `manifest.json`; reason in ASSUMPTIONS)
- [x] Item 16 — Help.tsx: Tarnished adds Gear (drops "update", adds Setup), Journey adds Area
- [x] Item 2 — test enforcing every Help section/sub exists in the shell model (`src/lib/sections.ts`); 5 Help tests pass
- [x] Item 3 — broken relative links in docs = 0 (owned) and 0 in Claude-owned files; gates run once at the end
- [x] Report written in `docs/tasks/174-report.md`

ALL ITEMS DONE
