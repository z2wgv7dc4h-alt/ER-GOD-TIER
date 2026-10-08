# Task 173 — Remaining link-graph gaps (audit 171, Batch C) — REPORT

Branch `task-173`. Items 9–12 of `docs/tasks/171-report.md` §FIX LIST Batch C, plus guards.
A previous run had done most of items 9–12 but stalled before the guards, gates and this report;
its working-tree changes were reviewed, completed, regenerated and committed here.

Files owned and touched: `src/lib/entityGraph.ts`, `src/knowledge/catalog.ts`,
`scripts/build-boss-roster.mjs`, `src/data/bosses.json`, `src/knowledge/dropNames.ts` (new),
`src/data/drop-aliases.json` (new), `src/lib/linkIntegrity.test.ts`, `src/lib/infer.test.ts`.
`src/lib/entityIndexBuild.ts` (task 172), `src/Help.tsx` (174) and photo code (175) were **not** touched.

## What changed (before → after, with examples)

| Check (171 audit baseline → now) | before | after |
|---|---:|---:|
| orphans (no inbound edge) | 337 | **326** |
| content records with no edges | 322 | **310** |
| regions with no `contains` edge | 188 / 298 | **143 / 296** |
| boss/enemy drop names resolving to no item | 47 | **0** |
| roster vs index drop disagreements | 67 | **43** |
| `implies` targets with no catalog row | 8 | **0** |
| non-merchant `merchant:` records | 27 | **0** |

### Item 9 — orphans / `contains` edges (`src/lib/entityGraph.ts`)
Only edges the data asserts were added; nothing was invented to remove an orphan.

- A record's `region` now resolves through the authored catalog map (`regionFactFor`,
  `catalog.ts:523`) when the text is not itself a region entity. This is a big class: **268**
  boss/enemy records carry a region label like `"Stormveil Castle"`, `"Moonlight Altar"`,
  `"Greyoll's Dragonbarrow"`, `"Enir-Ilim"`. Example: `boss:godrick` now gets
  `foundIn → region:limgrave` (and the reverse `region:limgrave contains boss:godrick`);
  `boss:adula--moonlight-altar` → `region:liurnia`.
- A region-only name index was added so a same-named grace/dungeon cannot shadow the region it
  sits in (`grace:abyssal` vs `region:abyssal-woods`).
- A record whose `location` prose names both a site and its region now wires the region too.
- A merged enemy's per-NpcParam `variants` each contribute their real region/location.

