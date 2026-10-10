# Task 197 — Builds: make it intuitive (report)

## What changed

All presentation and flow; no build data, labels or Gideon code touched.

### 1. "Your build" opens on a summary, not a collapsed panel
`src/Build.tsx` gained a `YourBuildSummary` panel rendered first on the Your build
tab, above the existing tools:

- **Character set up** (`source !== 'empty'`): heading `Lv {n} · {Archetype} build`,
  a verdict line (`buildVerdict`, e.g. `Dexterity build — next: +5 Endurance`), the
  eight stats as chips, and each equipped armament with its AR (`rating.total`).
- **No character** (`source === 'empty'`): a single call-to-action panel with
  `Set up your Tarnished (photo or manual)` → `go('me','setup')` and
  `Or pick a build to follow` → switches to the Find a build tab.
- Before: opening Your build showed only the collapsed
  `BUILD LAB · STATS & ATTACK RATING` group. After: summary first, then the same
  tools (now open) below.

### 2. Follow a build → goal, missing pieces, stat targets
- New pure helpers `src/build/buildGoal.ts` (`followBuild`, `goalBuildId`,
  `isFollowing`). `followBuild` sets only `answers.buildKit` — the existing goal
  slot — never stats or gear.
- `src/build/KitLibraryPanels.tsx`: OP kit cards and PvP build cards now show
  `Follow this build` (turns into `Following this build` when it is the goal).
  `Use this build` still applies the full spread + kit.
- When a build is followed, the Your build summary adds **Stat targets**
  (`current → target` per stat) and **Missing pieces** (icon via `iconFor()`, the
  item name as an `EntityLink`, region/`how` from `lootForName`/catalog, and a
  `Show on map` button where a pin exists).

### 3. Tab order + names, and panel defaults
- `BuildsPage` tabs are now `Your build · Find a build · Plan · Calculator`
  (was `Your build · Planning · Kits/Compare · Calculator`).
- "Find a build" hosts the OP kits, weapon compare and PvP build cards
  (new `BuildFind` view). `BuildKits`/`BuildCalculator`/`PvpWorkspace` exports are
  unchanged for existing callers/tests.
- New `src/build/PanelGroup.tsx`: `PanelGroup` + `useIsPhone` (shared 700px phone
  breakpoint). `KitGroup` (Build.tsx) and `BuildSection` (BuildPlanner.tsx) now
  default **open on desktop** and behave as a **one-at-a-time accordion on phone**.

### 4. One stats editor
- New `src/build/StatsEditor.tsx` is the single editable eight-stat grid, used by
  Your build. The Plan tab renders `<StatsEditor readOnly />`; its old editable
  "Custom stats" grid was removed (the option now points back to Your build).

### 5. Tests
- New `src/Build.yourbuild.test.tsx`: empty-state CTA, follow sets
  `answers.buildKit` and lists missing pieces / stat targets, tab labels.
- No existing test was loosened, skipped or deleted.

## Final checks

- `npx vitest run` (touched/added files):
  `src/Build.kits.test.tsx src/Build.preview.test.ts src/Build.yourbuild.test.tsx
  src/build/KitLibraryPanels.test.tsx src/library/BuildPlanner.test.tsx
  src/shell/coverage.test.tsx` → **6 files, 38 tests passed**.
- `npx tsc -b` → exit 0.

## Assumptions (not stated in the brief)

- "panel" in item 3 means the collapsible cards (`KitGroup` / `BuildSection`),
  matching the brief's item 1 use of "collapsed … panel". The four top-level tabs
  are still tabs, not stacked panels.
- "no character set up" = `character.source === 'empty'` (manual/photo setup sets
  `source: 'reckon'`; demo/save are set up).
- "Follow" sets the goal only (`answers.buildKit`); `Use this build` keeps its
  existing stats+loadout behaviour, so nothing the owner stored is overwritten by
  following.
- The verdict's "next" is the nearest not-yet-reached soft cap among the
  archetype's attributes plus Vigor/Mind/Endurance; no invented numbers.
- The "icon" in Missing pieces uses the existing `iconFor()` asset resolver
  (chrome sigil fallback), not new artwork.
- The PvP build cards are surfaced in "Find a build" through the existing
  `PvpBuildPanel`; the separate `Library → PvP` sub-view is unchanged and still
  owns matchups/tech.

## Not done and why

- The `ui-audit` script's `library-builds-kits` step clicks an "OP kits"
  `kit-group-head` on the default Builds tab. OP kits live in the "Find a build"
  tab (exactly where the brief puts them, as "Kits/Compare" did before). The audit
  script was **not** edited (AGENTS: do exactly what the brief says, don't touch
  tests/audits to pass) and this step was already not satisfiable from the old
  default tab.

## Checklist

- [x] Your build opens to a clear summary (level, stats, weapons+AR, one-line verdict), not a collapsed panel
- [x] Empty state shows one CTA ("Set up your Tarnished (photo or manual)" → Setup, "Or pick a build to follow" → kits)
- [x] "Follow this build" in Kits/Compare sets the goal
- [x] Your build then shows "Missing pieces" (icon, where to get it, Show on map) and "Stat targets" (current → target)
- [x] Tab order/names: Your build · Find a build · Plan · Calculator
- [x] Panels open by default on desktop; one-at-a-time on phone
- [x] No duplicate editors: one stats editor in Your build; Plan reuses it read-only
- [x] Tests: empty-state CTA, follow-a-build sets goal and lists missing pieces, tab labels

ALL ITEMS DONE
