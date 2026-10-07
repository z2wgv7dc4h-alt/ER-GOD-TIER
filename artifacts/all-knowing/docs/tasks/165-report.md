# Task 165 report — UX fixes from the Task 161 proposal

Branch `task-165`. This run was resumed after an earlier run was killed mid-way. Git showed
`#1`, `#3`, `#21`, `#22` already committed with a clean tree; this run finished `#2`, `#10`, `#12`
and ran the full gates once.

Scope rule followed: no builds/`build:*` data, Gideon code, generated sourced JSON or `.env` was
touched. Inference/entityGraph (Tasks 14–19 in the proposal) and PvP/Builds were left to the other
agents.

---

## Task #1 — remove/redirect dead `MeUpdate` (previous run)

`MeUpdate.tsx` deleted; `SaveDrop.tsx` extracted so Setup keeps importing it; `me/update` resolves to
the real Setup wizard. Guard test `MeUpdate.guard.test.ts`. Phone user: the "Update" hash now lands on
a live screen instead of a page nothing routed to; no visible feature lost.

## Task #2 — one consistent boss page order (this run)

Files: `src/library/EntityPanel.tsx`, `src/library/BossFacts.tsx`, `src/library/EntityKinds.tsx`
(plus a `sections` gate on `src/combat/BossPrepCard.tsx`, see ASSUMPTIONS).

Before: a boss had five tabs (`Stats · Where · Lore · Related · Wiki`), the Stats tab stacked
`BossFacts` + `BossPrepCard`, and those two repeated "weak to / resists", "recommended level" and
the weapons block. After:

- Boss tab strip reduces to **Lore | Wiki**; Stats/Where/Related are inline on the default view.
- One fixed order: **Where to reach it** (region, acquisition text, arena, coords, "Show arena on
  map") → **one Combat profile** (NpcParam when a real row exists, else the enriched record — never
  both, and enriched negation folded into the same block) → **Weak to / Resists** → **Status resist**
  → **Your best weapon vs this boss** → **Strategy** (`Full fight guide` link + "Guides for this
  boss") → **Drops** (each drop that resolves through `resolveEntityId` is an `EntityLink` to its
  item page) .
- `BossPrepCard` now supplies only the blocks the panel does not own: Status procs, **Spirit ashes
  you own**, **Buffs & talismans**, **Summon** (co-op) and the single **Recommended level** verdict,
  in that order.
- Group bosses list their per-location fights first (block 1) with the note "Progress is tracked per
  location — each row opens its own encounter page."; non-group bosses' variants/"About this fight"
  follow the combat blocks. Related is a collapsed `RelatedCollapsible` at the end.
- Phases block omitted (no data on disk), as the proposal allowed.

Phone user: opening a boss no longer requires tab-hopping; weakness, best weapon, strategy, drops and
what to summon are one scroll, and drop chips tap through to the item.

## Task #3 — boss glance line (previous run)

`bossGlance()` in `BossFacts.tsx` renders one data-only line under the status strip
("Weak to X · <weapon> does N"); hidden when there is no weakness and no computable weapon.

## Task #10 — guide cross-links + real open (this run)

Files: `src/PackData.tsx`, `src/shell/JourneyArea.tsx`, `src/Atlas.tsx`, `src/library/BossFacts.tsx`
(the boss link moved there with #2).

- `GuidesSection` cards now render the scraped page's own `url` as **Open full guide** (previously
  they dead-ended after 600 chars). Every excerpt already carries `url`; a new test asserts all >200
  excerpts have an `http(s)` url.
- New exported `GuidesFor` block: given a query it lists matching Fextralife excerpts (headings link
  to their `url`) and a chip that jumps to `Library › Guides` with that query prefilled. Wired into:
  - boss pages — "Guides for this boss" (in `BossFacts`, next to Strategy);
  - the Area page — "Guides for this area";
  - the map pin detail — "Guides for this area" from the selected pin's region.

Phone user: from a boss, an area or a map pin, one tap opens the real guide text, plus a path into
the Guides corpus.

## Task #12 — progression "Mark" meters to Overview (this run)

Files: `src/library/Guides.tsx`, `src/shell/MeOverview.tsx`.

`ProgressionSection` (Blessing meters, Achievement sets, Dungeon checklist, Merchant conditionals,
Fragments & flasks — all "Mark"/"Log" tools that write facts) moved out of `Library › Guides` and
into `Tarnished › Overview`, rendered after the completion "Missing" drill-down and its related
`Collapsed` helper. Guides keeps the reading only (mechanics, guides, recipes, secrets, dialogue,
wiki, resources). Test `row 4b` asserts the tracking titles render on Overview and no longer on
Guides.

