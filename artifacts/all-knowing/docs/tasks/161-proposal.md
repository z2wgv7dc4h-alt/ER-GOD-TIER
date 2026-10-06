# Task 161 — UX review: layout, intuitiveness, inference (proposal)

Read-only review. No code, data, generator, build record or label changed. Everything below is
presentation-only. Findings come from reading `src/App.tsx`, `src/shell/**`, `src/library/**`,
`src/Build.tsx`, `src/build/**`, `src/knowledge/**`, `src/lib/infer.ts`, `src/lib/ocr.ts`,
`src/lib/likelyInferences.ts`, `src/knowledge/catalog.ts`, `src/knowledge/inferChains.ts`.

Player context: PS5, no save access; learns state from phone photos of the TV, manual entry and
inference; uses the app on a phone.

---

## 1. Current map of screens

Shell: phone bottom `TabBar` (4 sections) + header (brand → Tarnished Overview · search · area chip ·
Glance · character chip → Tarnished Overview · `+` Quick log · `⋯` overflow · Gideon dock on desktop)
+ a per-section `SubTabs` strip + one full-screen `EntityPanel` overlay that any `EntityLink` opens.
`S` = section tab, `T` = sub-tab; "taps" counts each. An entity page is +1 overlay tap.

| Section (tab) | Sub | Shows, top to bottom | Entry | Taps |
|---|---|---|---|---|
| **Tarnished** `me` | Overview | AreaPrompt · CharacterCard (name/Lv/class/8 stats+soft caps) · Completion + Fragments/Hunts · Recent activity · Recents · Missing drill-down | S / brand / chip | 1 |
| | Gear | Equip load · Armaments · Armor · Talismans · Spells · Owned inventory (search) | S+T | 2 |
| | Setup (alias `update`) | 6 steps: Status · Equipment · Inventory · Map&graces · Bosses&progress · Review; each step is photo/OCR/camera/paste; "Other update sources" collapsed | S+T | 2 |
| | Profiles | Profiles · Display · Spoilers · Gideon AI · Data/offline | S+T | 2 |
| **Journey** `journey` | Now (default) | Resume · AreaPrompt · (goal-elsewhere) · Main goal + Show on map/Mark done/⋯ · Recommended · Before you go · "Probably done" · Missed nearby · Watchlist · 100% route | S | 1 |
| | Area | Where-are-you picker if unknown; else level band · My completion · Don't miss · Bosses · Dungeons · NPCs here now · Items & loot · Secrets · Farm here | S+T | 2 |
| | Map | Atlas: pins, layers, focus/glance, MapControls | S+T | 2 |
| | Quests | 100% route · In progress · Available (collapsed) · Endings | S+T | 2 |
| **Library** `library` | Search (default) | Category rail (19 kinds: Weapons…Bosses…Locations…Guides…Dialogue) · toolbar (search/owned/reqs/Near me/facets/sort/grid-table) · results · detail aside · compare tray | S | 1 |
| | Builds | `BuildPlanner` + `BuildWorkspace` + `BuildKits`: ~12 collapsed cards incl. 3 stat/AR editors, 28 OP kits, damage calc, build code, NpcParam matchup, weapon compare | S+T | 2 |
| | PvP | Banner · PvP builds (18, bracket chips RL30-50/60-90/125/150) · matchups (27) · PvP tech (19) · Tech & cheese | S+T | 2 |
| | Guides | Corpus chips (Guides/Recipes/Secrets/Dialogue/Wiki/Resources) · Wiki browser · Mechanics · chosen corpus · Progression (blessings/achievements/dungeon checklist/merchants/fragments) | S+T | 2 |
| **Gideon** `gideon` | — | Chat log · quick-ask chips · input (also a desktop dock) | S | 1 |

Global: QuickLog sheet (`+`), Command palette (`/` `Ctrl+K`), Glance (full-screen map), Entity overlay.

---

## 2. Top problems, ranked by impact

1. **A boss has no single page order.** Status strip → *Stats* tab: `BossFacts` (HP/negation, weak to/
   resists, status resist, recommended level, strategy, drops, arena, best weapon) → `BossPrepCard`
   (weak/resists **again**, recommended level **again**, weapons, spirit ashes, buffs) → `EntityKinds`
   locations. "Where/how to reach" is a separate *Where* tab and lore a *third*; phases do not exist.
   Before a fight the player must hop tabs; mid-fight there is no glance line. `BossFacts.tsx:152-291`,
   `BossPrepCard.tsx:60-201`, `EntityKinds.tsx:303-363`, `EntityPanel.tsx:246-277`.
