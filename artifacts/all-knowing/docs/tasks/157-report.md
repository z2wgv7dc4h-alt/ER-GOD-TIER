# Task 157 — read-only audit: links, missing links, inference, dead ends, duplicates, conflicts

Scope: READ-ONLY. Only `.scratch/157/` (gitignored harness) and this report were written.
No source, no generated file and no test was changed. `.env`/`.env.local` were never opened.

Artifacts:
- Harness: `.scratch/157/audit.mjs` (loads the real runtime modules through Vite SSR),
  `.scratch/157/probe.mjs`, `.scratch/157/probe2.mjs`, `.scratch/157/probe3.mjs`, structured
  JSON under `.scratch/157/`.
- Graph measured: `public/sourced/entity-index.json` (5,685 records) installed into
  `src/lib/entityGraph.ts` exactly as the app does at runtime → 5,704 graph entities.

## Existing checks (run once, as required)

| command | result |
| --- | --- |
| `npm run audit:links` | dead data 0, dead renderer 0, guard violations 0 |
| `npm run audit:inference` | 558 rules, 0 likely, 17 scenario facts |
| `npm run audit:pages` | 5,687 entities, 2 flagged (both `empty`) |
| `npm run audit:progress` | 6 scenarios, 0 violations |
| `npm run coverage:entities` | all guard minimums met |

**What they miss (why this task finds more).** `linksAudit.deadLinks()` only resolves ids in a
whitelist of prefixes (`LINKABLE_PREFIXES`, `src/lib/linksAudit.ts:26`) and never walks the
**graph edges**. It therefore ignores every prefixless ref (all `mapfrag:*` / bell-bearing
chain ids), every name-based ref (`drops`, `region`/`location`, merchant stock, `related`),
the alias plane, the boss roster and the build pins. `pageAudit`/`progressAudit` check what a
page renders but not whether the edge it came from points at the right record or at a record
at all. The findings below are exactly the classes those guards cannot see.

## Summary

| # | check | finding | count | severity |
| --- | --- | --- | --- | --- |
| 1 | links | graph edges whose target is not an entity (dead link / dead "Related" chip) | **513** | high |
| 1 | links | edges resolving to the **wrong kind** (name collision) | **112** | high |
| 1 | links | alias rows whose `slug` has no record | **354** | medium |
| 1 | links | hosted warps whose canonical slug is a dead stub (warp/alias **search** results that cannot open) | **359** | high |
| 1 | links | infer chains whose `whenFact` does not resolve (17 dead bell chains + 14 mapfrag) | **31** | high |
| 1 | links | build "need" ids / hosted grace engine id unresolved | 3 | low |
| 1 | links | engine-marker map-pickup ids resolving by neither id nor name | 9 | low |
| 2 | missing links | records with content but **zero edges** | **358** | medium |
| 2 | missing links | records with **zero inbound** edges (orphans) | **401** | medium |
| 2 | missing links | regions with no `contains` edge to any grace/boss/dungeon | 245 / 356 | medium |
| 2 | missing links | boss-roster drops disagree with entity-index drops (same boss id) | 44 | medium |
| 2 | missing links | boss/enemy drop names that resolve to no item | **149** | medium |
| 2 | missing links | merchant stock names that resolve to no item | **12** | medium |
| 2 | missing links | `record.related` labels that resolve to no entity (not rendered as links) | 606 | low |
| 3 | inference | catalog facts that never imply and are never implied (dead facts) | **7** | medium |
| 3 | inference | implication cycle | **1** | medium |
| 3 | inference | implications to non-existent ids | 0 | — |
| 3 | inference | catalog `implies` targets with no catalog row (graph registers stubs) | 6 | low |
| 3 | inference | gates that can never be satisfied | 0 | — |
| 3 | inference | bell-bearing chains that can never fire | **17** | high |
| 3 | inference | boss facts whose own region is not implied | 43 | low |
| 4 | dead ends | pages whose every section is empty | 2 | medium |
| 4 | dead ends | "Related" chips that open a page with no data | **509** | high |
| 4 | dead ends | "Mark done" offered by `EntityActions` where the page model refuses tracking | **1317** | high |
| 5 | duplicates | same normalised name on entities of **different kinds** | **288** (88 non-place) | medium |
| 5 | duplicates | same normalised name **within one kind** | **51** | high |
| 5 | duplicates | one alias pointing at several records | **83** | medium |
| 5 | duplicates | repeated entries inside `drops`/`related` | 36 | low |
| 6 | conflicts | catalog region disagrees with entity-index region (same id) | 68 | low |
| 6 | conflicts | same boss name with different rune strings (formatting) | 23 | low |

