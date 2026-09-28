# Task 126 — UI redesign pass: hierarchy, cut the noise, fix what the crawler found

Inputs: the phone screenshots in `.scratch/ui-audit/2026-09-28_09-16-29/phone/`, the crawler report
`.scratch/ui-crawl/2026-09-28_10-05-52/crawl.md`, and `docs/USAGE-MODEL.md`. The user's verdict: "so much
pointless shit, everything needs to be done better". Be decisive: delete, merge and simplify. Features stay
reachable, but not everything deserves a button on every screen.

## 1. Design system (do this first; apply everywhere)
Today every button, chip, filter, tab and heading is the same uppercase bordered box — no hierarchy.
Create `src/ui/` primitives + `src/ui/ui.css` and migrate screens to them:
- **Button**: `primary` (filled gold, dark text — max ONE per card/screen), `secondary` (outline), `ghost`
  (text only). Sentence case, not uppercase. 44px min height.
- **Chip**: small (32px visual, 44px hit area), sentence case, for filters/tags only.
- **Tabs / segmented control**: sub-tabs look like a segmented control, not a row of buttons.
- **Card**: title (serif), optional one-line subtitle, body, footer actions. Fewer borders: cards use a subtle
  fill, not a gold border.
- **List row**: icon · title · subtitle · trailing meta/chevron; whole row tappable.
- **Empty state**: one line + one action. Components render **nothing** when they have nothing to show (no
  "0 still outstanding" cards).
- Kicker/eyebrow text only where it adds meaning; drop decorative ALL-CAPS labels.

## 2. Copy: cut and de-jargon (whole app)
- Max one sentence of explanation per screen; delete meta-commentary ("A PS5 player with no save file…", "Same
  layer as the Atlas…", "I do not have a level band for this spot", "Stat spreads are exact — …").
- Replace jargon: "line" → "Questline"/"Step", "Blitz" → "Fastest route", "Leftovers" → "Missed nearby",
  "Atlas" → "Map", "story flag" → remove, "33 open · 6 locked" → "33 questlines available · 6 closed off",
  "Related (21)" → "Connections (21)", "the honest next door" → plain advice.
- Long prose (guides/mechanics/strategy > 200 chars) collapses to the first sentence + "More".

## 3. Screen by screen
**Tarnished › Overview**: one setup entry point. Fresh character: a single card "Set up your character" with the
primary button; no duplicate "Set up"/"Edit stats"/second CTA. Set-up character: character card (name, level,
class, stats grid) · progress (graces/bosses/items bars) · recent activity (5 rows). The world ribbon advice moves
to Journey › Now. Stat editing lives in Setup and an "Edit" ghost button on the card.
**Tarnished › Gear**: one "Equip" action per empty slot group, not 13 "+ Equip" buttons — tap the slot row itself.
**Tarnished › Profiles**: settings as a proper settings list (label left, control right), grouped (Display,
Spoilers, Gideon AI, Data & offline, Profiles).
**Journey › Now** (the most important screen): order = Current goal card (goal, current step, ONE primary action
"Show on map", secondary "Mark done", overflow ⋯ for Fastest route / Ask Gideon / Connections) → Recommended (3
rows) → Before you leave (only when an area is set and there is something) → Missed nearby (only if > 0) →
Watchlist (only if any) → 100% route (collapsed). No setup CTA duplicate here beyond one compact row when the
character is unset.
**Journey › Area** empty: show the likely-grace picker inline (reuse the area picker content) instead of "tap the
chip in the header".
**Journey › Quests**: three groups — **In progress** (started lines with next step), **Available** (not started,
collapsed count), **Endings** (the 5 endings as a separate compact section with requirements/locks). "Lines that
can break" becomes warnings on the relevant rows. The 100% route is its own collapsed card with a real progress
bar, not "See all (32)".
**Library › Search**: category rail as icon tabs; results list rows; filters in the sheet (already). Guides/NPCs/
Locations duplicate React keys (crawler: `npcs:frustrated-spirit`, `locations:altus-tunnel`, `guides:armament`) —
fix with unique keys and dedupe the data.
**Library › Guides**: 939 words on first paint — show topic cards (title + one line), open into the full text.
**Library › PvP / Builds**: build cards collapsed to name · bracket/level · one-line pitch; expanded view uses
sections (Stats, Gear, How to play, Beats / Loses to), not paragraphs.
**Gideon**: fine; ensure quick chips use the Chip primitive.
**Area picker**: dedupe graces (crawler saw "Chamber Outside the Plaza" ×3).
**Map (desktop)**: the side-panel toggles `Missing only`, `follow`, `undone heat`, `Watchlist`, `npc`, `fragment`,
`spirit-ash`, `dungeon` did nothing in the crawl — make them work against the live engine iframe (postMessage to
the engine to filter categories) or hide the ones that only apply to the static plate while the engine is live.

## 4. Verify
Re-run `npm run crawl:ui` and `npm run audit:ui` (dev server on :5173 running; don't start/stop it). Targets:
0 console errors; dead controls only = already-active tabs/chips; no duplicate groups on the same screen; phone
words-on-first-paint for Now ≤ 180, Guides ≤ 250, Overview ≤ 150; audit zero issues. Describe the phone
screenshots for Overview, Now, Quests, Guides, PvP in the report.
NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
