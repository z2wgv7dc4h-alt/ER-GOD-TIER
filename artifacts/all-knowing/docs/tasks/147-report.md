# Task 147 — Read-only data completeness audit (report)

Generated from `.scratch/147/` scripts against a 2026‑09‑29 index snapshot
(`public/sourced/entity-index.json`, `generatedAt 2026-09-29T10:43:37Z`, **6307 records**).
Read-only: no source, data, test or generated file was modified. The Fandom SQLite dump used is
`.scratch/er-mcp.db` (49 MB, gitignored). `.env`/`.env.local` were never opened.

Method: Section 1 = game FMG name tables vs. index names/aliases. Section 2 = per‑kind field
coverage + on‑disk fillability. Section 3 = unused/redundant sources. Section 4 = 20 random
records/kind + whole-index flag counts. Section 5 = normalised-name duplicates. Scripts:
`section1.mjs`, `section2.mjs`, `fillable.py`, `fillable2.mjs`, `section3.py`, `section4.mjs`,
`section4b.mjs`, `section5.mjs`, `section5b.mjs`.

---

## 1. Completeness vs the game's own name tables

Counts after dropping junk (`%null%`, empty, `[ERROR]`) and, for `WeaponName`, affinity variants
(non‑multiple‑of‑10000 ids such as "Heavy X"). Resolution is by normalised name against index
records **and** `aliases.json`.

| table | rows | junk | affinity variants | real names | unique | resolved | unresolved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| WeaponName | 3722 | 0 | 3156 | 566 | 566 | 562 | **4** |
| ProtectorName | 788 | 0 | 0 | 788 | 768 | 743 | **25** |
| AccessoryName | 157 | 0 | 0 | 157 | 157 | 157 | **0** |
| GoodsName | 2221 | 0 | 0 | 2221 | 2108 | 1224 | **884** |
| GemName | 126 | 0 | 0 | 126 | 125 | 99 | **26** |
| ArtsName | 265 | 0 | 0 | 265 | 258 | 121 | **137** |
| NpcName | 482 | 0 | 0 | 482 | 318 | 298 | **20** |
| PlaceName | 1006 | 0 | 0 | 1006 | 609 | 564 | **45** |

What the unresolved names are (full lists in `.scratch/147/section1.out.txt`):

- **WeaponName (4):** `Royal Soldier Straight Sword`, `Great Épée`, `Varré's Bouquet`,
  `Pulley Crossbow` — cut/prop or DLC variants with no matching record.
- **ProtectorName (25):** `Type 1`…`Type 20`, plus `Travel Hairstyle`, `Head`, `Body`, `Arms`,
  `Legs` — dev/cut placeholders, not real armour. Mark as cut.
- **GoodsName (884, 40% of the table):** overwhelmingly **upgrade tiers that are not distinct
  items** — e.g. `Flask of Crimson Tears +1…+12`, `Black Knife Tiche +1…+10`, `Mimic Tear Ashes
  +1…+10` (dozens of spirit-ash families). These arguably should not be records. Genuinely missing
  named goods among them: the **Maps** (`Map: Limgrave, West` … 18 rows), **Notes**
  (`Note: Flask of Wondrous Physick` …), and a handful of **Cookbooks**
  (`Nomadic Warrior's Cookbook [12]/[19]`, `Armorer's Cookbook (5)`, `Glintstone Craftsman's
  Cookbook [7]`, `Missionary's Cookbook (3)`), plus `Golden Rune [11]`.
- **GemName (26):** `test gem 1/2/3` (junk) + **23 Ashes of War**, mostly DLC
  (`Ash of War: Dryleaf Whirlwind`, `Ash of War: Carian Sovereignty`, `Ash of War: Blinkbolt`, …).
  The index has 124 `ash` records; these names are not among them.
- **ArtsName (137):** weapon skills / Ash-of-War skill names (`Waterfowl Dance`,
  `Night-and-Flame Stance`, `Messmer's Assault`, `Moonlight Greatsword`, …). Only 121/258 resolve;
  the index has no skill record for most, and many are DLC.