---

## 1. Links — dangling and wrong-kind

### 1a. Graph edges whose target is not an entity — 513

`entityGraph.edges()` returns edges the `Related` tab renders directly
(`src/lib/related.ts:342`), so each one is a clickable chip that opens `openEntity(to)`.
A target with no record opens an empty panel.

By relationship:

| rel | count | target prefix |
| --- | --- | --- |
| `relatedLore` | 509 | 509 × `grace:*` |
| `goodForBuild` | 2 | `loot:*` |
| `tradedFor` | 2 | `item:*` |

Examples (`from → to`):

- `grace:312000 → grace:the-ravine`
- `grace:312000 → grace:deep-siofra-well`
- `region:abandoned-cave → grace:the-ravine`
- `enemy:abductor-virgin → grace:abductor-virgin`
- `enemy:abductor-virgin → grace:volcano-manor`
- `build:dark-moon → loot:dark-moon` (the real id is `loot:dark-moon-gs`)
- `item:remembrance-dancing-lion → item:ash-of-war-divine-beast-frost-stomp` (reward has no record)

**Root cause 1 (the 509).** `src/lib/interlink.ts:38-41` builds its link index from the
generated alias plane and returns `row.slug`. For 354 engine warps,
`scripts/gen-aliases.mjs:195-211` mints a *synthetic* grace slug (`grace:the-ravine`,
`grace:abductor-virgin`, …) instead of the existing `grace:<warpId>` record that
`entityIndexBuild` produces. Any prose mention of that warp becomes a `relatedLore` edge to a
ghost id.

**Root cause 2 (the 2 + 2).** `src/knowledge/builds.ts` lists two `need` ids that are not
entities (`loot:dark-moon`, `loot:millicent-prosthesis`), and two remembrance rewards in
`src/knowledge/remembrances.ts` name items the graph has no record for.

### 1b. Edges resolving to the wrong kind — 112

These resolve, but to a record of the wrong kind; they are the "item link lands on an NPC"
class. Main relationships:

| rel | count | wrong target kind |
| --- | --- | --- |
| `foundIn` | 53 | quest / gate / build / mechanic |
| `drops` | 32 | mechanic / quest / enemy / dungeon |
| `sells` | 17 | mechanic / gate / region / quest |
| `droppedBy` | 10 | quest (merchant stock) |

`foundIn` examples (a place-name link landing on a quest line or gate):

- `boss:bayle → line:igon` (Jagged Peak)
- `boss:ancient-hero-zamor--weeping-evergaol → line:irina` (Weeping Peninsula)
- `boss:deathbird--weeping-peninsula → line:irina`
- `quest:ansbach:met → gate:sealing-tree` (Shadow Keep)
- `item:bastard-sword → line:irina`
- `item:dragonmaw → build:dragon-communion`

`drops` examples (drop landing on a mechanics card):

- `boss:fallingstar-beast--fingerstone-hill → mechanic:flask-charges` (label "Golden Seed")
- `enemy:furnace-golem → mechanic:wondrous-physick` (label "Crystal Tear")
- `enemy:giant-rat → mechanic:rune-arc` (label "Rune Arc")
- `hunt:demi-human-queen-gilika → mechanic:memory-slots` (label "Memory Stone")
- `boss:black-knife-assassin → line:rogier` (label "Black Knifeprint")

`sells` examples (merchant stock landing on a mechanics card):

- `merchant:hermit-merchant-leyndell → mechanic:rune-arc`
- `merchant:merchant-kale → mechanic:co-op`
- `merchant:merchant-kale → mechanic:crafting`
- `merchant:patches → mechanic:co-op`
- `merchant:gatekeeper-gostoc → mechanic:co-op`

`droppedBy` examples (merchant stock stored as drops on a quest line):