Phone user: "mark what I've done" now lives with completion on the Tarnished tab, not buried in a
reference browser.

## Task #21 — Now first paint cap (previous run)

`JourneyNow.tsx` moves the tail "last resort" cards behind a single "More" disclosure so the next
action is not below the fold on a phone.

## Task #22 — one header path to Overview (previous run)

`Header.tsx` brand mark is now decorative; only the character chip navigates to Tarnished Overview.

---

## Final checks (run once)

- `npx vitest run` — **211 files passed, 1485 passed / 11 skipped**.
- `npm run lint` (oxlint) — exit 0 (warnings only, none new in the files changed here other than
  pre-existing hook-dep warnings).
- `npm run build` — succeeded.
- `npm run test:bundle` — exit 0, 7 passed (bundle budget held).
- `npm run audit:pages` — exit 0, `docs/PAGE-AUDIT.md` regenerated (5687 entities, 2 flagged; was
  1919 when last written).
- Touched-file tests added/adjusted: `BossPrepCard.test.tsx` (section gating),
  `EntityPanel.test.tsx` (boss tabs reduce to Lore/Wiki; non-boss keeps five),
  `BossFacts.order.test.ts` (block order, one profile source, linked drops),
  `GuidesFor.guard.test.ts` (url link + boss/area/map cross-link wiring),
  `coverage.test.tsx` row 4b, `lib/guides.test.ts` (every excerpt has a url).

## ASSUMPTIONS

- `BossPrepCard.tsx` is not in #2's listed files, but deduping required gating its sections, so a
  `sections?: BossPrepSection[]` prop was added; `EntityPanel` passes
  `['status','spirits','helpers','summon','level']`. `#2`'s file list was treated as "where the meat
  is", not a hard prohibition on the one component it renders.
- The §3 "Stats/Where/Related now inline" layout was implemented as an always-visible ordered boss
  body with **Lore | Wiki** as the only tabs (the two reference surfaces with nowhere else to go),
  rather than a hidden extra "Fight" tab.
- The boss "Recommended level" copy kept is `BossPrepCard`'s (it adds the under/over verdict); the
  `regionLevels` band copy in `BossFacts` was removed to avoid a duplicate. A boss with no NpcParam
  combat row therefore no longer shows a region band.
- `Related` is rendered collapsed (`RelatedCollapsible`) inside the boss body so `EntityPanel` stays
  provider-free under SSR tests and long chip walls stay folded (Task 93 pattern).
- Drop linking only fires when `resolveEntityId(dropName)` resolves to a real graph entity; an
  unresolvable drop stays plain text (no invented ids).
- `GuidesFor` hides itself while the corpus is loading or the query is under 3 chars, and when no
  excerpt matches it says so rather than inventing one.
- `#10`'s `Guides.tsx` entry needed no change: the Guides screen already renders the shared
  `GuidesSection`, which is where `g.url` is now exposed; the answer-first landing restructure in
  proposal §5 was not part of the #10 row.
- The progression `DungeonChecklist`/Merchant-conditionals read as tracking tools too and moved with
  the "Mark" meters; only corpus reading stayed in Guides.
- `docs/PAGE-AUDIT.md` is generated by `audit:pages` and was regenerated by the gate (not hand-edited).

## Not done / skipped

- Proposal §3's "Fix the Library boss sort (name across all campaigns) and the dead DLC filter
  (`buildBosses` never sets `campaign`)" was not in the #2 row's "what changes" and was not touched.
- Phases block intentionally omitted (no data).
- `npm run index:entities` and `npm run audit:links` were not run: the brief's final-gate list omits
  them and no data/generator changed (AGENTS says run full gates only if the brief says so).

## Brief checklist

- [x] #1 Remove/redirect dead `MeUpdate` (previous run)
- [x] #2 One boss page order — inline Where, deduped profiles, §3 order
- [x] #3 Boss glance line (previous run)
- [x] #10 Guide cross-links + real open (`g.url`)
- [x] #12 Move progression "Mark" meters to Overview
- [x] #21 Now: cap first paint (previous run)
- [x] #22 Header duplicate brand link (previous run)
- [x] Full gates run once (vitest, lint, build, test:bundle, audit:pages)
- [x] Report written (`docs/tasks/165-report.md`)

ALL ITEMS DONE
