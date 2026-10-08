# Rules for coding agents (opencode / DeepSeek)

All-Knowing is an Elden Ring companion PWA (React + TypeScript + Vite). The owner plays on **PS5**:
no save access; the app learns state from phone photos of the TV, manual entry and inference.
Your task brief is in `docs/tasks/<N>-*.md`. Do exactly what it says; nothing extra.

## Never
- Never read, list, cat, grep or open `.env` / `.env.local` (they hold a private API key).
- No `npm install`, no dev servers or previews (`npm run dev`, `vite`, `vite preview`), no `git push`, no merging
  branches. Never start background/detached processes (`Start-Process`, `start`, `&`): they open visible
  windows on the owner's PC. Even if a brief asks for a server, don't — say so in the report.
- Never edit, remove or relabel builds (`build:*` records, build data) or Gideon code.
- Never hand-edit generated files: `public/sourced/entity-index.json`, `public/sourced/aliases.json`,
  `src/data/aliases.json`, `docs/PAGE-AUDIT.md` etc. Change the generator and regenerate.
- Never invent game text. Every name/description/value must come from a file on disk. No template
  sentences ("X is a … in Elden Ring.", "X is a hostile creature encountered in …"). Empty beats fake.
- Never loosen, skip or delete a test to make it pass. If a count legitimately changed, update that
  number only and say so in your report.
- The local game install is read-only and vanilla; refuse to run extractors if `ER_MOD_DIR` is set.

## Save tokens (important)
- Never print or read whole large files. `src/lib/entityIndexBuild.ts` is ~3,900 lines and
  `public/sourced/**/*.json` files are MBs: use grep / `rg -n` and read line ranges only.
- Inspect JSON data with a small `node -e` / python script that prints counts and a few examples,
  never the raw file.
- Don't re-read files you already read; don't re-run commands whose output you already have.
- Keep command output short (`| tail`, `| head`, `grep`).

## Testing
- While working: only `npx vitest run <the test files you touched>` and `npx tsc -b`.
- Run the full gates only if the brief says so, and only ONCE at the end:
  `npm run index:entities`, `npx vitest run`, `npm run lint`, `npm run build`, `npm run test:bundle`,
  `npm run audit:pages`, `npm run audit:links`.

## Where things are
- Data on disk (check here before calling anything "missing"): `docs/DATA-CATALOG.md`, `DATA.md`.
  Main sources: `public/sourced/**` (game text tables in `open/text/*.json`, regulation params,
  wiki-db, Fextralife, FanAPI, checklists), the Fandom wiki dump `.scratch/er-mcp.db` (sqlite), and
  `vendor/elden-ring-map/data/`.
- Entity index builder: `src/lib/entityIndexBuild.ts` (`npm run index:entities`).
- Aliases / name resolution: `scripts/gen-aliases.mjs`, `src/lib/aliases.ts`, `src/lib/canonicalNames.ts`.
- Bosses: `scripts/build-boss-roster.mjs`, `src/data/bosses.json`, `src/knowledge/catalog.ts`.
- Pages: `src/library/` (`EntityKinds.tsx`, `pageModel.ts`); search: `src/lib/search.ts`.
- Architecture: `docs/ARCHITECTURE.md`.

## Finish
- Commit on your branch after each step, with a clear message.
- Write the report the brief asks for, with: what changed (before/after numbers and examples),
  final check results, **ASSUMPTIONS** (every decision the brief didn't state), and anything not done
  and why.

## Completion contract (checked by a supervisor script)
- Your brief's items are a checklist. Do EVERY item. Do not stop after some of them.
- The report must end with a checklist: one line per brief item, `[x]` done or `[ ] not done — <reason>`.
- Only when every item is `[x]` (or genuinely impossible, with the reason), write the final line
  `ALL ITEMS DONE`. Without that line the run is treated as unfinished and resumed.
- Commit often (after each item) so a crash or restart loses nothing.