- `item:buckler → line:patches`, `item:parrying-dagger → line:patches`,
  `item:ballista-bolt → line:patches`, `item:bull-goat-helm → line:patches`,
  `item:calm-down → line:patches`

**Root cause A (foundIn).** `src/lib/entityGraph.ts` resolves a fact/record region by bare name
without a kind guard: catalog `foundIn` (`:596`), loot `foundIn` (`:635`), acquisition
`foundIn` (`:718`). Meanwhile `NAME_PRIORITY` (`:343`) lets `quest`(2)/`enemy`(3) override
placeholder kinds, and storyline/gate aliases include place names
(`src/knowledge/storylines.ts`: `line:irina` alias `weeping peninsula`, `line:igon` alias
`jagged peak`, `line:rya` alias `volcano manor`, `line:ymir` alias `finger ruins`,
`line:leda` alias `enir-ilim`, `line:d-hunter` alias `summonwater`; `src/knowledge/gates.ts`:
`gate:sealing-tree` alias `shadow keep`). Verified directly:

```
canonicalEntityId('region:x', 'Weeping Peninsula') -> line:irina
canonicalEntityId('region:x', 'Jagged Peak')       -> line:igon
canonicalEntityId('region:x', 'Volcano Manor')     -> line:rya
canonicalEntityId('region:x', 'Shadow Keep')       -> gate:sealing-tree
```

The entity-index codepath already guards this (`locationTargets` is filtered to
region/grace/dungeon at `:603-608`); the catalog/loot/acquisition codepaths do not.

**Root cause B (drops/sells).** `mechanic` cards are registered before the enrichment index
(`entityGraph.ts:500`), and `addEntity` only lets an equal-priority later name win when the new
kind has *lower* priority. So a real item (`item:rune-arc`, `item:golden-seed`,
`item:memory-stone` all exist) loses `byName` to its same-named mechanic card. `drops`/`sells`
then resolve by `byName` with no target-kind check (`:627`, `:644`).

**Root cause C (line:patches).** `entityIndexBuild` puts a merged NPC/merchant record's shop
stock into `record.drops`; `entityGraph` turns every `record.drops` string into a `drops` edge
(`:626-629`), so `line:patches` "drops" its shop.

### 1c. Alias rows whose `slug` has no record — 354

All are `source: grace-stub` rows in `public/sourced/aliases.json`. Example:
`grace:100001 → grace:margit-the-fell-omen`; the record is actually `grace:100001`.
At runtime `canonicalEntityId` happens to self-correct (it falls back to `entities.has(id)`),
but `canonicalFactId` and every consumer that trusts it (e.g. `relatedFor`'s canonical lookup,
`generatedAliasBySlug`) get a dead slug. Examples:

- `grace:100001 → grace:margit-the-fell-omen`
- `grace:100003 → grace:gateside-chamber`
- `grace:100004 → grace:stormveil-cliffside`
- `grace:100006 → grace:liftside-chamber`
- `grace:100007 → grace:secluded-cell`

### 1d. Infer chains whose `whenFact` does not resolve — 31

`src/knowledge/inferChains.ts:195-211` builds 17 bells with `bellBearingRule('bell-bearing-kale-s-bell-bearing', …)`,
but the real ids are `item:kale-s-bell-bearing` etc. The id is both prefixless and wrong, so
the rule can never fire and `linksAudit` skips it (prefix not whitelisted). Examples:

- `bell-bearing-kale-s-bell-bearing` (actual `item:kale-s-bell-bearing`)
- `bell-bearing-rogier-s-bell-bearing`
- `bell-bearing-d-s-bell-bearing`
- `bell-bearing-sellen-s-bell-bearing`
- `bell-bearing-gowry-s-bell-bearing`

The 14 `mapfrag:*` chain ids are also not graph entities, but the fragments are marked in
`src/lib/completionView.ts`, so those chains can still fire; they are not dead.

### 1e. Build need ids / hosted grace — 3

- `build:dark-moon.need → loot:dark-moon` (real: `loot:dark-moon-gs`)
- `build:frost-bleed.need → loot:millicent-prosthesis` (real: the Millicent prosthesis item)
- `hosted-graces.id → grace:120300` has no mapping/record (stub `grace:prince-of-death-s-throne`)

### 1f. Search results and map pickups that cannot open