2. **PvP is a data dump with no farm path.** 18 builds, 27 matchups, 19 tech rows in three flat groups
   under `Library › PvP` (2 taps). Build loadouts are free-text strings (`pvp.ts:33-46`), so nothing
   links to the map, item page or farming route even though every build carries `need`/`route`/`kit`
   ids. Matchups are not attached to a build; `mode` is shown but not filterable; `metaBuilds.ts` data
   is loaded by nothing. `Build.tsx:174-262`, `KitLibraryPanels.tsx:178-275`.
3. **Builds is one enormous page.** `Builds` stacks `BuildPlanner` + `BuildWorkspace` + `BuildKits`
   (`App.tsx:92-99`): three different stat/AR editors (bars, number grid, sliders), two respec
   surfaces, and the primary stats editor collapsed by default (`Build.tsx:431`). The dependent planner
   renders *before* the editor it depends on.
4. **Guides are unreachable from context.** Guides only exist under `Library › Guides`; no boss, area,
   item or map link goes there (`Related.tsx` has no guide relation; only the Library tab and legacy
   `#/library/reference`). Boss strategy is an external Fextralife `<a>` (`BossFacts.tsx:242-247`).
   Guide cards render page/heading/600 chars and **never use `g.url`** — dead ends (`PackData.tsx:210-241`).
5. **Entity pages are inconsistent and sometimes mis-typed.** The first tab is always "Stats" but holds
   a hub for regions, a questline for NPCs, a shop for merchants. Guide/secret/recipe entities fall
   back to `item` (`entityGraph.ts:244-279`, `EntityPanel.tsx:108-111`), so a Fextralife guide shows
   "Owned/Not owned" + "Mark owned". Wiki-only pages open as empty `item` stubs with the wiki buried in
   the 5th tab. Dialogue rows resolve to `npc`. Two presentations of the same page exist: browser
   `aside.lib-detail` (no verdict/remembrance) vs the global `EntityOverlay` (has them).
6. **Inference is hidden where it is decided.** New facts are inferred on log (QuickLog toast), but no
   standing "what the app thinks you've done, and why" view exists outside Setup›Review and the
   "Probably done" card. `inferenceReasons()` only feeds Review. Several rules are wrong/risky (§6).
7. **Journey › Now buries the next action.** After the goal card come six "last resort" cards
   (Recommended, Before you go, Probably done, Missed nearby, Watchlist, 100% route). On a phone the
   next step can be below the fold. `JourneyNow.tsx`.
8. **Duplicated / unreachable screens.** `MeUpdate.tsx` renders a full "Update your Tarnished" page but
   `me/update` routes to `MeSetup` and no sub-tab exposes it (`App.tsx:81`, `sections.ts`). Help text
   still names tabs that do not exist ("update", library "kit"). `MedusaRoute` renders twice.
9. **Split search.** Global palette, per-section search, Library category search, Wiki search and
   Gideon text each behave differently, with two of them opening entities via different surfaces.

---

## 3. Bosses — one consistent page order

Use only data already on disk (`bossRoster` 220 encounters / 157 cards / 32 groups; `BossFacts`;
`BossPrepCard`; `remembrances`; `regionLevels`; `Related`). Omit any block with no data; never invent.

```
Boss page
┌ header: icon · BOSS · region/DLC · NAME · [Defeated | x of n] ───────────────┐
│ STATUS LINE  "Not yet · Stormveil · Lv 30-40"            [Mark defeated]     │
├ 1 WHERE / HOW TO REACH   (Where-tab content, now inline)                     │
│     arena/locations · nearest grace · "Show arena on map" · route hint       │
├ 2 WEAKNESSES & RESISTANCES   (one copy, NpcParam)                            │
│     "Weak to: …"  "Resists: …"  Status resist grid                           │
│     + "Your best weapon vs this boss" (effective dmg after negation)         │
├ 3 STRATEGY   (Fextralife excerpt)  → link "Guides for this boss"             │
├ 4 PHASES     (only if a data field exists — otherwise omit)                  │
├ 5 DROPS      (chips; remembrance/drop names link to their item pages)        │
├ 6 SPIRIT / CO-OP   (owned ashes, buffs, co-op note)                          │
├ 7 RECOMMENDED LEVEL (one copy)                                               │
├ 8 RELATED    (Related: adds, weaknesses, quests)                             │
└ footer: Mark defeated · Show arena on map · Set as goal · Ask Gideon         ┘
     tabs reduce to Lore | Wiki (Stats/Where/Related now inline)
```

