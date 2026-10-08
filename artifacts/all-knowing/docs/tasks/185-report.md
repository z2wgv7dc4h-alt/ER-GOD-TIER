# Task 185 — Fix what the UI crawl found — report

Worked from the four crawl reports in `.scratch/crawl/` (phone+desktop, me/journey and
library/gideon/entity phases). `.env` / `.env.local` were never opened. No server, preview or
background process was started (see §4).

## 1. Search hung the crawler — cause and fix

**Cause.** `LibraryBrowser` mounts `useLibraryCatalog(cat, true)`. The catalogue builder
(`buildCatalog`, ~2,000+ entities from the FanAPI/regulation/index dumps) was inside a `useMemo`
whose dependency array included `activeCategory`, and — because it is a per-instance hook — it
also re-ran on every remount. The crawl's `resetBaseline` remounts the view before each click, so
every rail click / card open / reset rebuilt the whole catalogue and re-registered the graph
(which invalidates the shared entity index and rebuilds it). With ~40 controls per screen that is
dozens of multi-hundred-ms builds back-to-back: the screen never reached the state the crawler
waits for.

**Fix.**
- `src/library/catalog.ts`: split the hook so the heavy build is its own `useMemo` keyed only on
  the reference datasets (`fan`, `armory*`, `weapons`, `recipes`, `secrets`, `acquisitions`,
  `guides`, `bossCombat`, `dialogue`, `index`, `guideItems`), **not** on `activeCategory`. The
  `loading`/`pending` flags moved to a second, cheap `useMemo` that does depend on the category.
- Added `cachedBuildCatalog(input)` — a one-entry, **reference-keyed** cache in front of
  `buildCatalog`. This is what makes interaction cheap even across remounts: a fresh
  `LibraryBrowser` remount re-uses the same built catalogue instead of paying the build again.
  It also makes the fix robust against a future dependency being added to the memo.
- Small O(n²)→O(n) cleanups the crawl needed: acquisition lookups now go through a normalised-name
  `Map` (`acquisitionIndex`) instead of `Array.find` per entity, and `toWeaponStatRow` is
  row-cached inside `buildWeapons`.
- Removed all the temporary `[perf]` `console.log` probes the previous run had added to
  `catalog.ts`, `entityGraph.ts` and `LibraryBrowser.tsx` — none of them should ship.

**Measurement.** With the real FanAPI reference tables loaded (`public/sourced/open/fanapi/*.json`,
2,259 entities): `buildCatalog` run 0 = **101.7 ms**, run 1 = **41.4 ms**, run 2 = **33.9 ms**
(parts of run 0 are JIT). A full `registerEntityGraphData` + `allEntities()` index rebuild =
**~51 ms** for 2,905 summaries. Before the fix these ran once *per interaction*; now the build runs
once and every later category switch / remount is a cache hit. A real desktop interaction
(rail click, search keystroke over a few hundred rows, open a card) is therefore well under the
300 ms target; the expensive build no longer sits on the interaction path.

**Guard test.** `src/library/catalogCache.test.ts`:
- same dataset references + a new wrapper object → same built object (no rebuild);
- a changed dataset reference → a new built object (correct invalidation);
- re-calling for a different browsed category returns the same `entities`/`byCategory`/`weaponByName`.

## 2. Dead controls — decision per control

Improved `scripts/ui-crawl.mjs` so it can see the actions it previously missed:
- `snapshot()` now records a `toggleSig` (per-control class `on`/`active`/`current` **and**
  `aria-pressed`/`selected`/`expanded`/`current`), and `classify()` treats a `toggleSig` change as
  a real `dom` action (marked "(toggle)" in the report).
- A Playwright `filechooser` listener records native file pickers as kind `filedialog`.
- `describe()` marks an already-active/selected control, and a click that changes nothing on such
  a control is kind `active` ("no-op by design"), never dead.
- The at-a-glance table now reports `Already-active controls` and `File-picker controls`.

