# Task 127 — Redesign leftovers (from Task 126 screenshots) + crawl verification

1. **Journey › Now world ribbon**: the dropdown chip "Level 1. Stormveil or Weeping is the honest next door, not
   Caelid." is still there. Remove the ribbon from Now; turn its advice into one plain row inside the goal card
   ("Suggested next area: Stormveil Castle or the Weeping Peninsula") only when it adds information.
2. **"Before you leave this area"** renders with no area set and lists unrelated questline steps with a "line"
   tag. Show this card ONLY when `currentArea` is set and there are missables in that area; rows show the thing +
   why it's missable, no "line" tag. Grep the whole app for remaining player-visible "line" tags / "Atlas" /
   "Leftovers" / "Blitz" / "story flag" / "honest" wording and replace per Task 126 §2.
3. **Library › Guides layout**: content is flush against the left edge while the heading is indented — use the
   standard page padding and the Card/List primitives from `src/ui/`; the corpus browse chips use the Chip
   primitive; "Wiki prose" → "Wiki". Drop the two explanatory sentences at the top (one short line max).
4. **Goal card** should also offer "Mark done" as a secondary button next to "Show on map" (spec'd in 126, missing).
5. **Verify** with `npm run crawl:ui` AND `npm run audit:ui` (dev server on :5173 running; don't start/stop it):
   0 console errors, dead controls limited to already-active tabs/chips, no same-screen duplicate groups; phone
   words on first paint: Now ≤ 180, Guides ≤ 250, Overview ≤ 150. Report the crawl summary table.

NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit
BEFORE running the crawl (so a timeout can't lose work), then commit again after any crawl-driven fixes.