- Delete the duplicate "Combat profile · enriched" vs "· NpcParam" and the duplicated weak/resists and
  recommended-level blocks; pick one source and label it.
- Keep group bosses' per-location list as block 1 with "progress is per location"; each row opens its
  own encounter page.
- Make `drops` tappable to the item (remembrance → Enia trade) so there is a next step.
- Fix the Library sort (name across all campaigns) and the dead DLC filter (`buildBosses` never sets
  `campaign`); align with the region/tier order used everywhere else.

---

## 4. PvP — a clearer structure (presentation only)

Goal: 1 tap from home to a PvP hub that answers "what do I play at my level, how do I beat what I keep
losing to, where do I get the pieces".

```
Library › PvP
[ Invade | Duel | Both ]   [ RL30-50 | RL60-90 | RL125 | RL150 | My level ]  [ search ]
┌ Builds ─────────────────────────────────────────────────────────────────────┐
│ card: name · bracket · mode · playstyle one-liner                            │
│   expands → Stats · Gear (per piece: "where to farm" → item page + map)      │
│              Combos · Buff order · Beats / Loses to                          │
│              [ Use this build ]   [ Farm the missing pieces ]                │
├ Matchups for the selected build (ranked by its keywords) ────────────────────┤
│ "Bleed / Rivers of Blood" · tell · counters · gear swap   [Show item]        │
├ Tech   (filter by the 11 existing categories) ───────────────────────────────┤
├ Tech & cheese                                                               │
└ Meta (Fextralife)   ← surface metaBuilds.ts, currently loaded but unrendered ┘
```

- Default the bracket filter to `character.level`; add a mode filter (existing `PvpMode`).
- Wire each build's `kit` ids through the existing `buildHunt` (already used by OP kits) to show
  missing pieces with item links / "Show on map". Where a loadout entry is only a string, keep it
  text — never invent an id.
- **Bug to flag:** the card *displays* `build.loadout` but "Use this build" applies `build.kit`
  (`KitLibraryPanels.tsx:228`), so the shown gear ≠ applied gear. Either render `kit` or apply
  `loadout`.
- Add a "What beats me?" reverse lookup from the equipped weapon.

---

## 5. Guides — structure and linking

Current: one browse page (corpus chips + wiki browser + mechanics + progression); no inbound links;
guide cards never expose `url`; the Library also has a `Guides` category of excerpt entities that is
not connected to the Guides screen.

Propose:
- Give every guide/mechanic a stable `guide:<slug>` handle (most excerpt entities already have ids).
- **Boss strategy** block (§3) links to "Guides for this boss"; **Area** page gets "Guides for this
  area"; **item** pages link to related recipes/secrets; **map** pin detail links to the area guide.
- Make guide cards open something real: render `g.url` as a link and/or register the excerpt as a
  proper entity kind so it stops showing "Owned".
- Split the landing into three answer-first groups — `I'm stuck` → `Reference` (mechanics/recipes/
  secrets/dialogue) → `External` (wiki/resources) — keeping the corpora as a secondary filter.
- The progression "Mark" meters are tracking tools, not guides; move them next to completion
  (`Tarnished › Overview › Missing`) and leave only the reading in Guides.

---

## 6. Inference

### What the app infers today

- **Catalog graph** (`knowledge/catalog.ts`, ~355 facts, `implies[]`): walked transitively by
  `closeWorld()` (`lib/infer.ts:110-150`). One great rune ⇒ its boss; one remembrance ⇒ its boss;
  region ladders; grace ⇒ earlier grace/region/boss; item ⇒ region/quest.
- **Authored chains** (`inferChains.ts:100-273`): Great Rune ⇒ boss, Bell Bearing ⇒ region, map
  fragment ⇒ region, compound medallions (`allOf`/`unless`), black-whetblade, etc. Derived ids are
  written `source:'inference'` at confidence 0.72 and never outrank save/deny/answer.
