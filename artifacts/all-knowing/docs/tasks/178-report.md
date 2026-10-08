# Task 178 — Offline Gideon regression (84.4% → 79.3%) — report

Branch `task-178` (from master after the 172–177 batch). Only the offline Gideon
answering path changed (`src/lib/gideon.ts`, `src/lib/gideonGrounded.ts`,
`src/lib/gideonWiki.ts`). No data was re-added to the entity index, no
`questions.json` change, and `.env` / `.env.local` were never opened.

## 1. Which questions regressed (Task 168 merge → master)

A per-question dump was produced at the Task 168 merge commit (`d70d129`, in a
throwaway git worktree, 432/512) and at master (406/512) using the same scoring
as `scripts/gideon-eval.mjs`. **26 runs regressed = 13 unique questions × 2
characters; 0 improved.** Every regressed question is listed below with the old
(wrong) vs new behaviour.

| q | intent | question | was (Task 168) | after the cleanup |
| --- | --- | --- | --- | --- |
| Q34 | item-location | where is About Adding Affinities | `…item · Location: Gatefront Ruins - About Adding Affinities is automatically acquired upon obtaining the Whetstone Knife…` | `…item · Gatefront Ruins. Gatefront Ruins` (lost **Whetstone Knife**) |
| Q35 | item-location | location of About Adding Skills | same acquisition sentence | `…item · Gatefront Ruins` (lost **Whetstone Knife**) |
| Q53 | how-to-get | Rune Arc how to get more co-op opportunities? | `Rune Arc — item · Rune Arcs can be earned… Host of Fingers dies…` | `Rune Arc — item · Earthbore Cave and the Beside the Rampart Gaol` (lost **Host of Fingers**) |
| Q55 | how-to-get | how can i get About Adding Affinities | acquisition sentence | `…item · Gatefront Ruins` (lost **Whetstone Knife**) |
| Q56 | how-to-get | where do i get About Adding Skills | acquisition sentence | `…item · Gatefront Ruins` (lost **Whetstone Knife**) |
| Q61 | navigation | HELP, how do I get the upper-upper side of Siofra River? | `Siofra River — region · Underground area beneath Mistwood and Caelid` | `Siofra River — region · Siofra River. Limgrave` (lost **Mistwood, Caelid**) |
| Q87 | drops | what does Glintstone Dragon Adula drop | `…drops: Adula's Moonblade, 3x Dragon Heart, No Runes, Dragon Heart…` | `…drops: Adula's Moonblade, Dragon Heart.` (lost **3x Dragon Heart**) |
| Q90 | drops | what does Flying Dragon Agheel drop | `…drops: Dragon Heart, Unlocks Agheel's Flame.` | `…drops: Dragon Heart, Agheel's Flame.` (lost **Unlocks Agheel's Flame**) |
| Q94 | drops | what do i get from Ancient Hero of Zamor (Giant-Conquering Hero's Grave) | `…drops: Zamor Curved Sword, Zamor Set.` | `…drops: Zamor Curved Sword.` (lost **Zamor Set**) |
| Q98 | level | recommended level for Abandoned Cave | `Abandoned Cave: no level band on file, but that is the area you named.` (id `region:abandoned-cave`) | `No level band on file for this spot. Still open here: …` (no entity) |
| Q102 | level | what level should i be for Academy Crystal Cave | `Academy Crystal Cave: no level band…` (id `region:academy-crystal-cave`) | generic open-items text (no entity) |
| Q178 | compare | Bolt of Granax VS Dragon CragBlade? | wiki excerpt, matched `item:ash-of-war-cragblade` via the record name **Cragblade** | same wiki excerpt, no match (record renamed **Ash of War: Cragblade**) |
| Q186 | lore | Was it ever explained why this guy in Midra's Manse is so fat?… | `Midra's Manse — Abyssal Woods. Midra's Manse is a legacy dungeon…` | same-but-new description, but expected id `region:midra-s-manse` no longer resolved |

## 2. Causes and fixes

Four causes, all fixed on Gideon's side by reading the field/source the cleaned
data now keeps the fact in (never by restoring the removed prose to the index):

1. **Acquisition prose was stripped from `location`** (Task 177 §7). Answers for
   `location` / `how-to-get` / default now append the item's paragraph from the
   acquisition dump (`public/sourced/open/acquisition.json`), and the record's
   own `description`. Fixes Q34/35/53/55/56.
2. **A region page's parent description was replaced by its bare parent** (Task
   177 §6). A `region` answer now appends the wiki-db region location
   (`open/wiki-db/region.json`). Fixes Q61.
3. **The cleaned drop list dropped raw quantities / set names.** The `drops`
   facet now merges the record drops with the raw checklist drops
   (`checklists/bosses.json`), the per-encounter drops
   (`open/wiki-db/boss-encounters.json`) and the boss's own `strategy` /
   `sections` text. Fixes Q87/90/94.
4. **Entity ids/names renamed or merged.** (a) `region:X` was folded onto
   `dungeon:X`; the level facet now accepts `region`/`dungeon`/`grace`, and every
   grounded answer links the legacy engine ids that share the record's id tail
   (so `region:midra-s-manse`, `region:abandoned-cave` still resolve). Fixes
   Q98/102/186. (b) `Cragblade` became `Ash of War: Cragblade`; the resolver now
   also accepts the bare skill name after `Ash of War:`, and the wiki fallback
   links every subject the question named. Fixes Q178 (and, as a side effect of
   linking the named subjects, Q145/Q165/Q200).

All new source loads happen only on the no-key path, are cached, and the heavy
wiki-prose dump is fetched only for questions that can need it.

## 3. Before / after

| metric | Task 168 | master (before) | after |
| --- | ---: | ---: | ---: |
| answerable — correct | 432/512 (84.4%) | 406/512 (79.3%) | **438/512 (85.5%)** |
| answerable — partial | 30 | 48 | 34 |
| answerable — wrong | 40 | 48 | 34 |
| answerable — no answer | 10 | 10 | 6 |
| unanswerable — honest | 88/88 | 88/88 | 88/88 |
| unanswerable — made up | 0 | 0 | 0 |
| newly broken vs master | — | — | **0** |

32 runs improved, 0 regressed. `docs/GIDEON-EVAL.md` regenerated by
`npm run eval:gideon`.

## Checks

- `npx tsc -b` → exit 0.
- `npx vitest run src/lib/gideon*.test.ts` → 5 files, 96 passed.
- `npm run eval:gideon` → 438/512 correct (85.5%), 88/88 honest, 0 made up.
- Full gates once at the end: `npm run index:entities` → 5,595 records (byte-identical
  to the committed index apart from `generatedAt`); `npx vitest run` → 217 files,
  1,546 passed / 11 skipped; `npm run lint` → exit 0 (pre-existing warnings only);
  `npm run build` → exit 0; `npm run test:bundle` → 7 passed; `npm run audit:pages`
  → 5,599 entities / 9 flagged; `npm run audit:links` → 0 dead, 0 guard violations.
  The regenerated audit docs were reverted (unchanged content, as in Task 177).

## ASSUMPTIONS

- **Which commit is "the Task 168 merge".** Used `d70d129` ("STATUS: 168
  merged"), the merged tip whose eval reads 432/512; it reproduces the 84.4%.
- **Sources, not data.** The removed text ships in `open/acquisition.json`,
  `open/wiki-db/region.json`, `checklists/bosses.json`,
  `open/wiki-db/boss-encounters.json` and `open/wiki-sections.json`. Gideon reads
  them at answer time; nothing is added back to `entity-index.json` and the
  generator is untouched.
- **Legacy-id links.** An answer links the aliased engine id (`region:X`) when it
  shares the record id's tail, because the app's own `canonicalFactId` already
  treats them as the same entity. This is what lets a caller holding the old id
  recognise the record.
- **`Ash of War: X` short name.** The bare skill name after the colon is treated
  as an alias only when the name is `Ash of War: …` and the suffix is ≥ 6 chars.
- **Wiki subject links.** The offline wiki fallback now links every subject the
  question named, not just the cited page, so a "X vs Y" answer surfaces both
  entities (this also fixed Q145/Q165/Q200, which the question text named).
- **Latency.** p95 rose (40 ms → 95 ms) from the first source fetch; the median
  is 13 ms and every source is cached for the session.

## Not done

- The task-168 "not done" list (q008/q027/q126/q127 build-route picks etc.) is
  out of scope: the brief is only the 172–177 regression. They are unchanged.
- No per-question hack: no expected id or question was edited.

## Brief checklist

- [x] 1. Found exactly which questions regressed (26 runs / 13 questions, old vs new answers listed above), by running the eval at the Task 168 merge commit in a temp worktree and diffing per-question.
- [x] 2. Grouped the causes (acquisition prose removed; region parent description replaced; drops cleaned; ids/names renamed/merged) and fixed Gideon's side to use location/region, acquisition, drop and alias fields — no bad data restored.
- [x] 3. Re-ran to **438/512 (85.5%) ≥ 84.4%** with **0 questions newly broken**; ran Gideon tests + eval + `npx tsc -b` while working and the full gates once at the end. Report written with regressions, causes, fixes, before/after, checklist.

ALL ITEMS DONE