- **NpcName (20):** long display titles vs. short record names (`Blaidd the Half-Wolf`,
  `Roderika, Spirit Tuner`, `Kenneth Haight, Limgrave Heir`, `Yura, Hunter of Bloody Fingers`,
  `Asimi, Eternal King`, …); `Someone Yet Unseen` is cut/junk.
- **PlaceName (45):** DLC locations untracked as regions (`Tenebrae Demesne`, `Moorth Highway`,
  `Rauh Base, Bear Woods`, `Darklight Catacombs, Lower Level`), colosseums
  (`Limgrave Colosseum`, `Caelid Colosseum`), `Leyndell, Ashen Capital`, and **Volcano Manor
  Request** pseudo-names.

**Verdict:** coverage is strong for Accessory (100%), Protector (94.3% unique), Weapon (99.3%),
and Npc (93.7%); weak for Goods (58%), Arts (47%), Place (93%), Gem (79%).

---

## 2. Field coverage per kind + fillability

Percentages are `records with field / kind total`. "coords" = `record.map.x`; "picture" =
`record.image` OR `image-index.json` hit. `location` counts `location` **or** `region`.

| kind | n | description | location/region | coords | picture | stats | drops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| armor | 750 | 100% | 91% | 0% | 73% | 91% | 0% |
| ash | 124 | 100% | 77% | 0% | 62% | 86% | 0% |
| boss | 280 | 97% | 100% | **87%** | 83% | 100% | 89% |
| build | 28 | 96% | 7% | 4% | 29% | 0% | 0% |
| dungeon | 119 | 91% | 100% | **100%** | 99% | 0% | 0% |
| ending | 5 | 60% | 40% | 0% | 0% | 0% | 0% |
| enemy | 1276 | 100% | 100% | 0% | **28%** | 96% | 45% |
| gate | 10 | 80% | 20% | 0% | 0% | 0% | 0% |
| grace | 416 | 100% | 100% | **100%** | 34% | 100% | 0% |
| item | 1187 | 97% | 95% | 0% | 45% | 82% | 0% |
| material | 3 | 100% | 100% | 0% | 67% | 100% | 0% |
| mechanic | 65 | **63%** | 40% | 0% | 2% | 0% | 0% |
| merchant | 106 | **11%** | 100% | 11% | 25% | 11% | 0% |
| npc | 195 | 98% | 88% | 33% | 31% | 83% | 0% |
| quest | 468 | 99% | 77% | 3% | 4% | 0% | 0% |
| region | 311 | 100% | 100% | 1% | 43% | 0% | 0% |
| shield | 69 | 100% | 100% | 0% | 100% | 100% | 0% |
| spell | 217 | 100% | 99% | 0% | 78% | 100% | 0% |
| spirit | 79 | 100% | 95% | 0% | 80% | 100% | 0% |
| talisman | 158 | 100% | 97% | 0% | 55% | 99% | 0% |
| weapon | 441 | 100% | 96% | 0% | 69% | 96% | 0% |

Gaps that an on‑disk source can fill (`.scratch/147/fillable*.out.txt`):

- **Words, not just fields:** 414 records have a *fragment* or *single-token* description
  (`The is a boss…`, `drop`, `merchant`, `other`). **361** have a longer real description on a
  matching `public/sourced/open/wiki-db/*.json` page — by kind: item 159, region 138, npc 25,
  weapon 17, boss 13, dungeon 2, spirit 2, spell 2, talisman 1, armor 1, ash 1.
- **Coords:** `public/sourced/open/coords.json` (2045 rows: grace 429, item 1490, fragment 46,
  spirit‑ash 80) matches by name for records with no `map`: **item 382, armor 343, weapon 273,
  talisman 139, spell 120, shield 38** (≈1295 records). Boss pins/`grace-xyz` already back the
  87%/100% boss/grace coords. *Caveat:* `src/lib/coords.ts` already consumes `coords.json` at
  runtime, so some of this may be a display-model gap rather than a missing-data gap.
- **NPC coords/location:** `public/sourced/npc-placements.json` fills coords for **17** NPCs with
  no map (e.g. `Hermit Merchant (Ainsel River)`, `Hermit Merchant (Altus Plateau)`);
  `wiki-db/npc.json` fills `location` for **34** of 36 missing and `description` for **2** of 4.
