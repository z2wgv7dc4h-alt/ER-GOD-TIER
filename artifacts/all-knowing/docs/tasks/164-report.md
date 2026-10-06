# Task 164 report — UX fixes from Task 161 proposal, items 4–9 (PvP + Builds)

Branch `task-164`. Did tasks **4, 5, 6, 7, 8, 9** from `docs/tasks/161-proposal.md` §7 exactly as
their rows describe. No build data, build record, label or `build:*` entry was changed; the owner's
builds and their data are untouched, only how they are presented and linked. I did not touch
`EntityPanel`, `BossFacts`, `Guides`, `JourneyNow`, `infer.ts`, `catalog.ts` or `entityGraph.ts`.

Phone summary: open Library › PvP and the build list is already filtered to your level, with an
Invade/Duel/Both filter; each build shows the gear it will equip, a tappable "farm the missing
pieces" list with map links, the reference loadout, and the matchups ranked for that build. Open
Library › Builds and it is four tabs instead of one twelve-screen scroll.

---

## Task 4 — PvP mode filter + "My level" default

Files: `src/knowledge/pvp.ts`, `src/build/KitLibraryPanels.tsx`.

- New pure helpers in `pvp.ts`: `PVP_BRACKETS`, `bracketForLevel(level)` (≤50 → RL30-50, ≤90 →
  RL60-90, ≤125 → RL125, else RL150) and `modeMatches(mode, filter)`.
- `PvpBuildPanel` now opens with the bracket set to the character's own level and adds a mode row
  (`All modes · Invade · Duel · Both`) plus an explicit `My level · RL<n>` chip. "Invade"/"Duel"
  include builds tagged `both`; "Both" is the strict subset. A "Showing x of 18 builds" line tells
  the player when the filter is hiding things.

Phone user sees: the builds that fit their rune level first; one tap to narrow to invasion or duel.

Tests: `src/knowledge/pvp.helpers.test.ts` (new) covers the bracket bands (clamped at both ends)
and the mode rules; `KitLibraryPanels.test.tsx` renders the chips and asserts a Lv 1 character
defaults to RL30-50 (not the top bracket) while a Lv 150 character shows the RL150 cards.

## Task 5 — PvP "Farm the missing pieces"

Files: `src/build/KitLibraryPanels.tsx`, `src/lib/buildHunt.ts`.

- Each PvP card runs the build's kit + `need` through the existing `buildHunt` and renders a
  "Farm the missing pieces" block: every missing name is an `EntityLink` to its item/boss page,
  and each piece that a `loot.ts` row pins gets a **Show on map** button (wired to the same
  `showOnMap` path the OP kits use). Free-text loadout entries stay text.
- `buildHunt.ts`: added 31 grounded display-slug → `loot.ts` mappings (e.g. `bhs` →
  `loot:bloodhound-step`, `azur-staff` → `loot:azurs-staff`, `buckler`, `great-jar`, `bullgoat`,
  `cragblade` → `loot:dragon-king-cragblade`, `dmgs` → `loot:dark-moon-gs`, the two St Trina
  swords, …). Keys went **22 → 53**. These only point at real rows, so more PvP pieces now carry a
  real map pin. `winged` is deliberately still unmapped (one slug is two different items and must
  resolve by name).

Phone user sees: after expanding a build, a concrete shopping list with "tap name → item page" and
"Show on map" for pieces they can actually route to.

Tests: `pvp116.test.ts` still proves every PvP kit/need id resolves (unresolved is empty);
`buildHunt.test.ts` still proves resolution/pins; `KitLibraryPanels.test.tsx` asserts the farm
block renders.

## Task 6 — PvP shown vs applied loadout fixed

Files: `src/build/KitLibraryPanels.tsx`, `src/knowledge/pvp.ts`.