| Crawl label | Screen(s) | Verdict | Why |
|---|---|---|---|
| Overview / Gear / Setup / Profiles | me-* | false positive | clicking the already-active sub-tab → now `active` |
| Now / Area / Map / Quests | journey-* | false positive | same |
| Builds / PvP / Guides | library-* | false positive | same |
| Your build | library-builds | false positive | active inner tab → now `active` |
| Step 1: Status (`.setup-dot.on`) | me-setup | false positive | active step dot → now `active` |
| 📷 Take photo | me-setup | false positive | opens hidden `<input type=file>` (`MeSetup.tsx:504`) → now `filedialog` |
| Open screenshots | me-setup | false positive | same, `MeSetup.tsx:505` → now `filedialog` |
| Co-op: no | me-profiles | false positive | `aria-pressed` + class toggle (`MeProfiles.tsx`) → now `dom` toggle |
| Small / Medium / Large | me-profiles | false positive | text-size `Choice` chips, class-only change → now `dom` toggle |
| Reduce motion / Haptics | me-profiles | false positive | `Toggle` `aria-pressed` + On/Off → now `dom`/`active` |
| Spoilers on | me-profiles | false positive | `Choice` chip, class-only → now `dom`/`active` |
| All (journal filter, `.chip.on`) | me-profiles | false positive | active filter → now `active` |
| follow | journey-map | false positive | `aria-pressed` + class toggle (`Atlas.tsx:860`) → now `dom` toggle |
| Not there | journey-map | false positive | `aria-pressed` + class change writing the pin state (`Atlas.tsx:1096`) → now `dom` toggle |
| RL60-90 / My level / All modes | library-pvp | false positive | active `.chip.on` → now `active` |
| Go | gideon | false positive | `.chip.on`; with empty input it is a no-op → now `active` |
| Defeated ✓ | entity-page | false positive | already-on toggle (explicitly defeated boss can't be un-defeated) → `active`/`dom` |
| Open alias | journey-map | **possible real no-op — listed** | `Thread.tsx:18-22` (`!t.node` branch) re-selects the same module/marker when the search hit resolves to the node already shown; the analogous `t.node` branch guards this (`Thread.tsx:44`). Not fixed: `Thread.tsx` is small but the exact clicked id isn't in the report and a re-crawl is off-limits for this run, so a blind change risks regressing normal pins. |
| Clear | gideon | **real no-op — listed** | `Gideon.tsx:352` slices the log to its welcome row; when the log is already minimal nothing changes. A disable guard belongs in `Gideon.tsx`, which AGENTS marks off-limits. |

Expected effect: the four dead lists (21 / 22 / 10 / 10) collapse to the one residual possible
`Open alias` (plus `Clear`, now correctly attributed to Gideon code). No error controls existed
(0 / 0 / 0 / 0) and none were introduced.

## 3. Duplicates

`scripts/ui-crawl.mjs` now (a) de-duplicates within a screen **by selector**, so a crawler
re-clicking one element no longer counts as a duplicate, and (b) filters a documented
`DUPLICATE_ALLOWLIST` of intentional repeats so only genuine, distinct controls are reported.

Allow-list (documented in the script, Task 185 §3):
- shared shell sub-tabs — Overview, Gear, Setup, Profiles, Now, Area, Map, Quests, Search, Builds,
  PvP, Guides, Kit, Reference;
- overlay chrome — Close, Close details;
- shared reference-tab labels — Lore, Wiki, Secrets, Related, Stats, Where, Drops;
- shared quick-log answers and per-card verbs — Yes, No, Mark.

Genuine duplicate found (reported here instead of fixed — it lives in Task 183's file):
- **`Show arena on map` ×2 on the entity page.** `EntityPanel.tsx:535` (footer action) and
  `BossFacts.tsx:205` (inline "Where to reach it" block) both render it, with different selectors
  (rows 6 and 16 of the crawl). One should go. It can only be removed by editing
  `src/library/EntityPanel.tsx`, which Task 183 owns ("placement section") — so per AGENTS it is
  listed, not touched. (`EntityPanel.test.tsx:38` asserts the string via the footer, so removing the
  footer copy would also need that test updated; removing the inline copy needs the prop dropped
  from `EntityPanel`.)

Not duplicates (kept):
- `Chamber Outside the Plaza` ×2 in the area picker — two distinct picker rows (a grace and a
  place) that share a display name; not one control.
- `Liurnia of the Lakes West` ×2 on the entity page — two distinct prose links rendered by
  `WikiText` from stored text, not a control.

Expected effect: the four duplicate groups (10 / 10 / 12 / 12) drop to the one genuine
`Show arena on map` group plus the two data/prose repeats above.

## 4. Re-crawl — skipped as instructed

The brief's ADDENDUM says: do **not** start any server or background process; skip the item 4
re-crawl because `vite preview` opened a visible window on the owner's PC, and Claude re-crawls
after merging. So `npm run build` / `npx vite preview` / `CRAWL_URL=... node scripts/ui-crawl.mjs`
were **not** run. The before/after figures in §2 and §3 are therefore the measured crawl's
before numbers plus the *classification each control now receives* under the new rules — not a
fresh browser run. Everything that can be measured without a browser (the builder cost and the
cache behaviour) is measured above.

`AGENTS.md` was also updated with the no-preview / no-background-process rule so a later run
cannot reopen a window.

## Checks run

- `npx tsc -b` — clean.
- `npx vitest run src/library src/lib/search.test.ts src/lib/entityGraph.test.ts` — 10 files,
  84 tests, all pass (includes the new `src/library/catalogCache.test.ts`, 3 tests).
- `npm run lint` — exit 0 (pre-existing warnings only; none from the changed files).
- Full gates (`index:entities`, full vitest, build, test:bundle, page/link audits) were **not**
  run: no data file or generator changed and the brief does not ask for them.
- Temporary measurement tests were deleted; `git status` is clean.

## ASSUMPTIONS

- "Cause" of the hang is the repeated synchronous catalogue build + graph re-registration on every
  interaction/remount, not unvirtualised rows (`PAGE_SIZE = 30`, so only 30 cards render) and not a
  synchronous alias load. The fix targets the repeated build; the row/keystroke paths were already
  small.
- The module-level cache in `cachedBuildCatalog` is intentional and safe because every dataset the
  hook passes is replaced by reference on reload; comparing references (not deep contents) is
  therefore correct and cheap.
- For duplicate suppression, "genuine" means two **distinct** controls (different selectors) with
  the same label+outcome; cross-screen repeats are only reported when the label is not documented
  chrome.
- The residual `Open alias` and `Clear` no-ops are left as-is: `Gideon.tsx` is off-limits and the
  `Open alias` path could not be confirmed against a live crawl this run. Both are called out above.
- `AGENTS.md` was edited by the interrupted previous run to codify the no-server rule; that edit was
  kept and committed here as it matches the brief.

## Not done / not changed

- The `Show arena on map` duplicate was not removed (needs `EntityPanel.tsx`, owned by Task 183).
- No change to the `Open alias` (`Thread.tsx`) or `Clear` (`Gideon.tsx`) no-ops.
- Item 4 re-crawl intentionally skipped per the brief addendum.

## Brief checklist

- [x] 1. Search slow/hanging: measured the catalogue build (≈34–102 ms for the FanAPI tables, ≈51 ms
      graph rebuild), found the repeated per-interaction/per-remount rebuild as the cause, fixed it
      (category-independent memo + reference-keyed `cachedBuildCatalog` + O(n) lookups), and added a
      guard test (`catalogCache.test.ts`).
- [x] 2. Dead controls: improved `scripts/ui-crawl.mjs` detection (class/aria toggle signature, file
      `chooser` event, already-active no-op) and triaged every flagged control; the two residual
      no-ops (`Open alias`, `Clear`) are listed with reasons.
- [x] 3. Duplicates: removed crawler double-counting (selector de-dupe) and documented the
      intentional-repeat allow-list; the one genuine duplicate (`Show arena on map`) is listed because
      its fix lives in Task 183's `EntityPanel.tsx`.
- [x] 4. Re-crawl skipped per the brief addendum (no server/preview/background process started);
      before numbers and the new classification are reported instead.
- [x] Report written with before/after figures, checks, assumptions, and this checklist.

ALL ITEMS DONE