- **Boss drops (32 missing):** `bosses-fextralife.json` fills **30**, `wiki-db/boss.json` **15**,
  `wiki-db/boss-encounters.json` **3**.
- **Boss runes:** `.scratch/er-mcp.db` `bosses.runes` supplies a rune value for **169** boss
  records (28 index bosses lack it); only 23 boss records mention runes in `drops` at all.
- **Locations for items/armor:** `open/acquisition.json` fills location for **4** items and
  **7** altered armors.
- **Dungeon/region/quest descriptions:** `wiki-db` fills **10** dungeons, **1** region,
  **2** quests, **2** mechanics.
- **Enemy drops:** **705** enemies lack drops; `wiki-db/enemy.json` fills **0** by name — the
  source does not carry per-enemy drop data.

---

## 3. Unused / redundant sources

### er-mcp.db (unused tables)

| table | rows | matches an index record | what the index is missing |
| --- | ---: | ---: | --- |
| `armor` | 680 | 680 | nothing (slot/weight/poise already in `stats`); 57 rows carry `effects` (no index field) |
| `bosses` | 165 | 125 | `runes` value would fill **28** bosses; 111 rows carry `drops` (no index field) |
| `spells` | 213 | 211 | `fp_cost`/`slots_used` would fill **5** spells; 70 rows carry `stamina_cost` (no field) |
| `talismans` | 156 | 156 | nothing (weight/effect already present); 156 rows carry `summary` (no field) |
| `weapons` | 480 | 408 | nothing (type/weight/skill/requirements already present) |
| `entities` | 1694 | 1665 name/alias hits | typed page list (armor 680, weapon 480, spell 213, boss 165, talisman 156) |
| `redirects` | 2730 | 657 already known | **2073 new aliases** (e.g. `Ash of War: Glintsword Arch` → `Ash of War: Glintblade Phalanx`, `Ash of War` → `Ashes of War`) |

The stale stats tables largely duplicate data the index already has; the actionable value is
`bosses.runes` + `redirects` (aliases not currently generated).

### Redundant files

- `guide/overrides.json`: 32 entries, 27 keys in `entity-overrides.json`, **0 overlap**; the index
  has records for **0** of the override ids; only 2 entries carry map coords. Not actually consumed.
- `guide/regions/*.json`: 25 files, 1074 cleanup rows, 124 legs; cleanup ids/names not in
  `guide/items.json` = **0** (fully represented).
- `wiki-db/class.json` 17 records (0 known), `faction.json` 53 (1 known → 52 new),
  `gesture.json` 48 (48 known), `lore.json` 115 (9 known → 106 new),
  `mechanic.json` 4 (0 known), `object.json` 29 (2 known → 27 new).
- `wiki/pages-*.json` (4939 pages/42 chunks) and `wiki/search-*.json` (36 buckets) are flagged
  UNUSED but are **loaded at runtime** by `src/lib/wikiSearch.ts` (`loadWikiChunk`, `loadBucket`) —
  false positives, not redundant.

---

## 4. Correctness spot checks (20 random/kind)

Full transcript in `.scratch/147/section4.out.txt`. The random samples themselves were largely
coherent (names match descriptions, regions plausible); the systemic problems are below.

Whole-index flag counts for the 7 checked kinds:

| kind | n | no region | region has digits | fragment/ junk desc | cut/unattainable | mod/Reforged | raw-id name | empty desc |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| boss | 280 | 0 | 0 | 22 | 0 | 0 | 0 | 8 |
| enemy | 1276 | 6 | 0 | 0 | 1 | 0 | 0 | 0 |
| npc | 195 | 23 | 1 | 29 | 6 | 0 | 0 | 4 |
| item | 1187 | 61 | 293 | 6 | 1 | 0 | 0 | 37 |
| weapon | 441 | 18 | 47 | 14 | 18 | 0 | 0 | 0 |
| region | 311 | 0 | 0 | 138 | 0 | 0 | 0 | 1 |
| quest | 468 | 109 | 2 | 0 | 0 | 0 | 0 | 5 |

**Findings:**

- **Fragment descriptions (211 index-wide):** missing subject, e.g. boss `Ancestor Spirit` →
  "The is an optional boss in Elden Ring."; boss `Cleanrot Knight` → "are Enemies and Bosses…";
  item `Scorpion Stew` and others start mid-thought. Region kind alone has 138
  (`The is a Site of Grace…`).
