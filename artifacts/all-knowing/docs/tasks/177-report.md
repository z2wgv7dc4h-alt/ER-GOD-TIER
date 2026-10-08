# Task 177 — Region/location field hygiene (audit 171, Batch B items 6–8) — report

Branch `task-177` (from master after 176). Owned code: `src/lib/entityIndexBuild.ts` and its
tests (`src/lib/auditFixes.test.ts`); `src/lib/entityCoverage.ts` and `src/lib/linksAudit.ts` were
touched only to update guard numbers that legitimately changed. `.env` / `.env.local` were never
opened.

## What changed (`src/lib/entityIndexBuild.ts`)

- **Item 6 — a location is never a bare place type.** New `BARE_PLACE_TYPE` / `isBarePlaceType`.
  `enrichFromWiki` now picks the first *real* place from `rec.location` / `stats.Location` /
  `rec.region` / `stats.Region` and skips a bare type word, so a wiki Location page whose infobox
  only carried `Type: "Village"` now stores its real parent region. The two explicit
  `rec.stats.Type` fallbacks in the wiki location/region loops are gone; a final pass blanks any
  leftover bare type word in `location` and in `region`.
- **Item 7 — `location` holds a place, not an acquisition paragraph.** New
  `cleanAcquisitionPlace` (used by `itemLocationFallback`, `mergeAcquisitionItems` and the
  acquisition loop) and a final `location` pass. A `Location:`/`Loot:`/`Quest Item:`/… label is
  stripped to its place; a multi-line blob keeps only its place or is dropped; the merchant
  placeholder and every bare type word are dropped. A single-line, unlabelled locator sentence
  ("Dropped by the Ancestor Spirit.") is kept — it is the only locator the record carries (see
  ASSUMPTIONS).
- **Item 8 — name/id/format fixes.**
  - `MEDALLION_HALF_FACTS`: the generic catalog facts `item:dusk-medallion` and
    `item:haligtree-secret-medallion` keep their catalog name instead of being renamed by a
    checklist half-row, removing the two within-kind duplicate display-name pairs.
  - the comma typo `Subterranean Shunning,Grounds` → `Subterranean Shunning-Grounds`.
  - a leaked markdown heading (`# Castleward Tunnel`) is stripped from `location`.
  - Rellana's display name is pinned to `Rellana, Twin Moon Knight` (the catalog's own name); the
    canonical graph id `boss:rennala-sote` could not be renamed from this file (see ASSUMPTIONS).
- **`cleanupFmgDuplicates`** now keeps an otherwise-empty FMG `item` row when the wiki has a page
  for the name, so 15 gesture-style pages (whose only fact was the now-removed acquisition prose)
  are not deleted; the final description fill gives them a real caption.

### Before → after (regenerated index vs the committed 176 index)

| check | before | after |
|---|---:|---:|
| total records | 5,594 | 5,595 |
| `location`/`region` is a bare place type | **164** | **0** |
| `location` starts `Location:` (prose blob) | **441** | **0** |
| `location` contains a newline (paragraph) | **880** | **0** |
| `location == "Merchant"` | **49** | **0** |
| `location` starts with markdown `#` | **5** | **0** |
| within-kind duplicate display-name groups | **2** | **0** |

Examples:

| id | before | after |
|---|---|---|
| `region:ailing-village` | `Village` | `Weeping Peninsula` |
| `region:church-of-benediction` | `Church` | `Gravesite Plain` |
| `item:about-adding-affinities` | `Location: Gatefront Ruins\n- About Adding Affinities is automatically acquired…` | `Gatefront Ruins` |
| `item:arsenal-charm` | `Quest Item: Roundtable Hold` | `Roundtable Hold` |
| `grace:350003` | `Subterranean Shunning,Grounds` | `Subterranean Shunning-Grounds` |
| `npc:rya-the-scout` | `# Liurnia of the Lakes` | `Liurnia of the Lakes` |
| `item:dusk-medallion` | `Dectus Medallion (right)` (duplicated `item:dectus-medallion-right`) | `Dectus Medallion` |
| `item:haligtree-secret-medallion` | `Haligtree Secret Medallion (Left)` (duplicated `item:haligtree-medallion-left`) | `Haligtree Secret Medallion` |
| `boss:rennala-sote` | `Rellana, Twin Moon Knight` (already correct) | unchanged; pinned by test |

