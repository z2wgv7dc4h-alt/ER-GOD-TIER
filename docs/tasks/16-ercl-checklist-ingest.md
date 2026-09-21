# Task 16 — Ingest the ERCL checklist item lists

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `DATA.md` first. The user
provided a Nexus Mods pack, "ER Checklist" (Nexus #9953,
`C:\Users\RIGGUSPIG\Downloads\ER Checklist-9953-3-1780141129.zip`) — despite the name, this is
**not** a binary game-patch mod like the earlier #9974 pack. It's a live-game overlay tool (a DLL
requiring EAC bypass to run in-game — **you are not installing or running that overlay, ignore
`ercl_overlay.dll` and the README's install instructions entirely**) bundled with a small, plain
JSON data file: `mods/ercl/items.json`. That file needs no reverse-engineering — it's already
readable JSON, already inspected:

```
{
  "version": "sote-1.16",
  "categories": {
    "sorceries": { "display_name": "Sorceries", "items": [{ "id": "0x40000FA0", "name": "Glintstone Pebble" }, ...] },
    "incantations": { ... },
    "talismans": { ... },
    "gestures": { ... },
    "ashes_of_war": { ... },
    "crystal_tears": { ... },
    "cookbooks": { ... },
    "whetblades": { ... },
    "spirit_ashes": { ... }
  }
}
```

Nine categories, hex item ids + names, base game vs Shadow of the Erdtree counts documented in
the pack's own README (584 base / 768 with SotE total). This maps directly onto product ideas
already on the roadmap (`PROJECT_BRIEF.md`'s archived scratch plan and `HANDOFF-CLAUDE.md`'s
"Product ideas still valid" section both name "Cookbook / bell bearing / whetblade / crystal tear
sets" as achievement-shaped completion tracking, exactly what this data is for) and several
categories `DATA.md`/`REVIEW.md` flag as thin today (spirit ashes, crystal tears/Scadutree-
adjacent collectibles).

Extract the zip to `./.scratch/` inside this repo (already gitignored) — **never `/tmp`,
`%TEMP%`, or any path outside the project**, per the standing rule in `docs/tasks/00-README.md`.

## Objective

Cross-reference `items.json`'s nine categories against what's already in this project's catalog/
collectibles/knowledge files, and merge in whatever's missing so completionist checklist tracking
covers all nine categories with accurate base/SotE counts.

## Requirements

- For each of the nine categories, find where this project already tracks (or should track) that
  category — likely spread across `src/knowledge/catalog.ts`, `collectibles.ts`,
  `public/sourced/open/*.json`, or `public/sourced/checklists/*.json` (check `ashes.json`,
  `magic.json` for spells/ashes of war overlap first, don't assume nothing exists). Don't create
  a ninth parallel data file if a category already has a home — extend what's there.
- Merge in items present in `items.json` but missing from the project's existing tracking, using
  the hex ids as a stable identifier (convert to whatever id convention the target file already
  uses — check `src/lib/aliases.ts`'s `prefixKind`/`canonicalFactId` pattern for how other
  categories are keyed, stay consistent).
- Don't duplicate categories that are already fully covered — this is a gap-fill merge, like Task
  08's collectibles merge, not a wholesale replacement.
- `crystal_tears` and `spirit_ashes` are the two categories most likely to have real gaps per
  `DATA.md`'s own notes — prioritize getting those right; the others (gestures, cookbooks,
  whetblades) are lower-stakes if you have to triage for time.
- Note the pack's `version: "sote-1.16"` — if any of this project's other data sources are pinned
  to a different patch version, flag the mismatch in your report rather than silently blending
  data from different game versions.

## Explicit exclusions

- Do not install, reference, or wire up `ercl_overlay.dll` or any live-game-overlay
  functionality — that's a separate tool this project has no use for. Only `items.json` matters.
- Don't build a checklist UI feature in this task if one doesn't already exist for these
  categories — this is a data-completeness task; wiring new UI is a separate concern unless it's
  a trivial extension of an existing checklist view.

## Acceptance criteria

- Report, per category: existing count vs. `items.json`'s count vs. what was actually missing and
  got added (some categories may already be fully covered — say so plainly rather than padding
  the report).
- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Final report explicitly confirms `ercl_overlay.dll` was not touched/referenced anywhere.