**Still orphaned (326) and why — no honest edge exists on disk:**
- `item` 161: cut/unused content (24, never obtainable), craftable-only (39, no place), no location
  recorded (22), acquisition prose that names no place (21, Batch B item 7's field-hygiene job),
  tutorial "About …" cards (6), other (49).
- `armor` 59 (cut 16 / no-location 18 / prose-location 10 / other 15), `weapon` 23 (cut 14),
  `ash` 14, `npc` 14, `quest` 14, `region` 13, `talisman` 8, `boss` 15, `enemy` 3, `shield` 1,
  `mechanic` 1 — the same reasons: cut content or a source-field that is prose, a bare type word
  or empty. Adding a link for these would mean inventing a place, which the brief forbids.
- 143/296 regions have no `contains` edge because no surviving record's region/location asserts
  them (they are unmarked landmarks/subregions only the wiki lists). Their own `location` is often
  a bare type word ("Church", "Rise", "Shack"), which is Batch B item 6's job, not this task's.

### Item 10 — one loot list (`dropNames.ts`, `drop-aliases.json`, `build-boss-roster.mjs`)
The graph and the roster now normalise through the same module/table:
- `src/knowledge/dropNames.ts` — `normaliseDropName` / `normaliseDrops`: strips wiki markup and
  counts, splits comma-joined cells, maps wiki shorthand and drops strings that name no single item.
- `src/data/drop-aliases.json` — the shared table: `"tail" → "Aspects of the Crucible: Tail"`,
  spirit-ash spellings, `"elden remembrance"`, etc.; `dropped` holds generic plurals/armour sets/
  wiki headers (`"somber smithing stones"`, `"night's cavalry set"`).
- `scripts/build-boss-roster.mjs` mirrors the same table and rules and splits comma cells.
- Result: **47 → 0** boss/enemy drop names that resolve to no item (examples fixed: "Tail",
  "Night's Cavalry Set", "Somber Smithing Stones", "Death' Poker", "Sacrifical Axe",
  "Lord of Blood's Favor (Soaked)", "Ash of War: Ghostflame Call").
- Roster/index drop disagreements fell **67 → 43**. The remainder are **not** normalisation misses:
  - ~12 are the index's own `cleanDropText` (`entityIndexBuild.ts:580`) stripping `"Ash of War: "`
    so it stores `"Shared Order"` (the skill page) while the roster stores the real gem item
    `"Ash of War: Shared Order"`. Both resolve to a real item; they are different pages.
  - the rest are source-coverage differences: the index merges Fextralife/FanAPI/wiki/roster
    (so it carries drops a single-source encounter rota does not, e.g.
    `boss:putrid-avatar--caelid`), and a few roster drops land on an id the index files elsewhere.

### Item 11 — Haligtree cycle (`catalog.ts`, retained in `inferChains.ts`)
- The catalog row `region:haligtree` no longer `implies` the medallion (`catalog.ts:42`), which
  broke the cycle `region:haligtree ⇄ item:haligtree-secret-medallion`.
- The one-way inference is kept: `item:haligtree-secret-medallion → region:haligtree`
  (`inferChains.ts:204`). `closeWorld(['region:haligtree'])` no longer yields the medallion;
  `closeWorld(['item:haligtree-secret-medallion'])` still yields the region.

### Item 12 — non-merchant `merchant:` records (`entityGraph.ts`, `catalog.ts`)
- The 27 bogus vendor cards are folded onto the entity that really owns the name, keeping the old
  id as an alias: `merchant:sorcery → mechanic:sorcery`,
  `merchant:incantation → mechanic:incantation`,
  `merchant:dragon-communion → region:cathedral-of-dragon-communion`,
  `merchant:remembrance-of-the-grafted → item:remembrance-grafted`, and the other 22
  "Remembrance of …"/"Elden Remembrance" rows → their item. No `soldBy` edge is emitted to a folded
  id; no merchant page shows a Remembrance/spell-class/altar. `merchant:alteration` and
  `merchant:reversion` are left as merchants (they are the Roundtable alter/revert stock, which the
  171 audit did not count among the 27).
- The 8 `implies` targets with no catalog row are closed: 5 quest rows added
  (`quest:varre:cloth`, `quest:yura:nagakiba`, `quest:gowry:concluded`, `quest:goldmask:regression`,
  `quest:thops:barrier`), 2 river regions (`region:siofra-river`, `region:ainsel-river`) and the
  removed haligtree edge.

## Final check results (run once at the end)

- `npm run index:entities` — ok, 5594 records.
- `npx vitest run` — **216 files, 1527 passed, 11 skipped, 0 failed.**
- `npm run lint` — exit 0 (warnings only).
- `npm run build` — ok.
- `npm run test:bundle` — 7 passed.
- `npm run audit:pages` — `docs/PAGE-AUDIT.md`: 5598 entities, **0 flagged**.
- `npm run audit:links` — `docs/LINKS-AUDIT.md`: dead data 0, dead renderer 0, guard violations 0.
- Extra guards added to `src/lib/linkIntegrity.test.ts` (Task 173 describe) pin §9 (region edges),
  §10 (every index+roster drop resolves; generic names discarded), §11 (cycle gone, medallion still
  infers) and §12 (folded vendors resolve). `src/lib/infer.test.ts` pins the §11 inference change.

## ASSUMPTIONS

- The 171 "27 non-merchant `merchant:` records" = the 23 `Remembrance of …` rows + `Elden
  Remembrance` + `Sorcery` + `Incantation` + `Dragon Communion` (27). `Enia - …` rows are real Enia
  exchange shops and `Alteration`/`Reversion` are the Roundtable stock rows, so all three were left
  as merchants.
- `scripts/build-boss-roster.mjs` was re-run so the committed `src/data/bosses.json` matches its
  generator. This also restores the real game spelling `"Ash of War: …"` in the roster, which is why
  the pre-existing `bossEncounters.test.ts` expectation passes unchanged.
- Regenerating the roster surfaced `boss:lionel-the-lionhearted` (a Fia's Champions cooperator the
  wiki gives its own boss page, with no image in any source on disk). `src/lib/icons.test.ts`
  already supports a curated, self-checking exception list, so the boss was added to
  `BOSS_EXCEPTIONS`; no other kind/list was loosened.
- Remaining orphan/`contains`/roster-index numbers above are the honest residue of data the repo
  does not have (cut content, prose-only fields, source-coverage gaps) plus the out-of-scope
  `entityIndexBuild.ts` drop cleaning; no edge was added to move a number.
- `.scratch/173/` (measure/pins harness) is scratch and not committed; the throwaway
  `vitest.measure.config.ts` created by the previous run was removed from the tree.

## Not done, and why

- Exact roster↔index drop-set equality was not reached: the index's own `cleanDropText`
  (`src/lib/entityIndexBuild.ts:580`) strips `"Ash of War: "` and is task 172's file, which this
  brief forbids touching. The shared loot list now governs both sides; the residual differences are
  that generator's output plus genuine source-coverage gaps.
- The 326 orphans / 143 `contains` gaps that remain are recorded above; closing them would require
  inventing place/region data (forbidden) or Batch B's field-hygiene work.

## Checklist

- [x] 1. Items 9–12 as written; for item 9 only true data edges added, remaining orphans reported with reasons (above).
- [x] 2. Item 10: one loot list — shared `dropNames.ts` + `drop-aliases.json`; drop strings normalise to real item ids (47 → 0 unresolved); roster and index use the same normaliser (disagreements 67 → 43, cause reported).
- [x] 3. Item 11: Haligtree cycle removed (catalog implies dropped) without losing the medallion → region inference (directional chain kept; infer.test pinned).
- [x] 4. Item 12: the 27 non-merchant `merchant:` records reclassified to their real kind with old-id aliases; 8 dangling `implies` targets closed.
- [x] 5. `src/lib/linkIntegrity.test.ts` extended to pin each fix; gates run once at the end; before/after reported.

ALL ITEMS DONE
