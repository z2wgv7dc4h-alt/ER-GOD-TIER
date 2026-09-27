# Task 107 — Playtest fixes (seen in the Task 103 audit screenshots) + wire 105/106

The Task 103 audit reported all zeros, but its screenshots show real defects the harness exempted or
never reached. Fix the defects AND make the harness honest.

## Defects

1. **"Where are you?" area picker renders transparently over the map** (phone, Journey › Map): no
   background, its heading/text/grace buttons collide with the map, world select and zoom controls. Make
   it a proper bottom sheet on phone / popover on desktop: opaque `var(--panel)` background, backdrop
   scrim, close button, focus trap, Escape closes. It must close when the section/sub changes.
2. **The + quick-log button covers content** (the ARC stat input, "Set up your Tarnished" button, the
   bottom of the quick-log toast). Every phone scroll container gets bottom padding ≥ FAB height + 24px so
   content scrolls clear of it; the toast sits above the FAB, not under it.
3. **Phone header truncates the section title** to "J…"/"Tarn…". On phone drop the text title (the bottom
   tab bar already names the section); keep the brand mark. The area chip gets the freed width.
4. **Level does not follow stats.** Stats summing to 94 still show "Lv 1". In Elden Ring, level = sum of the
   eight stats − 79 for every class. When stats are edited, derive `level` automatically (show it); if the
   player types a level that disagrees, show a small warning rather than silently keeping both. Test it.
5. **Stale help copy**: the first-visit hint says "tap the ? above" but `?` moved into the `⋯` menu. Fix
   the copy.
6. **Search on phone**: the audit's search step shows no results panel. Verify tapping the search icon opens
   the full-width omnibox, typing "Margit" shows grouped results (Do / Things / Ask), and tapping the boss
   opens its entity page. Fix whatever is broken (app or harness).
7. **Gideon must not navigate away by itself on phone.** The audit's Gideon steps end up on Journey › Map
   instead of showing the answer. Answers render in the Gideon log; map/section moves become buttons
   ("Show on map"), never automatic `navigateNow` on phone. Desktop with the dock open may keep auto-nav.
8. **"1 STORY FLAG"** chip on a fresh character is meaningless to a player. Rename the world ribbon to show
   something readable ("World: Limgrave · Stormveil not yet cleared") or hide it when there is nothing a
   player would act on.
9. **Long pages**: Journey › Quests is ~9 phone screens, Library › Kit ~7, Reference ~8. Quests: collapse
   each questline to its title + current step + progress bar, expand on tap. Kit: group headers collapsible,
   first open. Reference: collapsible sections, all closed except the first.

## Wire Tasks 105 and 106

10. Boss entity page (`EntityPanel` Stats tab for bosses) renders `BossPrepCard` (from `src/combat/`), and
    Library › Kit gets a "Damage calculator" group using `DamageCalc` + `StatusTable`.
11. `WikiText` and Gideon answers run text through `glossary.autolink` so entity names and mechanics become
    `EntityLink`s. Library gets a **Mechanics** category listing the mechanics cards.

## Harness honesty (`scripts/ui-audit.mjs`)

12. Remove the `.quicklog-fab` / `.quicklog-toast` exemptions from the **covered** check (keep only the
    modal scrim exemption while a modal is open). Add a **transparent overlay** check: any fixed/absolute
    positioned element with visible text whose computed background is transparent and that overlaps other
    visible content → issue. Each step must assert it reached its target (search results visible; Gideon
    log contains a new answer; entity panel open) and record "did not reach" otherwise.

## Acceptance
Re-run `npm run audit:ui` (dev server already running on :5173; do not start/stop it), at most 4
iterations. Phone: 0 overlap, 0 covered, 0 transparent overlay, 0 "did not reach", 0 console errors; no
page over 4 screens except Library › Reference. **Open and look at the phone screenshots for steps 3, 4, 6,
9, 20–26 yourself** and describe what each shows in your report. `npx tsc -b`, `npm test`, `npm run lint`,
`npm run build` pass. Then `git add -A` and commit.