`src/lib/search.ts:131` builds a warp hit's id with `canonicalFactId(g.id)`. For a hosted warp
whose name matched no authored grace, that returns the synthetic stub slug from §1c, and
`src/lib/search.ts:186` does the same for alias-plane hits. **359 hosted warps** canonicalise
to a dead slug, so any search that surfaces one returns a row that opens a no-data page.
Examples:

- `grace:100001 "Margit, the Fell Omen" → grace:margit-the-fell-omen`
- `grace:100003 "Gateside Chamber" → grace:gateside-chamber`
- `grace:100004 "Stormveil Cliffside" → grace:stormveil-cliffside`
- `grace:100006 "Liftside Chamber" → grace:liftside-chamber`
- `grace:100007 "Secluded Cell" → grace:secluded-cell`

(Map-engine `items[]` ids such as `item:14000930` are namespaced/name-matched by
`src/lib/engineMarkers.ts`, so they are not entity refs; **9** of them resolve by neither id
nor name and are true map-search dead ends: `item:40000900` "Ash of War: Blinkbolt",
`item:1038540110` "Pulley Bow", `item:1044350900` "Great Épée", `item:12020070`
"Lightning Bastard Sword", `item:12050630` "Fire Longsword".)

---

## 2. Missing links — one-way edges and orphans

### 2a. Boss/enemy drop names that resolve to no item — 149

`entityGraph` drops `record.drops` strings it cannot match (`:627`), so the boss↔item edge is
silently absent. Examples:

- `boss:adula :: "3x Dragon Heart"`
- `boss:adula :: "Cathedral of Manus Celes: Adula's Moonblade"`
- `boss:agheel :: "Unlocks Agheel's Flame"`
- `boss:elder-dragon-greyoll :: "Dragon Heart x5"`
- `boss:fallingstar-beast :: "Smithing Stone (7) x 5"`
- `boss:death-rite-bird :: "Ash of War: Ghostflame Call"`

By kind: enemy 81, boss 50, hunt 15, invader 1, item 1, line 1.

### 2b. Merchant stock names that resolve to no item — 12

Missing merchant↔item links. Examples:

- `Miriel - Fire Monks' Prayerbook :: "Surge"`
- `Brother Corhyn - Giant's Prayerbook :: "Flame"`
- `Isolated Merchant - Weeping Peninsula :: "Note: Walking Mausoleum"`
- `Remembrance of the Fire Giant :: "Burn"`
- `Twin Maiden Husks :: "Ash of War: Divine Beast Frost Stomp"`

### 2c. Records with content but zero out-edges — 358; zero inbound (orphans) — 401

401 player-relevant entities (item 182, armor 63, region 34, weapon 25, quest 21, boss 17,
ash 17, npc 17, enemy 9, …) have **no inbound edge** and are reachable only through search or
the Library list. 2 records have no edges at all. Examples:

- `region:abandoned-coffin` (region) — out 0
- `grace:160006` "Abductor Virgin" — 2 edges, 0 inbound
- `item:abundance-twinblade` (weapon) — out 0
- `item:acid-spraymist` (item) — out 0
- `item:asimi-silver-chrysalid` (item) — out 0
- 11 of the orphans are pseudo-items named `About …` (`item:about-the-map`, `item:about-bows`, …)

### 2d. `record.related` labels that resolve to no entity — 606

`record.related` holds display labels (mostly short region names such as `Liurnia`,
`Mountaintops`, `Siofra`, `Dragonbarrow`, `sote`). It is **not** rendered as links (the Related
tab uses graph edges, `src/library/EntityPanel.tsx:465`), so this is data quality only, but it
inflates the coverage guard that counts `related` (`src/lib/entityCoverage.ts:104`). Examples:
`boss:adula :: Liurnia`, `boss:ancestor-spirit :: Siofra`, `boss:bayle :: sote`,
`boss:commander-niall :: Mountaintops`.

### 2e. Regions with no contents, and roster/index drop disagreement

- **245 of 356 region records have no `contains` edge** to any grace, boss or dungeon, so the
  region page's contents are empty. Examples: `region:abandoned-cave`, `region:abandoned-church`,
  `region:abandoned-coffin`, `region:abyssal-woods`, `region:academy-crystal-cave`,
  `region:ainsel-river-main`.