- **Setup seeds** (`applyAnswers`, `infer.ts:218-246`): region/class/shardbearer/last-grace answers.
- **Photos**: Status (level/stats/runes), Equipment, Inventory (OCR + live camera), Map (grace blobs +
  fragment classification), crafting (cookbook ⇒ recipes).
- **Likely layer** (`likelyInferences.ts`): 5 main-path bosses, shown Yes/No when the region is known
  and `level ≥` band; confirm → `applyFacts`, reject → `denyFacts`.
- **Inputs used**: PS5 photos/OCR/camera/paste/answers/grace names/"I beat X". **Ignored** for
  inference: engine markers. On PC, `.sl2` supplies boss/grace flags only (no inventory/gear).

### Wrong or risky today

- **Altus answer also claims Leyndell** (`infer.ts:229`: `dlc==='altus'` seeds `region:altus` **and**
  `region:leyndell`). Reaching Altus ≠ entering the capital. The interview label itself says "Reached
  Altus or Leyndell" (`catalog.ts:630`), so the seed is an over-claim.
- **Answers are never retracted.** `applyAnswers` only adds seeds; changing an answer leaves the old
  region/boss facts on the character forever (`Reckon.tsx:60`, `MeSetup.tsx:196`).
- **Items treated as proof of a place/beat.** `item:haligtree-secret-medallion ⇒ region:haligtree`
  and `item:dusk-medallion (Dectus) ⇒ region:altus` (`catalog.ts:110-111`, locked in by tests);
  `item:valkyries-prosthesis ⇒ quest:millicent:cured`, `item:weathered-dagger ⇒ quest:fia:met`.
- **Niall bypasses the compound rule.** `boss:commander-niall ⇒ item:haligtree-secret-medallion`
  (`catalog.ts:148`) even though a lone half is deliberately "implies nothing" everywhere else
  (`inferChains.ts:161-176`) — so one boss marks the Haligtree reached. Same shape at `catalog.ts:166`.
- **`region:mountaintops ⇒ boss:morgott`** (`catalog.ts:37`): the Mountaintops can be entered without
  beating Morgott (Draconic Tree Sentinel / east rampart), so this can mark a boss not fought.
- **"Remove / not sure" is not sticky.** `clearFact` leaves the evidence row (`infer.ts:207-216`), so
  `inferenceReasons()` keeps showing a removed fact, and the next closure can silently re-add it.
- **Stale "likely" guard.** `inferenceAudit.ts:38-45` lists three edges as likely, but none exist in
  the current catalog — the intended safety net is inert.
- **Status/Equipment photos write `level`/`stats`/`loadout` directly** with no `evidence` entry
  (`MeSetup.tsx:214-225`), so they are outside the reversal model.

### New cheap-PS5 inferences to add (rule → data)

1. **Status photo → build shape.** Read Lv + 8 stats and infer the archetype (e.g. Int ≥ 50 ⇒ caster)
   to preselect Builds/PvP filters. Data: `softCaps.ts`, `advisor.ts`. Presentation only.
2. **Highest armament upgrade → region band (likely, confirm-only).** +0-3 Limgrave, +4-6 Liurnia,
   +6-9 Altus, +9-12 Leyndell/Mountaintops, +13+ late. Data: equipment photo + smithing ranges.
3. **Remembrance in inventory → boss defeated (certain).** Extend the Great-Rune rule to every
   remembrance the catalog already maps (`remembrances.ts` + catalog).
4. **One grace name / warp line → current region + path.** Catalog `implies` already walks it; surface
   the newly-unlocked regions as a standing card.
5. **A single "I beat X" → "what this opens".** `closeWorld` already computes it; promote QuickLog's
   toast to a card (areas/quests/Gates), with the reason from `inferenceReasons()`.
6. **Fixed-source item → region (certain).** Generalise the two hand-authored source rules using the
   entity-index `foundIn`/`droppedBy` edges.
7. **Flask/blessing photo → Scadutree / flask progress.** Data: `collectibles.ts`.

All must go through `applyFacts` (later photo/save/save-deny wins) and show the reason, per the
existing contract.

---

## 7. Small, independent build tasks

Each is self-contained. S = hours, M = a day, L = multi-day.