- **Junk single-token descriptions (203):** item descriptions that are exactly `drop`, `other`,
  `merchant` (e.g. `Ash of War: Barbaric Roar` → "drop", `Arrow` → "merchant").
- **Cut content leaks as obtainable weapons (18):** `Abundance Twinblade`,
  `Blackflame Monk's Seal`, `Father Marika's Hammer`, `Heavy Erdtree Greatshield`, … descriptions
  say "was cut from Elden Ring. This item is unattainable". Their "Heavy X" variants are additional
  cut duplicates.
- **Wrong/shifted region field:**
  - 24 records use the DLC tag `Shadow of the Erdtree` as `region`/`location` (1 boss, 12 enemies,
    9 NPCs, 1 quest, 1 region) instead of a real place.
  - `item.region` is almost always **acquisition prose**, not a region: 293/1187 contain digits
    (e.g. "Found on a corpse…", "Location: Rose Church…"). Item has `region` on only 72 records;
    the other 1115 fall back to `location`.
  - The `region` kind stores a **type** in `region` (`Church`, `Shack`, `Rise`, `Site of Grace`,
    `Subregion`, `Unseen Location`), not a parent region — 43 use an actual type/tag.
- **Placeholder drops:** 48 enemy records include the literal `See #Drops` (all `Wandering Noble`
  variants and others).
- **`Dummy Entity` ×7** enemies survive in the index.
- **Boss descriptions that are raw stat blocks (5):** `Black Knife Assassin (…)}` and
  `Soldier of Godrick` start with "- Stance: …"/"- HP (solo): …".
- **NPC placeholders:** 23 NPCs have no region, 6 are explicitly cut/unseen, several descriptions
  begin with a quote or "was a character" with no name.
- **No mod/Reforged content found:** a case-insensitive scan for `reforged|mod|convergence|
  nightreign|seamless co-op` across all descriptions/names returned **0** hits (the earlier Task 145
  "replace Reforged data" work appears to have held).
- **No raw-id names:** 0 record names are bare numeric ids.

**Could not check:** whether a record's `region` is *semantically* the right place — there is no
authoritative name→region mapping on disk, so only structural oddities above were flagged.
Individual sample items looked plausible; no per-record ground truth beyond the wiki pages.

---

## 5. Duplicates

Per-kind counts of records collapsing to the same normalised name (case + punctuation folded,
trailing possessives/parentheticals stripped) and exact-string duplicates:

| kind | records | distinct names | exact-name dup groups | extra records | norm-name groups | notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| enemy | 1276 | 608 | **177** | **668** | 203 | same creature recorded once per placement (e.g. `Omen` ×4, `Giant Crab` ×5, `Crab` ×4) |
| boss | 280 | 280 | 0 | 0 | 32 | all norm groups are region/`(Location)` variants — intentional |
| npc | 195 | 190 | **5** | 5 | 9 | dual id schemes: `npc:boc` + `npc:boc-the-seamster`, `npcs:141300` vs `npc:fire-knight-queelign`, etc. |
| item | 1187 | 1186 | **1** | 1 | 25 | `Haligtree Secret Medallion (Left)` exists as two ids |
| quest | 468 | 410 | **34** | 58 | 45 | step records share a display name (`Count Ymir… x4`, `Dung Eater… x2`) because the step number is dropped from the title |
| armor | 750 | 750 | 0 | 0 | 98 | 97 are the intentional `(altered)` sets collapsing (normaliser strips parens) |
| weapon | 441 | 439 | 0 | 0 | 5 | `(weapon)`/`(DLC)` style variants |
| region | 311 | 311 | 0 | 0 | 5 | parenthetical variants |
| grace | 416 | 409 | 7 | 7 | 7 | exact dup names within grace |
| ash/spell | 124/217 | 124/217 | 0 | 0 | 1/4 | minor |

**Names differing only by case/punctuation (excluding exact dupes):** 2 —
`item: Dectus Medallion (Right)` / `Dectus Medallion (right)` and
`spell: Giant's Flame Take Thee` / `Giantsflame Take Thee`.

