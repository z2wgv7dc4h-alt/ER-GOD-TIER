# vawser event-flag dump — coverage audit

**Date:** 2026-09-22
**Task:** 37 (`docs/tasks/37-hunt-data-cleanup-audit.md`), resolving HANDOFF-CLAUDE.md §6 P2
item #25 "vawser event-flag dump — not ingested".
**Source:** https://github.com/vawser/ER-Documentation @ `d82ce4d2` (2023-07-16), cloned to
`.scratch/vawser/` (gitignored).

The question: Task 11 built its own event-flag table from the save-format side. Does vawser's
dump add real coverage that table is missing, or is it redundant?

## The two artifacts are different flag families

vawser ships two relevant files:

- **`Info - Event Flags - Dump.txt`** — a param-structure dump: **493 `EFID_*` blocks**,
  **17,129 flag rows**, **15,563 unique flag ids**, **1,516 distinct blocks** (`id / 1000`).
  The names are generic slot types (`Bonfire flag`, `System flag`, `Boss flag`, …) — no entity
  names, so it adds no *named* facts on its own.
- **`Info - Event Flags - Gameplay.txt`** — **480 hand-named progression/acquisition flags** in
  20 sections (great runes, boss defeats, mending runes, mechanics, memory stones, maps, crystal
  tears, whetblades, Ashes of War, pots, cookbooks, remembrances, boss items, bell bearings,
  recipes).

Task 11's side:

- `src/data/event-flag-bst.json` — **11,920 block → multiplier** entries (the save-format block
  table).
- Named flags the parser knows: **215 boss kill** (`hosted-bosses.json`) + **207 hunt** +
  **412 grace** = **642 unique**.

## Real numbers

| Comparison | Result |
|---|---|
| vawser dump blocks already in Task 11's BST | **1,485 / 1,516 (97.9%)** |
| vawser dump blocks not in BST | **31** (all look like EFID-only slots: `1000`, `10440`, `34160`, `99010`, …; the BST, from ER-Save-Lib, is the superset — it holds **10,435 blocks vawser never lists**) |
| vawser named Gameplay flags overlapping the 642 known named flags | **0 / 480** |
| vawser Gameplay flags whose block exists in the BST | **348 / 480** — the other **132** are not addressable from a save by the current parser |
| vawser Gameplay flags also present in its own Dump.txt | 264 / 480 |
| vawser `9xxx` major-boss defeat flags | 25 — **24 / 25 already covered by name** in `hosted-bosses.json` (only "Hoarah Loux - Leyndell", Godfrey's phase 2, has no exact row) |
| Task 11's 642 named flags appearing literally in vawser's Dump.txt | 137 |

The zero overlap is not a data error: the two tables live in different id spaces. Task 11 reads
**world/map event flags** (8–10 digit ids such as `10000800`, `1042360800`) plus grace warp rows
(`71000`); vawser's Gameplay file is the **game-progression / item-acquisition** family
(`171–197` great runes, `9100–9184` `HandleBossDefeat`, `30000–68000` recipes/maps,
`270700–290700` remembrances, `11109700` bell bearings).

## Verdict: genuinely new *family*, but nothing worth ingesting for this need — closed

vawser is **not redundant in the literal sense** (different flags, 0 named overlap), but it does
not pay for an ingestion here:

1. **No new boss coverage.** Its 25 major-boss defeat flags duplicate bosses already tracked by
   name in `hosted-bosses.json` (24/25), which the parser already reads.
2. **No new named boss/hunt/grace facts at all** — the Dump.txt carries only generic slot types.
3. **Different category with no consumer.** The useful payload is item-acquisition flags (great
   runes, cookbooks, Ashes of War, bell bearings). The `Character` model has no great-rune or
   acquisition-flag field, and `collectedItems` is populated from catalog `item:` slugs — using
   vawser would mean building a new acquisition-flag → fact join table with no UI behind it.
4. **28% of it isn't even readable from a save** — 132/480 named flags have no block in the
   BST, so the current parser could never detect them.

This mirrors Task 14's FMG finding: the source is real and not a duplicate, but its only
non-redundant payload has no consumer, so manufacturing an ingestion would add dead data. Closed
as **"new family, nothing to add for the current need"** rather than forced in.

Re-open if a great-rune / acquisition tracker (a real product feature, per HANDOFF-CLAUDE.md §7
"Scadutree fragments… as first-class meters" and the Great-Rune screenshot idea) is built and
needs a flag source — at that point vawser's `Gameplay.txt` is the reference, and the 132
unaddressable flags need a BST update first.