| # | Task | Files | What changes | Size |
|---|---|---|---|---|
| 1 | Remove/redirect dead `MeUpdate` | `src/App.tsx`, `src/shell/MeUpdate.tsx` | Route `me/update` to a real page or delete it; keep `SaveDrop` (Setup imports it). | S |
| 2 | One boss page order | `EntityPanel.tsx`, `BossFacts.tsx`, `EntityKinds.tsx` | Inline Where, dedupe combat profiles, order per §3. | M |
| 3 | Boss glance line | `BossFacts.tsx` | One-line "weak to X · best weapon does Y" under status. | S |
| 4 | PvP mode + "My level" default | `Build.tsx`, `KitLibraryPanels.tsx` | Add mode filter and level default. | S |
| 5 | PvP "Farm the missing pieces" | `KitLibraryPanels.tsx`, `buildHunt.ts` | Run each `kit` through `buildHunt`; add item/map links. | M |
| 6 | Fix PvP shown vs applied loadout | `KitLibraryPanels.tsx`, `src/knowledge/pvp.ts` | Render `kit` or apply `loadout`. | S |
| 7 | Matchups under selected build | `KitLibraryPanels.tsx`, `pvp.ts` | Rank/filter `pvpMatchups` by build `keywords`. | S |
| 8 | Surface `metaBuilds` | `Build.tsx`, `src/lib/metaBuilds.ts` | New collapsed "Meta (Fextralife)" card. | S |
| 9 | Split Builds into tabs | `App.tsx`, `Build.tsx`, `BuildPlanner.tsx` | Your build · Planning · Kits/Compare · Calculator. | M |
| 10 | Guide cross-links + real open | `Guides.tsx`, `PackData.tsx`, `EntityPanel.tsx`, `JourneyArea.tsx`, `Atlas.tsx` | "Guides for this …" blocks; render `g.url`. | M |
| 11 | Stop mis-typing guide/secret/wiki entities | `entityGraph.ts`, `EntityPanel.tsx` | New kinds (or prefix map) so they don't show "Owned". | M |
| 12 | Move progression "Mark" meters | `Guides.tsx`, `MeOverview.tsx` | Tracking joins Overview›Missing. | S |
| 13 | Standing "What we inferred" panel | `JourneyNow.tsx`, `setupWizard.ts`, `infer.ts` | Reuse `inferenceReasons()` with per-row remove. | S |
| 14 | Retract changed interview seeds | `infer.ts`, `Reckon.tsx` | Recompute seeds and remove stale ones on answer change. | M |
| 15 | Fix Altus→Leyndell + Mountaintops→Morgott | `infer.ts`, `catalog.ts` (+ tests) | Split the answer; downgrade/remove the Morgott edge. | S |
| 16 | Fix Niall → full Haligtree medallion | `catalog.ts` (+ test) | Point to the half or drop the edge. | S |
| 17 | Make "remove/not sure" sticky | `infer.ts`, `setupWizard.ts` | Clear evidence on remove or deny properly. | S |
| 18 | Remembrance → boss chains | `inferChains.ts` (+ test) | Extend the Great-Rune pattern. | S |
| 19 | Fix stale `inferenceAudit` likely keys | `inferenceAudit.ts` | Match current edges or add a test. | S |
| 20 | Fix area "Visited" substring match | `library/pageModel.ts` (+ test) | Use structured region equality. | S |
| 21 | Now: cap first paint | `JourneyNow.tsx` | Move tail cards behind one "More". | S |
| 22 | Header duplicate brand link | `Header.tsx` | Keep one path to Tarnished Overview. | S |

---

### ASSUMPTIONS

- "Home" is the section landing a bottom tab reaches; an entity page is one extra overlay tap.
- Boss "phases" data does not exist today; §3 omits the block rather than inventing it.
- PvP farm links only appear where `kit` ids resolve to real entities; free-text loadout stays text.
- `region:mountaintops → boss:morgott` and the Niall/Haligtree edges are flagged for verification, not
  asserted as bugs in shipped code; no data was changed.
- Counts: 220 boss encounter rows / 157 distinct cards / 32 groups; 28 OP + 18 PvP builds; 27 matchups;
  19 tech rows; 19 Library categories.

### Not done

- No code, data, generator or build record changed (read-only task).
- No tests/lint/build run: nothing executable changed.