- **44 bosses** where `src/data/bosses.json` and the entity-index record disagree on drops
  (the index carries drops the roster does not, or vice versa), so the boss page and the map
  pop-up can list different spoils. Examples: `boss:radahn` (record adds
  "Remembrance of the Starscourge / Radahn's Great Rune"), `boss:ekzykes` (record adds "Icon"),
  `boss:perfumer-tricia`, `boss:lansseax--rampartside-path`,
  `boss:stonedigger-troll--old-altus-tunnel`.

---

## 3. Inference

### 3a. Dead facts — 7

Catalog facts that neither imply anything nor are implied/referenced by any rule, chain, gate,
storyline step, remembrance or drop:

- `item:sewing-needle`, `item:idus-sword`, `item:hefty-scimitar`, `item:reverse-bladed`
- `quest:fia:concluded`
- `boss:dragonkin-soldier--ainsel-river`, `boss:dragonkin-soldier--siofra-river-bank`
  (their region strings have no `REGION_FACT` entry, so they imply nothing)

(27 further edge-less ids are shared multi-location boss pages — by design, not dead.)

### 3b. Cycle — 1

```
region:haligtree -> item:haligtree-secret-medallion -> region:haligtree
```

`src/knowledge/catalog.ts:39` (`region:haligtree` implies the medallion) and `:110`
(`item:haligtree-secret-medallion` implies `region:haligtree`). The second edge is the dubious
one: holding the medallion does not prove the Haligtree was reached. Neither fact is ever
flagged dead, but `status()` can point each at the other ("ahead — reach …").

### 3c. Bell-bearing chains that can never fire — 17

See §1d. `linksAudit` reports 0 dead data ids because the prefix filter drops them.

### 3d. Boss facts whose own region is not implied — 43

21 boss facts have a region that maps to a region fact they do not imply; 22 name a region with
no `REGION_FACT` match. Mostly by design (`boss:margit` implies `grace:castleward`; the region
is proven transitively through graces), but the 22 unmatched ones are genuine gaps, e.g.
`boss:mohg` "Mohgwyn", `boss:astel` "Lake of Rot", `boss:rennala-sote` "Castle Ensis",
`boss:messmer` "Shadow Keep" (maps to shadow but not implied), `boss:placidusax` "Farum Azula".

### 3e. Gates / nonexistent implications — 0

No gate references a missing trigger/approaching id, and no catalog/chain implication points at
a non-existent id. Six catalog `implies` targets have no **catalog row** and are registered only
as graph stubs: `item:lord-of-blood-favor → quest:varre:cloth`,
`item:pureblood-medal → quest:varre:cloth`, `item:mending-rune-order → quest:goldmask:regression`,
`item:nagakiba → quest:yura:nagakiba`, `item:flock-canvas-talisman → quest:gowry:concluded`,
`item:thops-barrier → quest:thops:barrier`.

---

## 4. Dead / unreachable

- **Empty pages (2):** `item:fetal-position` (item) and `npcs:147100` (npc) have no description,
  location, stats, drops, sections or image (matches `docs/PAGE-AUDIT.md`).
- **Dead "Related" chips (509):** every `relatedLore` edge from §1a renders a chip in the
  Related tab whose target has no page (e.g. "the ravine", "deep siofra well",
  "abductor virgin").
- **Buttons on a no-data page:** because the wrong-kind `foundIn` chips (§1b) and the ghost
  `relatedLore` chips all call `openEntity`, the panel they open shows the "No data for this
  entity yet" stub rather than the intended region/place.
- **"Mark done" offered where tracking is refused (1,317 entities).** `src/EntityActions.tsx:37`
  renders "Mark done" for every id, but `src/library/pageModel.ts:147 trackActionLabel` returns
  `null` for region, dungeon, grace, npc, merchant, mechanic, build and for shared multi-location
  boss pages. Clicking "Mark done" on a mechanic card or a region (tutorial text, a region, a
  reference card) writes a meaningless fact via `applyFacts`. The entity panel already avoids
  this with kind-specific actions; `EntityActions` does not.
- The 401 inbound-orphans in §2c are not "unreachable" literally (search and the Library list
  reach them) but they are disconnected from the graph a player navigates.

---

## 5. Duplicates / overlap

### 5a. Same normalised name across different kinds — 288 (88 non-place)

