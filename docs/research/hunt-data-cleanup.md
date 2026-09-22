# Field-hunt data cleanup — `fieldHunts` vs `hunts.json`

**Date:** 2026-09-22
**Task:** 37 (`docs/tasks/37-hunt-data-cleanup-audit.md`), resolving HANDOFF-CLAUDE.md §6 P2 item #23
"Merge `fieldHunts` and `hunts.json`".

## What the two sources actually were

| | `fieldHunts` (`src/knowledge/completion.ts`) | `hunts.json` (`src/data/hunts.json`) |
|---|---|---|
| Rows | 24 (hand-authored literals) | 207 (154 unique bosses; multi-spawn bosses share one `id`) |
| Fields | `id`, `name`, `aliases`, `region`, `campaign` | `id`, `name`, `place`, `region`, `flag`, `campaign` |
| Ids | short slugs (`hunt:agheel`, `hunt:tibia`, `hunt:tree-sentinel-limgrave`) | canonical BuLEEto slugs (`hunt:flying-dragon-agheel`, `hunt:tibia-mariner`, `hunt:tree-sentinel`) |
| Purpose | alias/identity layer for Gideon's deterministic router | full dump with kill flags + spawn place for Codex and the save parser |
| Consumers | `gideon.ts` (stuck + "where/kill/hunt" intents), `Codex.tsx` (pre-load fallback) | `armory.ts` → `Codex.tsx`; `sl2/facts.ts` (via a derived copy) |

They were **not two copies of one shape** — `fieldHunts` carried the short aliases Gideon
matches on, `hunts.json` carried the flags/places the checklist and save parser need. But they
described the *same bosses*, and the overlap was real:

- **20 of 24** curated names matched a `hunts.json` row by name.
- **0 of 24** matched by id. The two tables used different ids for the same boss, so the app
  logged different facts for one kill: Gideon wrote `hunt:agheel`, Codex wrote
  `hunt:flying-dragon-agheel`, and the save parser wrote the canonical id. Same boss, three
  identities.
- A third copy existed too: `src/data/hunt-flags.json` (207 rows, `id`/`name`/`flag`) was a
  projection of `hunts.json` used by the save parser — another place for the two to drift.
- The 4 non-name-matching curated rows were label variants, not extra bosses:
  `Godskin Apostle (Windmill)` → canonical `hunt:godskin-apostle` @ Dominula;
  `Tree Sentinel (Limgrave)` → `hunt:tree-sentinel` @ Church of Elleh;
  `Fallingstar Beast (Fingerstone Hill)` and `Tree Sentinel duo (Shaman Village)` shared an id
  with an entry already in the list (`hunt:fallingstar-beast`, `hunt:tree-sentinel`), i.e. the
  curated list contained the same canonical boss twice.

## What was done

`src/data/hunts.json` is the single canonical source. Everything else derives:

1. **`src/knowledge/completion.ts`** now imports `hunts.json` and builds `fieldHunts` from it.
   The only authored data left is `HUNT_CURATION`: the alias list plus an optional `place`
   selector for ids shared by several spawns (Godskin → Dominula, Fallingstar → Sellia Crystal,
   Tree Sentinel → Church of Elleh). `id`, `name`, `place`, `region` and `campaign` all come
   from the canonical row. 24 curated entries became **22** because the two duplicate ids merged.
2. **`src/data/hunt-flags.json` was deleted.** `src/lib/sl2/facts.ts` reads the canonical
   `hunts.json` directly, so the save parser can no longer drift from the checklist.
3. **`src/knowledge/completion.test.ts`** guards the join: every curated id resolves to a real
   canonical row, the copied fields equal the row's, no duplicate ids, the old divergent ids are
   gone, every canonical hunt flag is addressable in the save bitfield, and a set
   `hunt:soldier-of-godrick` flag yields that canonical fact.

## Result

One canonical dataset, one id dialect (`hunt:<canonical-slug>`) shared by Gideon, Codex and the
save parser. The curated alias layer survives; the duplicated identity does not.