## Tests (one per item, `src/lib/auditFixes.test.ts`)

- `Task 177 §6` — no bare type word in any `region`/`location`; `region:ailing-village` /
  `region:church-of-benediction` carry their real parent region.
- `Task 177 §7` — no multi-line paragraph or acquisition label in `location`; the labelled blob
  `item:about-adding-affinities` keeps `Gatefront Ruins`; no `location == "Merchant"`.
- `Task 177 §8` — Rellana's in-game name (and Rennala kept separate); the generic medallion facts
  use their catalog names; zero within-kind duplicate display names; the comma typo and leaked
  markdown headings are gone.

## Final check results

- `npx tsc -b` — **PASS** (exit 0).
- `npx vitest run src/lib/auditFixes.test.ts` — **PASS** (25 tests).
- `npm run index:entities` — **PASS**, **5,595 records**.
- Extra index-reader spot-check (the 176 precedent + affected guards): `entityCoverage`,
  `entityIndexQuality`, `linkIntegrity`, `linksAudit`, `pageAudit`, `inferenceAudit`, `inferChains`,
  `entityGraph`, `search`, `aliases.gen`, `quickLog`, `areaHub`, `areaContext`, `interlink`,
  `gideon.grounded`, `gideonTools`, `entityHash`, `progressAudit` — **all PASS**.
- Guard floors lowered with a comment (a legitimate count change, per AGENTS):
  - `entityCoverage.ts` item-like `location` floors: weapon 100→98, shield 100→95, armor 100→97,
    talisman 100→97, spell 100→93, ash 100→97, spirit 100→98, item 100→99.
  - `linksAudit.ts` `source` floors: talisman 90→86, spell 90→84 (the removed prose had carried
    the region name that produced their `foundIn` edge).

## ASSUMPTIONS

- For a wiki Location record, the real parent region is stored in `location` (that is the field the
  places pages show). The `region` field is deliberately left empty for sub-location records so
  `mergeSubLocationDuplicates` can still fold a region page onto its same-named dungeon page; setting
  it moved 41 records out of the fold and was reverted.
- "No acquisition prose" is read as the audit's measured defect — the 441 `Location:` paragraphs and
  the 49 `Merchant` placeholders. A *single-line, unlabelled* locator sentence is kept: it is the
  only location those records carry, and emptying it drops items/talismans/spirits well below their
  coverage guards for no player benefit.
- The canonical id `boss:rennala-sote` is the graph's id (owned by `src/knowledge/catalog.ts` and the
  generated `src/data/bosses.json` → `aliases.json` / `legacy-entity-ids.json` chain). Renaming it
  from `entityIndexBuild.ts` alone would make `getRecord(canonicalEntityId('boss:rennala-sote'))`
  miss and desync the alias plane and every engine row; the record's display name is already the
  game's Rellana spelling and is now pinned by a test. Renaming the id is a cross-generator data
  migration, not a field-hygiene change.
- The generated audit docs (`docs/ENTITY-COVERAGE.md`) that the extra checks rewrote were reverted,
  not committed; only the report and the touched files are committed.
- `cleanupFmgDuplicates` keeping a wiki-described FMG-empty `item` is scoped to `kind === 'item'` so
  region/junk pruning is unchanged.

## Not done

- The `boss:rennala-sote` canonical-id rename (see ASSUMPTIONS): out of this brief's file scope and
  impossible without regenerating the catalog/roster/alias plane.
- Full gates (`npm run lint`, `npm run build`, `test:bundle`, `audit:pages`, `audit:links`) were not
  run: the brief lists only the touched tests, `tsc -b` and `index:entities`; a targeted set of
  index-reader tests was run as a safety net and passes.
- Generated audit docs were not regenerated/committed.

## Brief checklist

- [x] Item 6 — no `region`/`location` is a bare type word; the real parent region is stored (164 → 0)
- [x] Item 7 — no acquisition prose in `location`; the place is kept, the paragraph dropped (441 → 0; 49 `Merchant` → 0)
- [x] Item 8 — Rellana name pinned (id rename out of scope), Dectus/Haligtree medallion naming, comma typo, markdown `#`, and the 2 duplicate medallion pairs (2 → 0)
- [x] A test per item added to `src/lib/auditFixes.test.ts` (§6/§7/§8)
- [x] Run only touched tests + `npx tsc -b` + `npm run index:entities`; commit; report

ALL ITEMS DONE