---

## TOP 10 FIXES (ranked by user impact)

1. **Replace fragment / single-token descriptions (~414 records, ~361 fillable).**
   `The is a…`, `drop`, `merchant`, `other` are the most user-visible defects (every entity page
   and search card). Source: `public/sourced/open/wiki-db/*.json` (item 159, region 138, npc 25,
   weapon 17, boss 13, dungeon 2, spirit 2, spell 2, talisman 1, armor 1, ash 1), fallback
   `er-mcp.db` `pages`/`sections`.
2. **Merge duplicate enemy records (177 exact-name groups / 668 extra records).**
   `Omen`, `Giant Crab`, `Crab`, `Baleful Shadow`, `Juvenile Scholar` etc. repeat per spawn.
   Source: rebuild from `open/msb-enemies.json` + `enemy-combat.json` (merge placements into one
   entity). Est. **668** records removed/merged.
3. **Backfill map coords on item/equipment records (~1295 matches currently 0%).**
   Source: `public/sourced/open/coords.json` by name → item 382, armor 343, weapon 273, talisman
   139, spell 120, shield 38. (Check whether `src/lib/coords.ts` already resolves this at runtime
   before treating as a data gap.)
4. **Add the missing aliases so game-name tables resolve (up to ~1112 names).**
   Biggest contributors: Goods 884 (mostly upgrade tiers — filter those first), Arts 137, Place 45,
   Gem 26, Npc 20. Source: `.scratch/er-mcp.db` `redirects` (**2073 new aliases**), plus
   `open/names.json`/`gen-aliases`. Real wins: 18 Maps, several Notes/Cookbooks, 23 DLC Ashes of War,
   20 NPC display titles.
5. **Fill missing pictures (enemy 915/1276, item 650, grace 276, region 177, npc 135).**
   Source: `checklists/*.json` `image` fields + `src/data/image-index.json` build; images already
   on disk in `public/sourced/images/**` (e.g. creatures 109, items 424, npcs 55).
6. **Quarantine cut / unattainable content (18 weapons + variants; 6 NPCs; the wiki's 89
   `Unused Content`-category pages / 18 `{{Infobox Weapon Cut}}` pages).** `Abundance Twinblade`, `Blackflame Monk's Seal`, `Father Marika's Hammer`,
   `Heavy Erdtree Greatshield` read as normal weapons. Source: `wiki-db/weapon.json` cut pages /
   `er-mcp.db` `{{Infobox Weapon Cut}}` (18 pages).
7. **Fill boss drops + runes (32 drop gaps, 28 rune gaps).**
   Source: `public/sourced/open/bosses-fextralife.json` (30), `wiki-db/boss.json` (15),
   `wiki-db/boss-encounters.json` (3), and `.scratch/er-mcp.db` `bosses.runes`.
8. **Fix the merchant kind (description 94/106 missing, stats 94/106, coords 94/106).**
   Source: `open/acquisition.json` (method/location), `eldenringmap.json` `merchants[19]`,
   `wiki-db` merchant pages (26 matchable by name).
9. **Fix `region` semantics + placeholder regions (24 DLC-tag regions, 43 region-kind types,
   293 item region prose).** Source: `wiki-db/location.json`, `open/game-areas.json`,
   `guide/map-extras.json`; plus the `region`-kind `region` field should move to a `type` field.
10. **Kill placeholder artifacts:** `Dummy Entity` ×7 enemies, `See #Drops` ×48 enemy drop lists,
    `Type 1–20` armour prototypes, `test gem 1–3`, and 4 `The is a boss…` boss descriptions.
    Sources: `open/enemies.json`, `wiki-db/enemy.json`, `text/ProtectorName.json`,
    `text/GemName.json`, `wiki-db/boss.json`. Est. **~80** records.

**Not checked / caveats:** no semantic region ground-truth; `coords.json` may already be consumed
by `src/lib/coords.ts` (a display-model rather than data gap); the two `wiki/search-*` families are
runtime-loaded and only look UNUSED; `data/raw/er-mcp.db` named in the catalog is not present in
this checkout (the dump lives at `.scratch/er-mcp.db`); the index snapshot is from 2026‑09‑29 and
task docs reference a later `generatedAt`.
