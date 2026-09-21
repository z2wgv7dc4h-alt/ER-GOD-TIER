# Task 18 — Fill the catalog gaps Task 13's diff already found

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `docs/SCOPE.md`. Task 13
already produced a full gap report comparing `src/knowledge/catalog.ts` (89 facts) against the
EanNewton progress tracker — read it in full at `docs/research/eannewton-catalog-diff.md`
(relative path `../../docs/research/eannewton-catalog-diff.md` from your working directory,
`artifacts/all-knowing`; use that exact relative path). This task turns that report into real
catalog entries. The project owner has confirmed they want the catalog genuinely filled out, not
left at seed size — quests, items, and bosses specifically.

## Objective

Add the concrete gaps Task 13 identified as real `catalog.ts` facts (with `implies` edges
following the existing pattern), prioritized by what the diff called highest-value.

## Requirements, in priority order from the diff report

1. **5 missing Legend-tier bosses**: Beast Clergyman, Dragonlord Placidusax, Lichdragon
   Fortissax, Regal Ancestor Spirit, Hourah Loux Warrior. Add as `boss:` facts with appropriate
   `implies` edges (check `src/data/hosted-bosses.json` — from `boss-xyz.json` — for real ids/
   coordinates to link via `src/lib/aliases.ts`'s boss alias table from Task 06, don't invent
   parallel ids).
2. **~30 missing Great-Enemy fights** (Agheel, Leonine Misbegotten, Elemer of the Briar, Magma
   Wyrm Makar, Commander Niall, Loretta, Glintstone Dragon Adula, Mimic Tear, Valiant Gargoyle
   Duo, Mohg the Omen, and the rest the report lists) — same pattern as above. These are numerous
   but individually low-complexity; batch through them rather than treating each as a special
   case.
3. **31 NPC Invaders** — the diff notes *"no `invader:` kind exists"* in the fact-id dialect
   (`src/lib/infer.ts`'s `prefixKind`). Decide whether these need a new `invader:` prefix kind
   (check how `prefixKind` buckets facts — `grace|point`→grace, `boss|hunt|bossflag|area`→boss,
   `quest|line`→quest, else→item) or fit naturally under the existing `boss` bucket (an invader
   is arguably boss-shaped: a defeatable NPC encounter). Make a call, document why, and if you add
   a new prefix kind, update `prefixKind` and its tests (Task 06's `infer.test.ts`) consistently.
4. **15 Remembrances** — the diff notes *"catalog encodes Great Runes only"* for the
   drop-a-key-item-on-boss-death pattern. Add as `item:` facts with `implies`/`drops` matching the
   existing Great Rune convention (check `boss:mohg`/`boss:malenia`'s existing `drops:
   ['item:...-great-rune']` field for the pattern to follow).
5. **Quest-item keys** the diff lists as absent: Rold Medallion, Cursemark of Death, Miniature
   Ranni, Valkyrie's Prosthesis, Black Knifeprint, Weathered Dagger, Sellian Sealbreaker, Rya's
   Necklace, Volcano Manor Invitation, plus prayerbooks/scrolls. Cross-check against
   `src/knowledge/storylines.ts` (just expanded in Task 12 with 17 NPC lines, 223 edges) — several
   of these items may already be referenced by `id` in quest steps without having a matching
   `catalog.ts` fact entry; if so, this is a real bug (a quest step referencing a non-existent
   fact id), fix by adding the missing fact rather than just leaving the dangling reference.
6. **134 field-boss rows / 71 unique names** — the diff calls this "bulk checklist material,
   lower per-item value." Lower priority; only pursue after 1-5 above if you have time/budget
   left in this task. Don't let this bulk category crowd out the higher-value items above.

Also apply the diff's smaller **naming fixes**: the tracker's "Margitt" typo and "Hourah Loux"
spelling are tracker-side issues (don't import the typo), but note `beast clergyman` as a
plausible missing alias for `boss:maliketh` if that's confirmed correct (verify, don't assume —
Beast Clergyman and Maliketh are related lore-wise but check whether they're the same fight or
distinct before merging their ids).

## Explicit exclusions

- Don't touch the region-vocabulary mismatch the diff flagged (catalog's granular sub-regions vs.
  tracker's macro-regions) — that's a separate concern, not a fact-completeness gap.
- Don't re-scrape the EanNewton sheet — Task 13's report already has everything needed; this task
  works from that report, not a fresh fetch.
- Don't touch `src/knowledge/storylines.ts`'s quest *steps* structurally (Task 12's territory) —
  only add the missing `catalog.ts` fact entries that steps may reference.

## Acceptance criteria

- All of items 1, 2, 3, 4 from the priority list above are added as real `catalog.ts` facts with
  sensible `implies` edges, cross-linked to real ids via the alias tables where applicable.
- Item 5's dangling quest-step references (if found) are fixed.
- `prefixKind`'s handling of invaders is a deliberate, documented decision, not an oversight.
- `npx tsc -b`, `npm run lint`, `npm test` all pass (extend existing tests for any new
  `prefixKind` behavior).
- Final report: exact fact count before/after, per-category breakdown, and how far into item 6
  (field bosses) you got, if at all.
