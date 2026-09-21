# Task 06 — P0 hardening: aliases, tests, CI typecheck, honest empty states

## Context

You're continuing **All-Knowing**, a local-first Elden Ring companion PWA, at
`artifacts/all-knowing/` (this is the repo root — `cd` there before running anything). Read, in
order: `HANDOFF-CLAUDE.md`, `ARCHITECTURE.md`, `DATA.md`. Do not throw away the kernel described
there. This task covers HANDOFF-CLAUDE.md §6 items **1, 3, 4, 5** from the P0 list (item 2, split
`App.tsx`, is a separate task — don't do it here, it'll conflict).

**Already fixed, don't redo**: `src/lib/worldState.ts` had two calls to the 2-arg `st(c, id)`
helper made with only 1 arg (should've used the local `q(id)` wrapper) — this crashed the
`<WorldRibbon>` component on every load. Fixed. `src/Gideon.tsx`'s two `setLog` calls had a role
type-widening error (`{role: string}` instead of the literal union) — fixed with `as const`. Run
`npx tsc -b` yourself first to confirm your starting point is clean (only pre-existing unused-var
warnings should remain: `App.tsx` `MapWorkspace`, `aliases.ts` `slug`, `gideon.ts` `c`,
`infer.ts` `uniq`, `mapEngine.ts` `StartingClass`) — clean those up as you touch nearby code, but
don't do a repo-wide unused-var sweep as its own goal.

## 1. Alias table — extend to bosses (and whatever else is missing)

`src/lib/aliases.ts` already does this well for **graces**: it canonicalizes hosted/engine grace
ids (`grace:{warpId}`) and Paramdex-derived rows against the hand-authored seed slugs in
`src/knowledge/graces.ts` (`warpGraces`), via `canonicalFactId()`, `matchAllWarps()`,
`aliasStatus()`. Read it fully — this is the pattern to replicate, not redesign.

Do the same for **bosses**: `public/sourced/open/boss-xyz.json` (215 named bosses with
clear/kill flags + XYZ) needs a canonicalization path to the hand-authored `boss:slug` ids used
in `src/knowledge/catalog.ts`'s fact graph (check `byId`/`facts` there — read `catalog.ts` before
writing anything). Same idea: normalize names, match hosted/dump rows against seed slugs, expose
a `canonicalFactId`-equivalent (or extend the existing one to also handle boss ids) so
`bossflag:530100`-style dump ids and `boss:godrick`-style authored ids resolve to the same fact.

If you find other dump-id dialects worth aliasing while you're in there (per HANDOFF-CLAUDE.md
§5 "Fact id dialects" — `shop:100056`, `lot:10007850`, guide's `weapon-bolt-of-gransax` style),
note them in your final report but don't scope-creep into aliasing everything — bosses are the
named P0 gap.

## 2. Tests

Add tests for, at minimum:
- `prefixKind` (`src/lib/infer.ts`) — every prefix branch (`grace`/`point` → grace,
  `boss`/`hunt`/`bossflag`/`area` → boss, `quest`/`line` → quest, else → item).
- `searchSync` (`src/lib/search.ts`) — read it first; test it returns results across its
  documented sources (seed catalog, warps, loot, shops, boss pins, missables) and respects its
  cap (~16 per HANDOFF-CLAUDE.md §5).
- `planRoute` lockouts (in `src/knowledge/endings.ts` per HANDOFF-CLAUDE.md §2/§6 — read it,
  confirm the actual export name/location first) — test at least one real lockout scenario, not
  just a happy path.
- Vault round-trip (`src/lib/vault.ts`) — save a character, reload, confirm it matches; confirm
  `packet.ts`'s exported packet never contains `shots` (screenshots) per the "Packet has no
  screenshots" rule in `HANDOFF.md`.
- The `closeWorld`/`applyFacts` implication closure in `src/lib/infer.ts` — at least one test
  proving a multi-hop implication chain resolves and records `inference`-sourced evidence with
  the confidence/detail shape already in the code (don't redesign the `Evidence` shape, test
  what's there).

There's no test runner configured yet (`package.json` has no `test` script) — add one (Vitest is
the natural fit given Vite is already the build tool; keep the dependency footprint minimal,
this project deliberately has almost no dependencies per `package.json`).

## 3. Typecheck in CI

`HANDOFF-CLAUDE.md` flags: "this environment often lacked `node_modules/.bin`." Add a CI
workflow (GitHub Actions, `.github/workflows/ci.yml`, since this is presumably a GitHub-hosted
repo — check for a `.git` remote first and adapt if it's hosted elsewhere) that runs `npm ci`,
`npx tsc -b` (must exit clean, including the unused-var warnings — fix those as part of this
item since "typecheck in CI" implies it should actually pass), `npm run lint` (oxlint), and the
new test suite from item 2. Fail the workflow on any of those failing.

## 4. Honest empty states

Per HANDOFF-CLAUDE.md §6 item 5 and the "Ideas that look done but aren't" table in §8: OCR
(`src/lib/ocr.ts`) is an intentional empty stub, the `.sl2` save parser (`src/lib/save.ts`) is
not real, and the map engine (`src/lib/mapEngine.ts` / `er-map` SSE) is offline unless `npm run
map` is running against a local game install. Read each of those three files plus wherever their
UI surfaces (search `Reckon.tsx`, `Atlas.tsx`, `App.tsx` for where they're rendered) and confirm
each one shows an honest, clearly-labeled "not available yet" / "engine offline" state rather
than silently failing or looking broken. Where a UI already does this correctly, leave it; where
it doesn't (e.g. a blank panel with no explanation, or a control that looks interactive but does
nothing), fix the messaging. Don't implement real OCR or real save parsing here — those are
separate future tasks (`HANDOFF-CLAUDE.md` §6 items 6 and 27) — this task is about honest
labeling of what's off, not turning it on.

## Acceptance criteria

- `npx tsc -b` exits clean, zero errors or warnings.
- `npm run lint` passes.
- New test suite runs via a `test` npm script and passes.
- A CI workflow file exists and would run all of the above on push/PR.
- Boss ids from `boss-xyz.json` resolve to the same fact as their `boss:slug` counterpart via
  the extended alias path — demonstrate with a quick test or a note of the specific ids you
  verified (e.g. Godrick, Radahn, Rykard, Morgott — the four already referenced by name in
  `worldState.ts`'s `worldBanners`).
- OCR, save-parser, and map-engine-offline UI states are each confirmed honest (screenshot or
  describe each in your final report).
- Final report: what alias coverage exists now (mirror the `aliasStatus()` pattern — report
  hosted/seeded/linked counts for bosses same as graces already reports), test count added, and
  anything from HANDOFF-CLAUDE.md's other P0/P1 items you noticed was easier/harder than
  described.
