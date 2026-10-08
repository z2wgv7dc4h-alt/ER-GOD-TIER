# Task 182 — Fill kind gaps from data on disk (180 Batch B) — report

Continues the interrupted run. `src/lib/entityIndexBuild.ts`, the generated
`public/sourced/entity-index.json` and a new test file changed; `.env` / `.env.local`
were never opened. The brief's `.scratch/er-mcp.db` was already present in this worktree
(49.2 MB), so no copy from the main checkout was needed.

Inputs: `docs/tasks/180-report.md` §3/§5 items 4–6, `public/sourced/entity-index.json`
(before = committed snapshot), `public/sourced/open/msb-enemies.json` (31,388 rows, all
with `x`/`z`), `public/sourced/npc-placements.json` (1,331 rows, 1,330 with `px`/`py`),
`src/data/image-index.json` (2,150 cached names), `public/sourced/open/boss-images.json`
(46), `.scratch/er-mcp.db` (`bosses` 165 rows, 130 non-null, 120 numeric).

---

## 1. Pictures — kind-correct plane, never a wrong one

`imageFor` (name → any cached picture) is replaced, for the covered kinds, by
`imageForKind(name, kind)` which only accepts the sub-dirs a kind may use:

| kind | allowed `images/<dir>` |
|---|---|
| boss | `bosses`, `creatures`, `npcs` |
| enemy | `creatures`, `bosses`, `npcs` |
| npc | `npcs`, `creatures`, `bosses`, `spirits` |
| region | `locations` |

`fillBossImages` now also **replaces** the generic `/sourced/pack-icons/…` glyph (not
just fills a missing image), trying `boss-images.json` first; `fillRegionImages`
(§1) fills region pages from `images/locations` only.

Coverage (committed → after, `pack-icons` = generic glyph placeholder):

| kind | n | real picture | placeholder | wrong-dir pictures |
|---|---:|---:|---:|---:|
| boss | 281 | 68 → **215** | 208 → **64** | 0 |
| enemy | 613 | 173 → **166** | 0 | **7 → 0** |
| npc | 188 | 61 → **61** | 0 | 0 |
| region | 295 | 0 → **104** | 0 | 0 |

Examples added (boss, placeholder → real):
`boss:adula` Glintstone Dragon Adula, `boss:agheel` Flying Dragon Agheel,
`boss:ancestor-spirit`, `boss:ancient-hero-zamor` and its 3 encounters,
`boss:bell-bearing-hunter` and its 2 encounters → `images/bosses/*.webp`.
Region: `region:academy-gate-town`, `region:ainsel-river-well`,
`region:bestial-sanctum`, `region:bridge-of-sacrifice` … → `images/locations/*.webp`.

Examples of the **wrong pictures removed** from enemies (7): the five scarabs
`Ash-of-War Scarab`, `Cerulean Tear Scarab`, `Crimson Tear Scarab`, `Glintstone Scarab`,
`Incantation Scarab` had an `images/armors` icon; `Cathedral of Dragon Communion` and
`Church of Dragon Communion` had an `images/locations` photo. After the change the
enemy plane yields no object/place picture (remaining enemy art is `creatures`/`bosses`/
`npcs` — e.g. `Black Knife Assassin (Ordina)`, `Ancient Dragon-Man (Invader)` legitimately
share the boss portrait).

Enemy real-picture count drops 173 → 166 because 7 wrong ones go and none of the added
files is new: the base-name keys already produced the correct creature art. NPC is
unchanged at 61 — every existing npc picture was already in a creature/npc/spirit plane
(no object icons), so re-picking only removes nothing.

## 2. Enemy coordinates — one pin per spawn map

Every `msb-enemies.json` row carries `x`/`z` in its map's local frame. A per-map affine
(local `x`,`z` → 10496px mosaic) is learned from a projected NPC placement
(`npc-placements.json` `px`/`py`); overworld/Shadow maps without an anchor fall back to
the tile formula already used for graces. Each NpcParam id gets the centroid of its
**busiest spawn map** as `record.map` (with `world`).

Coverage: **enemy `map` 0 → 508 / 613 (82.9%)**. Missing are the 105 ids with no MSB
placement or no projectable map (unplaced / cut content). All pins are inside the mosaic.

Calibration check: `enemy:demi-human` → `{x:38.4, y:72.12, m60_43_35_00, overworld}`
(Limgrave); the interior-map projection matches the committed boss pins — enemy
`Red Wolf of Radagon Sword (Archives)` → `{x:18.65, y:47.83, m14_00_00_00}`, boss
`Red Wolf of Radagon` pin `{x:18.67, y:47.83}` (Δ0.02).

## 3. Boss runes — from the wiki db where missing