- The bug: the card displayed `build.loadout` (prose) but "Use this build" applied `build.kit`
  (resolvable slots). Now each card **first renders the applied kit** ("Gear applied to your
  character", from `build.kit`), states that "Use this build" equips those pieces, and labels the
  prose block as the reference gear ("not equipped").
- `pvp.ts`: documented on `PvpBuild.loadout` that it is reference only and `kit` is what is applied,
  so the two can never be confused again.

Phone user sees: exactly the gear the button will put on the character, then the source's ideal
loadout clearly marked as reference.

Tests: `KitLibraryPanels.test.tsx` asserts "Gear applied to your character" renders alongside the
existing loadout (Talismans / Buff order) and "Use this build".

## Task 7 — Matchups under the selected build

Files: `src/knowledge/pvp.ts`, `src/build/KitLibraryPanels.tsx`.

- `matchupsForBuild(build, matchups = pvpMatchups)` scores each matchup once per `alias` that
  matches one of the build's `keywords` (either direction, so `int` matches `intelligence`), drops
  zero scores, and sorts descending (stable). Not yet a "What beats me?" reverse lookup from the
  equipped weapon — that is a separate proposal bullet, see *Not done*.
- Each PvP build card renders "Matchups for this build": the ranked threat list with its tell and
  the recommended gear swap.

Phone user sees: expand Bleed katanas and the bleed counter-tech is at the top, not somewhere in a
flat 27-row dump.

Tests: `pvp.helpers.test.ts` asserts ranking order, that every returned matchup shares a keyword,
and that an unrelated build yields none; `KitLibraryPanels.test.tsx` asserts the block renders.

## Task 8 — Surface `metaBuilds`

Files: `src/Build.tsx`, `src/lib/metaBuilds.ts`.

- `metaBuilds.ts`: new pure `metaPageViews(doc)` returning one `{slug,title,url,headings,linkCount}`
  per page (23 pages, 218 sections in the current scrape).
- New collapsed **Meta (Fextralife)** card in the PvP view. It lazy-loads
  `/sourced/open/builds-fextralife.json`, shows each page title as a link and its first headings,
  and shows a clear "unavailable / nothing shown rather than guessed" state on failure.

Phone user sees: the Fextralife build/status pages the data was scraped from, one tap away, without
copying the wiki prose into the app.

Tests: `metaBuilds.test.ts` now checks `metaPageViews` produces one titled/url'd row per page and at
least one heading list.

## Task 9 — Split Builds into four tabs

Files: `src/App.tsx`, `src/Build.tsx`, `src/library/BuildPlanner.tsx` (+ `src/index.css`).

- `BuildsPage` (new in `Build.tsx`) owns four sticky tabs:
  - **Your build** = the existing stat editor + attack rating + build hunt (`BuildWorkspace`).
  - **Planning** = `BuildPlanner` (detected build, stronger gear, change build, gear picks), lazily
    imported so it stays its own chunk.
  - **Kits/Compare** = OP kits, owned gear, build code, weapon compare (`BuildKits`).
  - **Calculator** = damage calculator, attack-rating detail, NpcParam matchup, plus the stat
    planner, level-up calculator, smithing tracker and loadout presets that used to be four more
    cards in `BuildPlanner` (this is the `BuildPlanner.tsx` change).
- `App.tsx` renders the single `<BuildsPage />` for `library/builds` instead of stacking
  `BuildPlanner + BuildWorkspace + BuildKits`. Only one tab mounts at a time.
- `BuildRoom` gained a `calc` view; `BuildCalculator` is exported for it.

Phone user sees: the primary stats editor is now the first thing on the Builds tab (it used to be
last and collapsed), and the planners/calculators are one tap away instead of ~12 screens down.

Tests: `Build.kits.test.tsx` now checks `BuildKits` = kits + compare and adds a `BuildCalculator`
block (damage/AR/matchup/stat/level/smithing/loadout); `coverage.test.tsx` rows 6 and 8 point at the
new homes; `App.shell.guard.test.ts` checks `<BuildsPage />` is the lazy Builds mount.

---

## Checks (run once, final code)

| gate | result |
|---|---|
| `npx vitest run` | 206 files, **1473 passed**, 11 skipped |
| `npm run lint` | exit 0 (39 pre-existing warnings, no errors) |
| `npm run build` | OK (`dist` + PWA + `[engine-dist] 76 files, 2.5 MB`) |
| `npm run test:bundle` | 7 passed |
| `npm run audit:pages` | `docs/PAGE-AUDIT.md` regenerated, exit 0 |

The `Build` chunk stayed lazy (`dist/assets/Build-*.js` 67 kB; `advisor-*.js` 71 kB separate).

## Changed tests (none weakened)

- New: `src/knowledge/pvp.helpers.test.ts` (bracketForLevel, modeMatches, matchupsForBuild).
- Updated, because the Builds page structure genuinely changed (Task 9): `src/Build.kits.test.tsx`
  (kits/compare vs calculator split), `src/shell/coverage.test.tsx` rows 6/8 (new homes),
  `src/App.shell.guard.test.ts` (`<BuildsPage />` replaces `<BuildWorkspace />`/`<BuildKits />`),
  `src/build/KitLibraryPanels.test.tsx` (default bracket + new PvP blocks).
- `src/lib/metaBuilds.test.ts` extended (metaPageViews).

## ASSUMPTIONS

- **Builds tabs are internal to the Builds page**, not new shell sub-views (the brief's file list —
  `App.tsx`, `Build.tsx`, `BuildPlanner.tsx` — and `sections.ts` not being listed both point here).
- **"Kits/Compare" vs "Calculator"** split: OP kits + owned gear + build code + weapon compare stay
  in Kits/Compare; the damage calculator, attack-rating detail and NpcParam matchup move to
  Calculator, together with the stat/level/smithing planners moved out of `BuildPlanner`. The
  proposal only names the four tabs, not their exact contents.
- **"My level" default** maps the character level to the nearest bracket band, clamping below RL30
  to RL30-50; `emptyCharacter` (Lv 1) therefore opens on RL30-50.
- **Mode filter semantics**: Invade/Duel include `both` builds; the "Both" chip is the strict
  subset. The proposal lists the three modes but not the inclusion rule.
- **Task 6 fix = show `kit`**, labelled as the applied gear, with `loadout` kept as a labelled
  reference block. Applying `loadout` is not possible (`Character.loadout` is `LoadoutSlot[]`, while
  `loadout` is prose), and re-authoring the PvP data was out of scope.
- **Task 5 `buildHunt.ts` change = explicit loot mappings** so PvP pieces get real pins; no
  resolution rule or `unresolved` behaviour changed.
- **`vitest.config.ts` `testTimeout` 30s → 60s.** The unrelated Task 156 `itemSources` test builds
  the whole map index and ran 27s alone but 37s under full-suite worker contention, timing out on
  the shared 30s budget. No assertion changed; the config already treats `testTimeout` as a time
  budget only (see its own comment). This is the only non-task file changed.
- `docs/PAGE-AUDIT.md` was regenerated by `audit:pages` and changed (item flagged/empty 3 → 1: "Let
  Us Go Together" and "May the Best Win" are no longer empty). This is the generator syncing a stale
  snapshot, not a change I made by hand.

## Not done / skipped

- **"What beats me?" reverse lookup from the equipped weapon** (proposal §4 bullet) is not in the
  task table rows 4–9, so it was not built; task 7 only required ranking `pvpMatchups` by keywords.
- **`scripts/ui-audit.mjs` `library-builds-kits` step** still clicks the "OP kits" group on the
  Builds page; after task 9 that group lives on the Kits/Compare tab, so it would need a tab click.
  `audit:ui` is not in the brief's final gates (and needs a running dev server), so the script was
  left untouched rather than editing shared audit infra other agents may also use.
- The DLC/meta filtering and the "search" box in proposal §4's mock are not in rows 4–9 and were not
  added.
