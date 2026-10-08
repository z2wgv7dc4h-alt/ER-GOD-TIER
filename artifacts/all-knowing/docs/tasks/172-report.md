# Task 172 report — Template-sentence descriptions (audit 171, Batch A items 1–2)

Branch `task-172`. Scope: description-text cleanup in `src/lib/entityIndexBuild.ts` and the
`Task 172` guard in `src/lib/auditFixes.test.ts`. Nothing else touched.

A previous run had committed an over-broad "work in progress (items 1-2)" (`8b301e2`) that also
implemented Batch A items 3–5 (Nightreign filtering, cross-page/kind compatibility) and Batch B
items 6–8 (acquisition-place cleanup, medallion names). That exceeded the brief ("do exactly what
it says; nothing extra"), so this run kept only the items 1–2 work and pared the rest back to the
pre-172 behaviour. Net diff from `8b301e2` is small and focused.

## What changed

`src/lib/entityIndexBuild.ts`
- `TEMPLATE_DESC` kept as-is; added `GAME_TEMPLATE_FRAME`, `THIS_IS_LEAD` and `LEAD_FRAGMENT` with
  the exact expressions from the brief:
  - `\b(is|are|was) (a|an|the|one of the)\b[^.]{0,80}\bin (Elden Ring|Shadow of the Erdtree|the Lands Between)\b`
  - `^This is an? `
  - `^[,.;:)]|^s are `
- `isTemplateSentence` now tests all four (the old `TEMPLATE_DESC` plus the three new ones).
- `stripTemplateSentences` (split on sentence boundaries, drop template sentences, keep the rest,
  empty when nothing real survives) runs on every final description in the build loop, and again on
  the wiki/Fextralife fallback fill so a later fill cannot reintroduce a template.
- `gameTextFor` and `acceptableLeadSentence` reject template sentences via the shared predicate.
- Reverted the out-of-scope WIP additions (`MEDALLION_HALF_FACTS`, `cleanAcquisitionPlace` /
  `BARE_PLACE_TYPE`, wiki kind-compatibility + Nightreign-page filtering, the acquisition-`location`
  scrub), restoring their pre-172 code paths.

`src/lib/auditFixes.test.ts`
- Replaced the WIP's extra Nightreign / cross-page tests with the single brief-specified guard:
  no description matches the category frame, `^This is an? `, or a leading `[,.;:)]`/`s are `
  fragment. (Extra tests for items 3–5 are not this brief's job.)

`public/sourced/entity-index.json` — regenerated (`npm run index:entities`), 5,621 records.

## Before / after (HEAD index vs regenerated)

| check | before | after |
|---|---:|---:|
| descriptions matching the category frame | 132 | **0** |
| descriptions starting `This is a/an ` | 3 | **0** |
| descriptions starting `,`/`;`/`:`/`)` or `s are ` | 22 | **0** |
| empty descriptions | 296 | 306 |
| total records | 5,621 | 5,621 |

(The 171 report counted 126 category-frame descriptions with its own method; this guard is slightly
looser — it also matches "was"/"one of the" and the un-italicised game titles — hence 132.)

Non-empty real prose is kept when a template sentence is removed; only 10 records that had *nothing*
but template/fragment text became empty. Examples of repaired corrupted descriptions:

| id | before | after |
|---|---|---|
| `enemy:imp` | `s are Enemies in Elden Ring, Shadow of the Erdtree, and.` | `Commonly found in Catacombs across the Lands Between, Imps are small, green stone Golems crafted with glintstone implements by an ancient golem-maker.` |
| `enemy:fire-prelate` | `s are Enemies in Elden Ring and Bosses in.` | `The Fire Prelates were commanders of the Fire Monks who once aided the champions of the Erdtree during the War Against the Giants…` |
| `npc:swordhand-of-night-anna` | `or Puppet of Anna is a character in Shadow of the Erdtree.` | `Anna was raised deep underground alongside her Jolán to be Swordhands of Night.` |
| `boss:radahn` | `, also known as General Radahn, the Red Lion General…` | `General Radahn was feared as the strongest Demigod during the Shattering.` |
| `boss:frenzied-duelist` | `This is an optional boss Closest Site of Grace: Gaol Cave…` | *(empty)* |
| `boss:theodorix` | `This is an optional boss Closest Site of Grace: Cave of the Forlorn…` | `Head north from the Inner Consecrated Snowfield Site of Grace to the river of ice, then follow it east and you'll run into Theodorix.` |
| `grace:120100` | `This is an optional boss Closest Site of Grace: Ainsel River Downstream…` | `From the Ainsel River Downstream Site of Grace, drop down off the ledge into the river and follow it downstream into the western cave.` |

## Final check results

- `npx vitest run src/lib/auditFixes.test.ts` — **13 passed (1 file)**.
- `npx tsc -b` — exit 0.
- `npm run index:entities` — 5,621 records; the three guard regexes match **0** descriptions.

## ASSUMPTIONS

- The "before" column is `HEAD`'s committed `entity-index.json` (the 171-era snapshot), because the
  WIP commit did not regenerate the index.
- The brief's item 1 guard is authoritative for "template sentence"; `TEMPLATE_DESC`
  (`/in Elden Ring\.|a melee armament/`) was kept alongside the three new expressions because an
  existing Task 148/150 guard relies on it.
- "repair the 11 corrupted ones" was read as the report's `s are …` fragment family (11) plus the
  `or Puppet of Anna…` and `, also known as…` leads and the 3 `This is a…` leads; all are gone in the
  regenerated index. `boss:tibia-mariner`'s `are optional bosses in…` starts with a bare `are`,
  which the brief's test does not guard and is not in the 11, so it was left for a later batch.
- Stripping a sentence can leave a record empty; empty is allowed by the brief ("if nothing real
  remains, leave empty") and AGENTS ("empty beats fake").
- Out-of-scope WIP work (Batch A 3–5, Batch B 6–8) was reverted; those items belong to other briefs.

## Not done / not run (by design)

- Full gates (`vitest run`, `lint`, `build`, `test:bundle`, `audit:*`) were not run: the brief lists
  only the one test, `tsc -b` and `index:entities`.
- No full-suite run, so any regression in the reverted extra behaviour would only show in those
  gates; the reverted code is the unchanged pre-172 implementation, so its tests are unaffected.
- `.env` / `.env.local` never opened.

## Brief checklist

- [x] 1. Widen the `auditFixes.test.ts` guard to the three brief regexes, and make it pass by
      stripping template sentences (keep the rest, empty if nothing remains) and repairing the
      corrupted descriptions.
- [x] 2. Run only that test + `npx tsc -b` + `npm run index:entities`; commit; report.

ALL ITEMS DONE