`fillBossRunes` reads `.scratch/er-mcp.db` (`data/raw/er-mcp.db` fallback) read-only,
keeps only real numeric totals (`/^[\d][\d,\s]*$/`, rejecting the `Runes` header and
free-text like `"110,000-130,000"`), keys them by name/possessive/base and fills any
boss the roster left without `stats.Runes`, tagging the source `er-mcp.db/bosses`.

Coverage: **226 → 238 / 281 (+12)**; the build logged **21** db fills (the extra 9 were
on name-collision records later folded by the encounter/dedupe passes). New examples:
`Godskin Noble 50,000`, `Black Blade Kindred 88,000`, `Magma Wyrm Makar 24,000`,
`Erdtree Avatar 3,600`, `Tibia Mariner 2,400`, `Misbegotten Warrior 9,400`,
`Golden Hippopotamus 200,000`, `Ancient Hero of Zamor 5,400`.

---

## Final checks

- `npm run index:entities` — 5,595 records / 4,288 KiB; `boss images filled: 153`,
  `region images filled: 104`, `boss runes filled from db: 21`.
- `npx tsc -b` — clean.
- `npx vitest run src/lib/task182Gaps.test.ts` — 10 passed.
- `npx vitest run` (whole suite) — **218 files, 1,556 passed, 11 skipped** (the 11 are
  the pre-existing db/OCR-optional skips).
- `npm run lint` / `build` / `test:bundle` / `audit:pages` / `audit:links` were **not**
  run: the brief does not ask for the full gate, and AGENTS.md says to run them only if
  it does. The full vitest suite was run because the committed generated index is read by
  many tests and a regeneration can regress them.

## Tests added

`src/lib/task182Gaps.test.ts` (10 cases), reading the committed index like the other
quality guards:
- §1: no boss/enemy/npc carries an object or place picture; regions only carry
  `images/locations`; ≥200 bosses have real art and ≤70 keep the glyph; ≥100 regions
  have location art.
- §2: ≥450 enemies are pinned; every pin is inside 0–100; `enemy:demi-human` falls in the
  Limgrave box with `world: overworld`.
- §3: ≥235 bosses carry runes; the db-sourced records are tagged and non-empty; and
  (skipped when the local db is absent) every name-matched numeric db row has a rune.

## ASSUMPTIONS

- The brief lists the picture planes per kind; I treated `creatures`/`bosses`/`npcs` as
  interchangeable for creature-like records (a boss-class enemy may use boss art, an
  NPC/invader may use creature/boss art) but excluded **object** dirs
  (`items`,`weapons`,`sorceries`,`incantations`,`armors`,`shields`,`talismans`,`ammos`,
  `ashes`,`classes`) and `locations` from every creature kind, and required regions to use
  `locations` only. This is what "never a wrong picture" is enforced against.
- `spirits` is allowed for `npc` (one record, `Latenna the Albinauric`, is the spirit-ash
  portrait of the same character); it is not allowed for enemy/boss.
- Enemy pins are the centroid of the id's **busiest spawn map**, not a multi-point trail;
  the brief asks for "map pins per spawn" and the index `map` field is a single point.
- The pin projection reuses `npc-placements.json`'s precomputed `px/py` as the per-map
  affine and the existing grace/region tile constants as the overworld fallback.
- Boss runes are accepted only as a leading number with digits/commas/spaces; the db's
  ranges and parentheticals (`"110,000-130,000"`, `"48,000 (trio)"`) and the `Runes`
  header are rejected rather than guessed. This fills 21 of the ~55 missing rather than
  the report's round "28".
- An unrelated `AGENTS.md` edit (the background-process rule) was already in the working
  tree; it is not mine and was left unstaged/uncommitted.

## Not done

- No `er-mcp.db` copy was needed (the worktree already had `.scratch/er-mcp.db`).
- Enemy/region strategy and "phases" are untouched (no on-disk source; not in this brief).
- The remaining 64 boss glyphs are DLC/late bosses absent from `boss-images.json` and
  `images/bosses`; no on-disk picture exists to fill them.
- `npm run lint` / `build` / `test:bundle` / `audit:*` were not run (see above).

## Brief checklist

- [x] 1. Pictures: boss/enemy/npc/region records now resolve only to their kind's cached planes (`boss-images.json`, `images/bosses`, `images/creatures`, `images/npcs`, `images/locations`); the 7 wrong object/place pictures on enemies were removed and 147 boss + 104 region real pictures were added — test in `task182Gaps.test.ts` §1
- [x] 2. Enemy coords: 0 → 508/613 enemies pinned as the centroid of the busiest `msb-enemies.json` spawn map, projected through the `npc-placements.json` affine (interior maps verified against committed boss pins) — test §2
- [x] 3. Boss runes: `.scratch/er-mcp.db` `bosses.runes` fills missing numeric totals (226 → 238; 21 fills logged, source-tagged `er-mcp.db/bosses`) — test §3
- [x] Coverage reported before/after per kind (tables above) and a test added for each item

ALL ITEMS DONE
