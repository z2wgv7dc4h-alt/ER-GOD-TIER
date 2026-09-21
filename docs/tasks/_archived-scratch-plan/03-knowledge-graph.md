# Task 03 — Knowledge fact graph + Character state

## Context

Read `PROJECT_BRIEF.md` at the repo root in full, especially the **"Reckoning — the front door"**
section — this task builds the data model that feature depends on. Tasks 01 (scaffold) and 02
(erdb item/boss/location catalog in `src/data/catalog/`) should already exist and be reviewed;
stop and report if they're missing.

Do not confuse the two data layers:
- `src/data/catalog/` (Task 02, from erdb) is the **broad** item/boss/location database — every
  weapon, every armor piece, full stat blocks. Used by Codex, Atlas, Forge.
- `src/knowledge/` (this task) is a **narrow, hand-seeded fact graph** — just the facts that
  prove story progress and the implications between them. Much smaller, purpose-built for
  Reckoning's inference engine.

## Objective

Build `src/knowledge/catalog.ts` (the seed fact graph) and the `Character` state model that
Reckoning, the Atlas, the Forge, and the future quest graph all read and write.

## Requirements

### Fact catalog (`src/knowledge/catalog.ts`)

A closed set of fact entries covering: Sites of Grace, shardbearers, story bosses, Shadow of the
Erdtree bosses, "Tarnished Pack" invaders, and key items that prove a story beat (Great Runes,
medallions, Fingerslayer Blade, Dark Moon Ring, Mending Rune needles, and similar — cross-check
names against `src/data/catalog/` from Task 02 so IDs match up, don't invent parallel names).

Each fact needs:
- A stable id and display name.
- A category (grace / shardbearer / boss / item / etc).
- **Implications**: what else must already be true if this fact holds. This is the graph edge
  list. Encode the examples from `PROJECT_BRIEF.md` exactly:
  - Godrick's Great Rune obtained → Godrick is dead → Margit is dead → Stormveil gate graces
    exist (reachable).
  - Fingerslayer Blade obtained → Radahn festival has happened → Ranni's Nokron questline step
    is done.
  - Scadutree Fragment present (any) → player is in the Realm of Shadow (SotE has started).
  - Extend this pattern to the other shardbearers/story bosses/DLC bosses at a reasonable seed
    depth — don't try to cover every side quest, this grows later from the PC extract per the
    brief.

Write the implication resolver as a pure function: given a set of confirmed fact ids, return the
full closure of facts implied (transitively). Unit-test it against the three worked examples
above at minimum.

### Character state (`src/store/character.ts` or extend the store from Task 01's scaffold if one
already exists — check first)

- One or more character profiles (name, class, platform, content-scope flags per the brief).
- A `facts: Record<factId, FactRecord>` map where `FactRecord` carries **provenance**: the source
  (`"answer" | "screenshot" | "inference" | "save"`), a timestamp, and — for `screenshot` —
  which screen type and what the player typed. This provenance requirement is non-negotiable
  per the brief ("receipts"); do not store a bare boolean.
- A method to apply a new confirmed fact that also runs the implication resolver and records
  every newly-implied fact with source `"inference"`, pointing back at the fact that triggered
  it (so a "why do you think this?" UI is possible later, even if not built this task).
- Persist locally (same `zustand` + `persist` pattern as the rest of the app — no backend).
- If Task 01 already scaffolded a `Ledger`/character store, extend/rename it to match this
  shape rather than creating a second, competing store — reconcile, don't duplicate.

## Explicit exclusions

- No UI in this task (no interview screen, no screenshot upload) — that's Task 04 (Reckoning).
- No OCR — out of scope everywhere right now per the brief.
- Don't try to reach full item/grace coverage — this is a seed, sized for the worked examples
  plus a reasonable spread of shardbearers/bosses, not exhaustive.

## Acceptance criteria

- `src/knowledge/catalog.ts` exists with real entries (not placeholders) covering at least all
  shardbearers, the named DLC/story bosses in the brief's examples, and the named key items.
- A test proves: applying "Godrick's Great Rune obtained" yields Margit-dead and
  Stormveil-graces-reachable in the closure, each recorded with source `"inference"` and a
  pointer to the triggering fact.
- A test proves: applying "Fingerslayer Blade obtained" yields the Radahn-festival and
  Ranni's-Nokron-step facts.
- `npm run typecheck`, `npm run lint`, and the test suite all pass.
- Final report states: total fact count, deepest implication chain length, and any shardbearer/
  boss you weren't confident enough about to encode (flag it rather than guessing).