Structural place overlaps (a grace and a region and a dungeon sharing a name) account for 200.
The remaining 88 are true cross-kind duplicates a player hits as two pages. Examples:

- `Anastasia, Tarnished Eater`: `invader:anastasia` | `npc:anastasia-tarnished-eater`
- `Asimi, Silver Tear`: `item:asimi-silver-tear` | `npc:asimi-silver-tear`
- `Battlemage Hugues`: `hunt:battlemage-hugues` | `item:battlemage-hugues`
- `Blackguard Big Boggart`: `merchant:blackguard-big-boggart` | `npc:blackguard-big-boggart`
- `Patches`: `line:patches` (kind quest, holding shop stock as `drops`) | `npc:patches`
- `Boc the Seamster`: `line:boc` | `npc:boc` | `npc:boc-the-seamster`
- `Blasphemous Blade`: `item:blasphemous-blade` | `build:blasphemous`
- `Ash of War Scarab`: `enemy:ash-of-war-scarab` | `item:ash-of-war-scarab` (record kind `armor`)

**Within one kind — 51.** Two records of the same kind share a normalised name. Many are two
grace sites that genuinely share a name, but some are true duplicates/exact-name collisions:

- `npc|boc the seamster` → `npc:boc` | `npc:boc-the-seamster`
- `grace|artist s shack` → `grace:61443800` | `grace:62384500`
- `grace|divine bridge` → `grace:110009` | `grace:110505`
- `quest|alexander warrior jar caelid redmane castle` → `quest:alexander-warrior-jar-step-3` | `…-step-4`
- `quest|count ymir high priest cathedral of manus metyr` → 4 `count-ymir-high-priest-step-*` records

### 5b. One alias pointing at several records — 83

Examples:

- `malenia goddess of rot` → `boss:malenia` , `grace:malenia-goddess-of-rot`
- `godrick the grafted` → `boss:godrick` , `grace:godrick-grace`
- `margit the fell omen` → `boss:margit` , `grace:margit-the-fell-omen`
- `full grown fallingstar beast` → `boss:full-grown-fallingstar` , `boss:fallingstar-beast--sellia-crystal-tunnel`
- `death bird` → `boss:deathbird--scenic-isle` , `boss:deathbird`
- `bloodhound knight` → `boss:darriwil` , `boss:bloodhound-knight`

These are the same collisions that cause the §1b hijack. `canonicalFactId` disambiguates boss
ids by prefix, but free-text search and `autolink` can resolve to either.

### 5c. Repeated entries inside `drops` / `related` — 36

Examples: `boss:full-grown-fallingstar.drops` repeats `"Smithing Stone [6]"` and
`"Somber Smithing Stone [6]"`; `boss:malenia.drops` repeats `"* Malenia's Great Rune"`;
`enemy:catacombs-sorcerer.drops` repeats `"Ghost Glovewort 4/5/6"`;
`build:dragon-communion.related` repeats `"Greyoll's Roar"`.

### 5d. The same fact tracked twice

`line:patches` (quest) and `npc:patches` describe one character; merchant records
(`merchant:blackguard-big-boggart`) duplicate their NPC record's shop. `line:*` records are
quest lines that also carry `drops`/`location` copied from the NPC they belong to.

---

## 6. Data overlap conflicts

### 6a. Catalog region vs entity-index region — 68

The authored catalog and the merged enrichment index disagree on the same id. Some are
granularity, some are genuinely different places. Examples:

- `boss:rennala-sote` catalog `Castle Ensis` vs record `Gravesite Plain`
- `boss:messmer` catalog `Shadow Keep` vs record `Scadu Altus`
- `boss:astel` catalog `Lake of Rot` vs record `Ainsel River`
- `quest:ranni:ring` catalog `Moonlight Altar` vs record `Lake of Rot`
- `boss:regal-ancestor` catalog `Nokron` vs record `Siofra River`
- `boss:mohg` catalog `Mohgwyn` vs record `Mohgwyn Dynasty Mausoleum`

Boss roster vs entity-index region: 0 exact-id disagreements (they agree).

### 6b. Same boss name, different rune strings — 23

