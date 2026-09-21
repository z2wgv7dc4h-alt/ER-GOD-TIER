# EanNewton Progress Tracker vs `catalog.ts` — Gap Report

**Date:** 2026-09-22
**Tracker:** [EanNewton progress tracker](https://docs.google.com/spreadsheets/d/1_7sTNSle8kxB72eNgICAfdGoWMbe4tFycy2PNwJFTw8/edit?usp=sharing)
**Catalog:** `artifacts/all-knowing/src/knowledge/catalog.ts`
**Type:** research/diff only — **no changes made to `catalog.ts` or any source file.**

---

## 1. Fetch method and result

**Successfully fetched.** The sheet is public (link-share), read-only access, no auth needed.

What was tried:

1. `.../export?format=csv` — works, but returns **only the first tab** (`Overview`). Google Sheets' plain CSV export does not expose other tabs without a `gid`.
2. The `/edit?usp=sharing` HTML was fetched and parsed for tab captions (`docs-sheet-tab-caption`), which enumerated **29 tabs**. The HTML is JS-rendered, so the tab *data* is not present there.
3. Each tab was then downloaded via the **Google Visualization (gviz) CSV endpoint**:
   `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=<tab name>`
   This returns clean RFC-4180 CSV (multi-line cells quoted correctly) for a named tab. **This is the method used for all data.**

All downloads were saved to `artifacts/all-knowing/.scratch/tab_NN_<name>.csv` (gitignored, inside the working tree). The `Map` tab returned a 0-byte CSV (it is an embedded chart/visual, not a data table) and carries no diffable rows.

### Tracker structure (29 tabs, verified)

| Tab | Rows | Tab | Rows |
|---|---:|---|---:|
| Overview | 22 | Incantations | 101 |
| Map | — (chart) | Ashes of War | 92 |
| Builds | 82 | Weapons | 257 |
| Achievements | 39 | Ranged Weapons | 52 |
| **Bosses** | **184** | Shields | 69 |
| **NPC Invaders** | **31** | Armor, Helms | 169 |
| Remembrances | 15 | Armor, Chest | 206 |
| Tools | 23 | Armor, Gauntlets | 94 |
| Spirit Ashes | 64 | Armor, Legs | 108 |
| Crystal Tears | 32 | Talismans | 115 |
| **Keys** | **140** | Paintings | 7 |
| Bell Bearings | 53 | internal_calculations | 90 |
| Cookbooks | 59 | TODO | 8 |
| Whetstones | 6 | base_template | 1096 |
| Sorceries | 70 | | |

The `Bosses` tab columns are: `✓ | Bosses Name | Location (or closest Grace) | Region | Type | Reward | Runes (NG) | Questlines | HP | Weaknesses | Strengths | Required | Summons`.
Boss `Type` values: **Field Boss ×135, Great Enemy ×33, Legend ×10, Demigod ×6** (184 rows, 116 unique names).

### Catalog count — re-verified

`catalog.ts` holds **89 facts**, exactly as the memo stated:

| Kind | Count |
|---|---:|
| region | 10 |
| grace | 23 |
| boss | 24 |
| item | 24 |
| quest | 8 |
| **Total** | **89** |

---

## 2. In the tracker, absent from `catalog.ts` (candidates to add)

Name comparison uses the same normalization as `src/lib/aliases.ts` (lowercase, `[^a-z0-9+]` → space, trim), matching tracker names against catalog `name` **and** `aliases`.

### 2a. Bosses — 5 Legend-tier base-game bosses missing

| Tracker name | Region (tracker) | Location | Note |
|---|---|---|---|
| Beast Clergyman | Crumbling Farum Azula | Crumbling Farum Azula | Phase 1 of Maliketh; catalog has `boss:maliketh` (alias `gurranq`) but **not** `beast clergyman` |
| Dragonlord Placidusax | Crumbling Farum Azula | Crumbling Farum Azula | Legend; also an achievement |
| Lichdragon Fortissax | Deeproot Depths | Prince of Death's Throne | Legend; also an achievement |
| Regal Ancestor Spirit | Nokron, Eternal City | Ancestral Woods | Legend |
| Hourah Loux, Warrior | Leyndell, Capital of Ash | Queen's Bedchamber | Catalog `boss:godfrey` covers this form via alias `hoarah loux`, but the tracker spells it **Hourah** and lists it as its own row |

### 2b. Bosses — 30 Great-Enemy-tier missing

Notable named fights the catalog does not encode: **Flying Dragon Agheel, Leonine Misbegotten, Elemer of the Briar, Magma Wyrm Makar, Commander Niall, Loretta Knight of the Haligtree, Glintstone Dragon Adula, Mimic Tear, Valiant Gargoyle Duo, Mohg the Omen, Godskin Apostle, Godskin Noble, Decaying Ekzykes, Borealis the Freezing Fog, Great Wyrm Theodorix, Commander O'Neil, Crucible Knight Siluria, Fia's Champions, Ancestor Spirit, Dragonkin Soldier, Dragonkin Soldier of Nokstella, Cemetary Shade, Stray Mimic Tear, Magma Wyrm, Godskin Apostle & Godskin Noble**. Full list in `.scratch/diff.json`.

### 2c. Bosses — 134 Field Boss rows / 71 unique names missing

The catalog intentionally curates major bosses only. These are the bulk of the gap and are lower-value individually (many are repeated across regions/evergaols), but they are the raw material for a completion/checklist layer. See `.scratch/diff.json → tracker_boss_extra`.

### 2d. NPC Invaders — 31 rows, zero catalog coverage

Includes **Great Horned Targoth, Knight Bernahl, Millicent's Sisters, Nameless White Mask (×3), Ensha, Mad Tongue Alberich, Anastasia Tarnished-Eater (×3), Bloody Finger Nerijus, Recusant Henricus, Edgar the Revenger, Festering Fingerprint Vyke, Preceptor Miriam (×2), Inquisitor Ghiza, Millicent, Eleonora Violet Bloody Fingerprint, Dung Eater, Maleigh Marais, Rileigh the Idle, Vargram the Raging Wolf, Errant Sorcerer Wilhelm, Bloody Finger Okina, Juno Hoslow, Sanguine Noble, White Mask Varre, Fia's Champions**. No `invader:` kind exists in the catalog.

### 2e. Keys / quest items — high-value omissions

The tracker's `Keys` tab (140 rows) covers most of the catalog's quest items (Sewing Needle, Academy Glintstone Key, Serpent's Amnion, Unalloyed Gold Needle, Fingerslayer Blade, Carian Inverted Statue, Dark Moon Ring all match). Missing from the catalog but present in the tracker:

- **Rold Medallion** (grand-lift gate; catalog has Dectus + Haligtree medallions but not Rold)
- **Cursemark of Death**, **Miniature Ranni**, **Valkyrie's Prosthesis** (Ranni/Millicent line)
- **Black Knifeprint**, **Weathered Dagger**, **Sellian Sealbreaker**, **Rya's Necklace**, **Volcano Manor Invitation**, **Lord of Blood's Favor**
- **Alexander's Innards**, **Seluvis's Potion**, **Tonic of Forgetfulness**, **Shabriri Grape**, **Fingerprint Grape**
- **Deathroot**, **Stonesword Key**, **Imbued Sword Key**, **Memory Stone**, **Talisman Pouch**, **Spirit Calling Bell**, **Crafting Kit**, **Whetstone Knife**, **Lost Ashes of War**, **Dragon Heart**, **Larval Tear**
- Prayerbooks: **Ancient Dragon / Giant's / Assassin's / Dragon Cult / Fire Monks' / Godskin / Two Fingers / Golden Order Principia** + scrolls

### 2f. Other tracker tabs with no catalog counterpart

- **Remembrances (15):** Remembrance of the Grafted / Full Moon Queen / Starscourge / Regal Ancestor / Naturalborn / Blasphemous / Omen King / Rot Goddess / Blood Lord / Lichdragon / Fire Giant / Dragonlord / Black Blade / Hoarah Loux + Elden Remembrance. The catalog only encodes Great Runes, not Remembrances.
- **Achievements (39):** full Steam-style achievement list, including some that are not bosses (God-Slaying Armament, Legendary Armament/Ashen Remains/Sorceries/Talismans, Roundtable Hold, Erdtree Aflame).
- **Spirit Ashes (64), Crystal Tears (32), Bell Bearings (53), Cookbooks (59), Talismans (115), Weapons (257), etc.** — full item catalogs far beyond the 24 authored item facts.

---

## 3. In `catalog.ts`, absent from the tracker (tracker is base-game only)

The tracker is **base game + pre-DLC**. It contains **zero** Shadow of the Erdtree or Tarnished Pack content:

- **7 SotE bosses** in the catalog have no tracker row: `boss:divine-beast`, `boss:rennala-sote` (Rellana), `boss:messmer`, `boss:midra`, `boss:bayle`, `boss:consort`.
- **`boss:leontiel`** (Tarnished Pack) has no tracker row.
- **`boss:radagon`** ("Radagon of the Golden Order / Elden Beast") has no row in the `Bosses` tab at all — the tracker appears to omit the final boss (only `Elden Lord` appears as an achievement). This is a real tracker gap, not a naming issue.
- **All 23 graces:** the tracker has **no graces/warp tab** (the `Map` tab is a chart). Grace coverage cannot be diffed from this sheet.
- **All 8 quests / 10 regions:** the tracker has no quest-graph or region-mastery tab; its closest proxies are the `Questlines` column on the `Bosses` tab and the `Achievements` tab.
- **Tarnished Pack items** (`idus-sword`, `hefty-scimitar`, `leontiel-greatsword`, `golden-order-flail`, `reverse-bladed`) and **SotE items** (`shadow-realm-blessing`/Scadutree Fragment, `revered-ash`) have no tracker rows.

---

## 4. Naming / region inconsistencies (candidates to reconcile — tracker is not authoritative)

### 4a. Naming

| Catalog fact | Tracker name | Issue |
|---|---|---|
| `boss:margit` — "Margit, the Fell Omen" | **"Margitt, the Fell Omen"** | Tracker **typo** (double `t`). The tracker's own `Achievements` tab spells it correctly. Catalog is right; a future normalizer should tolerate the typo. |
| `boss:godfrey` alias `hoarah loux` | **"Hourah Loux, Warrior"** | Tracker spelling `Hourah`; catalog `Hoarah`. Add the tracker spelling as an alias if linking. |
| `boss:maliketh` alias `gurranq` | **"Beast Clergyman"** | Same fight's phase-1 name; catalog has no `beast clergyman` alias. |
| `boss:godfrey` vs `boss:godfrey-golden` | "Godfrey, First Elden Lord" (Ashen) **and** "Godfrey, First Elden Lord (Golden Shade)" (Royal Capital) | Catalog splits golden shade from Hoarah Loux; tracker also splits (plus a separate "Hourah Loux, Warrior" row). Consistent enough, but both use the bare name "Godfrey, First Elden Lord" for the Ashen fight. |
| `item:dusk-medallion` — "Dectus Medallion" | "Dectus Medallion (Left)" / "(Right)" | Tracker splits halves; catalog uses one fact. Granularity difference, not a gap. |
| `item:haligtree-secret-medallion` | "Haligtree Secret Medallion (Left)" / "(Right)" | Same half-split granularity difference. |
| `item:sewing-needle` — "Gold Sewing Needle" | both "Sewing Needle" and "Gold Sewing Needle" | Tracker distinguishes the two needles; catalog collapses them. |

### 4b. Region vocabulary

Catalog uses **granular sub-regions** (Stormveil, Raya Lucaria, Elphael, Mohgwyn, Ashen Capital, Leyndell, Farum Azula); the tracker uses **macro-regions** (Limgrave, Liurnia of the Lakes, Consecrated Snowfield, Siofra River, Leyndell Royal Capital / Capital of Ash, Crumbling Farum Azula). Matched pairs with differing region strings:

| Catalog fact | Catalog region | Tracker region |
|---|---|---|
| `boss:godrick` | Stormveil | Limgrave |
| `boss:red-wolf` | Raya Lucaria | Liurnia of the Lakes |
| `boss:rennala` | Raya Lucaria | Liurnia of the Lakes |
| `boss:malenia` | Elphael | Consecrated Snowfield |
| `boss:mohg` | Mohgwyn | Siofra River |
| `boss:gideon` | Ashen Capital | Leyndell, Capital of Ash |
| `boss:godfrey` | Ashen Capital | Leyndell, Capital of Ash |
| `boss:godfrey-golden` | Leyndell | Leyndell, Royal Capital |
| `boss:fire-giant` | Mountaintops | Mountaintops of the Giants |
| `boss:godskin-duo` / `boss:maliketh` | Farum Azula | Crumbling Farum Azula |
| `boss:astel` | Lake of Rot | Lake of Rot *(match)* |

Neither vocabulary is wrong; the catalog's granularity is useful for the atlas, the tracker's for a macro checklist. If the two are ever linked, a region-alias table (sub-region → parent region) is the right fix.

---

## 5. Caveats and triage guidance

- The tracker is **base-game only** and was last meaningfully extended before SotE; it is a completion checklist, not a fact graph. Its `Field Boss` rows repeat the same name across regions and many are not worth encoding as facts with implications.
- The tracker's `Reward` column duplicates item names (e.g. Great Runes, Remembrances) that its own `Remembrances`/`Keys` tabs also list — count each item once when triaging.
- The `Bosses` tab contains a typo (`Margitt`) and a phase-name variant (`Hourah Loux`) — do **not** treat the tracker as the naming authority.
- Highest-value, lowest-ambiguity additions are the **5 Legend-tier bosses** (§2a) and the **quest-item keys** (§2e); the 134 field-boss rows are a separate, much larger checklist decision.
- Grace and quest coverage **cannot** be diffed from this sheet — those catalog kinds need a different source.

Raw machine-readable diff: `artifacts/all-knowing/.scratch/diff.json`; downloaded tabs: `artifacts/all-knowing/.scratch/tab_*.csv`.
