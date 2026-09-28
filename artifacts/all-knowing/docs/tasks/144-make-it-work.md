# Task 144 — Make what exists work: entity pages, progress, what-next (from a live play-test)

Found by Claude clicking through the running app. Fix every item, THEN build the sweeps in §4 so the same classes of
fault are found everywhere, not just where Claude clicked. Read `docs/DATA-CATALOG.md` + `docs/ARCHITECTURE.md`.
Testing rule: while working run only the tests for files you touch (`npx vitest run <paths>`, `npx tsc -b`); run the
full suite + lint + build ONCE at the end. Commit after each section.

## 1. Entity pages
- Library search/category rows resolve to the WRONG entity: tapping "Margit, the Fell Omen" in Library › Bosses opens
  `wiki:margit-the-fell-omen-disambiguation` (kind "item", "No structured stats"). Wiki disambiguation / list / index /
  redirect pages must never appear as catalogue rows or win name resolution; rows must open the canonical entity.
- Deep link `#/library/search?e=boss:margit` is dropped (lands on Weapons) — the Library hash writer overwrites `?e=`.
- **Kind-specific page templates** (one generic template is used for everything today):
  - **Location/region/dungeon** (Stormveil Castle is EMPTY; name shows lowercase "stormveil"): proper name, region,
    description, graces inside, bosses (done/not), items & loot, NPCs found here, secrets, dungeons, level band, map.
  - **NPC** (Ranni leads with combat numbers; name "Ranni The Witch"): questline steps with the current step for this
    character, where they are now/next, what they sell, dialogue link; combat stats last.
  - **Grace**: "Discovered ✓" not "Owned ✓"; region, sub-area, nearby bosses/items/NPCs.
  - **Boss**: current good content stays; add drops + strategy visibly.
  - Replace the generic "AVAILABLE — Available now." with a kind-specific status line (boss: Defeated / Not yet /
    Can't reach yet (why); item: Owned / Where to get; NPC: current quest step; grace: Discovered / Not yet).
  - Actions must fit the kind (no "Mark owned" on regions/NPCs).
- Name casing: fix title-casing bugs ("Axe Of Godfrey", "Ranni The Witch") using canonical names from the data.
- Weapon cards: remove the duplicated weight ("3 wt · Weight: 3").

## 2. Progress (Tarnished › Overview)
- "Items found 5/3", "Graces 8/47", "Bosses 1/196" — denominators are wrong/inconsistent. Totals must come from the
  full sets (graces 416+, boss roster, items catalogue) and numerators from the same id space; add a test that every
  progress ratio is ≤ 1 and uses the full set.
- Recent activity shows raw ids/sources ("larval", "margit", "Twin Maiden Husks:Margit's Shackle | answer") — render
  entity names as links + a readable verb ("Defeated Margit", "Bought Margit's Shackle from the Twin Maiden Husks").
- Class shows "unknown" — show "Class not set" with a tap to set it.

## 3. What to do next (Journey › Now / Area)
- Now › Recommended › Upgrades still lists weaker weapons (-5.1%, -24.8%) — use the same stronger-only rule as
  Library › Builds (`strongerUpgrades`), empty state "Nothing stronger reachable yet".
- Area shows Godrick ✓ but Margit ○ — completion must apply inference (Godrick ⇒ Margit) everywhere counts/ticks show.
- Area "Farm here" shows raw asset ids ("AEG099_821 ×36 gathering nodes") — map gathering-node asset ids to material
  names (the data catalog / gathering nodes / FMG goods) or omit unnamed ones.
- Area "NPCs here now: Nobody tracked" at Stormveil (Gostoc, Rogier, Nepheli are there) — use npc-placements/wiki NPC
  locations, not only grace-tracked NPCs.
- "Before you leave this area" at Stormveil lists "Seluvis's potion used on Nepheli" (a Liurnia/Roundtable lockout) —
  only show lockouts whose trigger or loss is in the current area.
- Goal vs location mismatch ("working towards Age of Stars → Enter Ranni's service" while in Stormveil): Now should lead
  with the next thing relevant here (area to-dos, main path) and show the goal step second with its distance/route.

## 4. Sweeps (so this is systematic)
- `scripts/page-audit.mjs` (`npm run audit:pages`): for EVERY entity in the index (all kinds), render its page data
  (the same functions the panel uses) and flag: empty/near-empty pages, raw ids or asset codes in player text, wrong
  casing, generic status lines, actions invalid for the kind, name resolving to a wiki disambiguation/list page.
  Report counts per kind before/after in `docs/PAGE-AUDIT.md`; fix the builders until empties are only genuine data
  gaps (listed by name).
- `scripts/progress-audit.mjs`: run the scenario characters (`src/lib/__fixtures__/scenarios/*`) through Overview,
  Area and Now data functions; assert ratios ≤ 1, no raw ids, no inference contradictions (done X but its prerequisite
  shown not done), lockouts shown only where relevant, upgrades positive. Tests guard these.

NEVER read .env files. No dev servers, no installs. Report per section + the audit tables before/after.