Per-encounter differences are expected, but the strings are formatted inconsistently, e.g.
`Grave Warden Duelist`: `1,700` vs `1700`; `Black Knife Assassin`: `1,600` vs `1600` vs `80000`;
`Ancient Hero of Zamor`: `5039` vs `5,039`-style mixing and `20000`/`5400`. Multi-location
boss names also legitimately carry 2–8 different regions each (100 groups), e.g. Night's
Cavalry ×10.

---

## FIX LIST (ranked by player impact — no fixes applied)

1. **Place-name links land on quest lines / gates (53 `foundIn` edges, 9 rogue targets).**
   Every boss, item and region in Weeping Peninsula, Jagged Peak, Volcano Manor, Murkwater,
   Finger Ruins, Enir-Ilim and Shadow Keep shows the wrong "Region/Related" chip (e.g. Bayle →
   "Igon", Deathbird (Weeping) → "Irina & Edgar"), and those quest lines/regions gain spurious
   connections. Fix in **`src/lib/entityGraph.ts`**: when resolving `region`/`location` by name
   for the catalog/loot/acquisition `foundIn` edges, restrict the target to
   region/grace/dungeon (as the entity-index path already does at `:603-608`); and stop
   storyline/gate aliases that are bare place names from winning `byName`. Optionally tighten
   the place-name aliases in **`src/knowledge/storylines.ts`** / **`src/knowledge/gates.ts`**.

2. **509 dead "Related" chips from ghost grace slugs.** Fix the id split between
   **`scripts/gen-aliases.mjs`** (stop minting `grace:{name-slug}` stubs; emit the existing
   `grace:{warpId}` record id from `public/sourced/entity-index.json`) and/or register the stub
   graces in **`src/lib/entityGraph.ts`**. 354 alias rows carry the dead slug.

3. **"Mark done" offered where the page model refuses tracking (1,317 entities).** Every generic
   entity card renders "Mark done" (`src/EntityActions.tsx:37`) even for regions, dungeons,
   graces, NPCs, merchants, mechanics, builds and shared boss pages where
   `src/library/pageModel.ts:147 trackActionLabel` deliberately returns `null`; clicking writes a
   meaningless fact. Fix in **`src/EntityActions.tsx`** to consult `trackActionLabel`/`status`
   like the entity panel does.

4. **17 bell-bearing inference chains never fire.** Fix the ids in
   **`src/knowledge/inferChains.ts`** (`bellBearingRule(…)` calls: use `item:<name-slug>`, e.g.
   `item:kale-s-bell-bearing`). This is a core "I own X so I reached Y" inference the player
   never gets.

5. **Item drops and merchant stock land on mechanics cards (49 edges).** `Rune Arc`,
   `Golden Seed`, `Memory Stone`, `Crystal Tear`, `Wondrous Physick` and several merchants'
   stock link to the mechanics glossary instead of the real item. Fix in
   **`src/lib/entityGraph.ts`**: for `drops`/`sells` resolve to owned kinds first (or give owned
   kinds a higher `NAME_PRIORITY` than `mechanic`), and guard the `drops`/`sells` target kind.
   The items themselves exist, so **`src/knowledge/merchants.ts`** / `entityIndexBuild` names
   are fine.

6. **Merchant shop stock stored as `drops` on quest lines (10 `droppedBy` edges, e.g.
   `line:patches`).** Fix **`src/lib/entityIndexBuild.ts`** so a merged NPC/merchant record does
   not write shop stock into `record.drops`, and/or guard `record.drops` in
   **`src/lib/entityGraph.ts`**. This is also the `line:patches` / `npc:patches` duplicate.

7. **401 orphans / 358 content records with no edges / 245 empty regions.** The enrichment
   record's `location`, `region` and `drops` are not matching any target for these
   (`item:abundance-twinblade`, `item:acid-spraymist`, `region:abandoned-coffin`, …). Fix the
   name matching / add the missing `foundIn`/`contains`/`drops` edges in
   **`src/lib/entityGraph.ts`** and the field extraction in **`src/lib/entityIndexBuild.ts`**.

8. **149 boss/enemy drop names resolve to no item** (e.g. `"3x Dragon Heart"`,
   `"Dragon Heart x5"`, `"Smithing Stone (7) x 5"`) **and 44 roster/index drop lists disagree.**
   Normalise drop strings (strip `Nx`, parentheses, `Unlocks …`) in
   **`src/lib/entityIndexBuild.ts`** and align the roster in
   **`scripts/build-boss-roster.mjs`** so one loot list is authoritative.

9. **88 cross-kind + 51 within-kind name duplicates** (`invader`/`npc`, `hunt`/`item`,
   `merchant`/`npc`, `line`/`npc`, `enemy`/`item`; `npc:boc`/`npc:boc-the-seamster`). Merge or
   alias them in **`src/lib/entityIndexBuild.ts`** and **`scripts/gen-aliases.mjs`**.

10. **359 warp/alias search rows + 354 alias slugs point at the synthetic grace stub.** Same root
    as #2: align the alias plane's canonical slug with the entity-index id in
    **`scripts/gen-aliases.mjs`** so `canonicalFactId`, `searchSync` and `relatedFor` stop
    returning ghost ids.

11. **68 catalog-vs-index region disagreements** (several are real, e.g. `boss:messmer`
    Shadow Keep vs Scadu Altus, `boss:rennala-sote` Castle Ensis vs Gravesite Plain). Fix the
    region source precedence in **`scripts/build-boss-roster.mjs`** (or the record merge in
    **`src/lib/entityIndexBuild.ts`**).

12. **`region:haligtree` ⇄ `item:haligtree-secret-medallion` cycle.** Drop the
    `implies: ['region:haligtree']` from the medallion in **`src/knowledge/catalog.ts:110`**
    (or move it to a directional chain in **`src/knowledge/inferChains.ts`**).

13. **7 dead catalog facts + 6 `implies` targets with no catalog row** (4 items,
    `quest:fia:concluded`, 2 Dragonkin encounters with no region mapping). Wire or drop them in
    **`src/knowledge/catalog.ts`**; add Ainsel/Siofra to `REGION_FACT` if the encounters should
    imply their region.

14. **2 empty pages** (`item:fetal-position`, `npcs:147100`) — fill from the wiki corpus or
    exclude in **`src/lib/entityIndexBuild.ts`**.

15. **9 engine-marker pickups + 3 build/hosted ids that resolve to nothing**
    (`item:40000900` "Ash of War: Blinkbolt", `build:dark-moon.need`, `hosted grace:120300`).
    Add them to the alias plane in **`scripts/gen-aliases.mjs`** or fix the ids in
    **`src/knowledge/builds.ts`**.

## ASSUMPTIONS

- "Dangling" for map data was judged by *consumer*: `engine-markers.json` ids are namespaced
  `engine:<id>` by `src/lib/engineMarkers.ts:57`, and the `items[]`/`markers[]` lists are matched
  by name for search, so their raw numeric ids are not entity references. Only the **9**
  `items[]` rows that resolve by neither id nor name are reported. `coords.json` is matched by
  name. `boss-pins.json` ids all resolve (0 dangling), so it is reported as clean.
- Search was checked through `searchSync`'s id construction (`canonicalFactId` on warp/alias
  rows); the "shop:<vendor>:<item>" composite ids are a deliberate Codex address, not entity
  refs, so they are not counted as dangling.
- `record.related` unresolved labels were rated low because the Related tab renders graph
  edges, not `record.related` (`src/library/EntityPanel.tsx:465`).
- Rune differences across a multi-location boss are treated as legitimate per-encounter data;
  only the string-format inconsistency is flagged.
- `containsBeat`/`nextBeat` edges to grace/item ids are authored beats, not wrong-kind, so they
  are excluded from the 112 wrong-kind total.
- Multi-location shared boss pages (`boss:adula`, `boss:godskin-apostle`, …) are intentionally
  edge-less, so they are excluded from "dead facts".
- Generated audit docs were regenerated once by the required checks and then reverted; only
  this report is committed.

## Not done / why

- No fixes were applied (read-only brief).
- Gideon tool outputs were not resolved exhaustively: they are compiled per request from the
  same `resolveEntityId`/`hasEntity` authority audited here, so any defect surfaces through the
  dangling/wrong-kind counts above rather than through a separate static scan.
- `npm run index:entities` was deliberately **not** run (generated file; read-only brief).
- The 5,685-record index in the working tree differs from HEAD only in `generatedAt`, so all
  counts reflect HEAD's records.
