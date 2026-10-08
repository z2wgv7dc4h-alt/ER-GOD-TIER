# The generated alias plane

`docs/history/SCOPE-2026-09.md` item 2: *"One generated `aliases.json` after extract. Every other plane keys off
the slug."* This is that file and the pass that produces it (Task 23).

## What it is

`public/sourced/aliases.json` (and an identical bundled copy at `src/data/aliases.json`) is an
array of rows, each mapping a game **engine row id** to the authored **catalog slug**, the
extracted **FMG name**, and the searchable **aliases**:

```json
{
  "engineId": "goods:8175",
  "slug": "item:haligtree-secret-medallion",
  "kind": "item",
  "fmgName": "Haligtree Secret Medallion (Left)",
  "aliases": ["haligtree medallion", "haligtree secret medallion", "secret medallion"],
  "source": "names"
}
```

- `engineId` — the FMG / param-table row id (`grace:100000`, `bossflag:510010`, `npc:21300014`,
  `goods:8175`, …). For authored-only facts (quests, regions) it is the fact id itself.
- `slug` — the canonical authored id (`grace:godrick-grace`, `boss:margit`,
  `item:haligtree-secret-medallion`, …), i.e. what `canonicalFactId` returns.
- `kind` — the fact prefix family: `grace | boss | invader | item | quest | region`.
- `fmgName` — the name as extracted from the game data.
- `aliases` — normalised name + authored aliases + the extracted name when it differs.
- `source` — which dump the row came from (`hosted-graces`, `hosted-bosses`, `npc-combat`,
  `names`, `paramdex-npc`, `authored`).

## Regenerate

From `artifacts/all-knowing`:

```bash
node scripts/gen-aliases.mjs
```

That rewrites both `public/sourced/aliases.json` and `src/data/aliases.json` in one pass and
prints the per-category coverage. A test asserts the two copies stay identical, so a stale
bundled copy fails CI rather than drifting silently.

### Where the inputs come from

The generator reads the game-derived dumps this repo already carries — it does not touch the
install itself, so it is fast and repeatable:

| Input | Extracted from | Refresh |
|---|---|---|
| `public/sourced/open/names.json` | EN FMG text (Text Explorer) | `bash scripts/ingest-open.sh` |
| `public/sourced/open/paramdex/*.txt` | `soulsmods/Paramdex` `ER/Names` param row names | `bash scripts/ingest-open.sh` |
| `public/sourced/checklists/graces.json` | `BonfireWarpParam` (418 rows; identical to `src/data/hosted-graces.json`) | Task 06 ingest |
| `public/sourced/open/boss-xyz.json` | boss flags / XYZ (215 rows; identical to `src/data/hosted-bosses.json`) | Task 06 ingest |
| `src/data/hunts.json` | field-boss checklist + event flags | FanAPI / BuLEEto ingest |
| `public/sourced/npc-combat.json` | `NpcParam` from the local `regulation.bin` | Task 17 (erdb + soulstruct) |

So the chain is: **local install → (erdb / paramdex / Text Explorer dumps) → `gen-aliases.mjs`
→ `aliases.json`**. Task 14's finding still holds: Elden Refs and Carian Archive add nothing
beyond `names.json` for the name half, so they are not used here.

Matching is deliberately strict — exact normalised name/alias equality (possessives,
parentheticals and leading articles normalised away). Containment was tried and rejected: a
one-word alias like `godrick` pulled in every spirit-summon and soldier variant, and reverse
containment turned `Dagger` into `Weathered Dagger`. Precision matters because
`canonicalFactId` trusts these mappings.

## Wiring

- `src/lib/aliases.ts` loads the bundled rows into `generatedEngineToSlug` (engine id → slug),
  `generatedNameToSlug` (unambiguous name → slug) and exposes `matchGeneratedAliases()`,
  `generatedAliasStatus()` and `generatedAliasBySlug()`.
- `canonicalFactId(id, name)` checks the generated engine map after the curated grace/boss maps,
  and the generated name map after the curated grace/boss name maps — so every category
  canonicalises, and the verified grace/boss behaviour is untouched.
- `searchSync` adds a final `alias` source that only fills slots the curated sources left open.

## Coverage

Catalog totals: grace 25, boss 88, invader 24, item 94, quest 114, region 10 (355 facts).
"Before" is the state with no generated plane (only the hand-curated grace/boss links existed).
The per-category numbers below date from the Task 55 pass; the catalog totals grow as tasks add
facts, so the generator's printed counts are authoritative.

| Category | Facts | Engine-backed rows after | Zero generated aliases before → after |
|---|---|---|---|
| grace | 25 | 25 | 25 → 0 |
| boss | 88 | 86 | 88 → 0 |
| invader | 24 | 22 | 24 → 0 |
| item | 94 | 93 | 94 → 0 |
| quest | 114 | 0 (authored) | 114 → 0 |
| region | 10 | 0 (authored) | 10 → 0 |

Every fact has at least one generated row (engine-backed where the game tables name it,
authored otherwise), so name/alias lookup exists for every category. The facts that remain
authored-only in a game-backed category are `boss:leontiel` (a Tarnished Pack mod boss with no
vanilla `NpcParam` row), two items whose FMG names differ (`item:rennala-great-rune`,
`item:haligtree-secret-medallion`) and two invaders with no `NpcParam` row
(`invader:great-horned-targoth`, `invader:millicents-sisters`). The catalog totals grow as tasks
add facts; the table is refreshed on each generator run.

## Task 55 completeness pass

The generator was finished in Task 55: it now also reads `src/data/hunts.json`
(kind `hunt`) and maps every `BonfireWarpParam` row to an authored **catalog**
grace when no `graces.ts` warp seed exists (so e.g. `grace:120208` →
`grace:night-sacred-ground`). Item matching prefers a strict, parenthetical-
preserving name match, so `goods:8175` / `goods:8176` resolve to
`item:haligtree-medallion-left` / `-right` rather than the bare both-halves fact.
The row sort is a plain code-unit comparison, so a second run is byte-identical.

Current output: **7,192 rows** (~1.34 MB). The source mix grows with the name planes, led by
`enemy-name` 3,924, `game-name-table` 1,000, `legacy-id` 958, `entity-index` 360 and `boss-roster`
261, with `authored` 128, `paramdex-npc` 115, `npc-combat` 79 and `hunts` 74 after them. `grace-stub`
is now **0** — every warp resolves to an authored grace or the index's own `grace:<warpId>` record
(Task 160). Engine-backed by catalog prefix: grace 25/25, boss 86/88, item 93/94, invader 22/24,
quest 0/114 (authored), region 0/10 (authored).

### Warp resolution (Task 73, revised in Task 160)

Every `checklists/graces.json` warp resolves to a real catalog grace. Where an
authored slug exists it wins (a warp name that is a variant of one, e.g.
"Haligtree Town" → `grace:haligtree-town`, maps onto that fact); otherwise the
generator points the warp at the entity index's own `grace:<warpId>` record. The
synthetic `grace:{name-slug}` **stub** rows (`source: 'grace-stub'`) introduced in
Task 73 were dropped in Task 160 — they carried no catalog fact, which left dead
"Related" chips — so `grace-stub` is now **0**. `canonicalFactId('grace:{warpId}')`
therefore returns an authored or index-backed slug for all 418 warps, and
`searchSync` finds the warp by its English name.

### Honest unmatched report (not silently dropped)

| Source | With a slug | Unmatched |
|---|---|---|
| Warps (`checklists/graces.json`, 418) | 418 | **0** |
| Hosted bosses (`open/boss-xyz.json`, 215) | 136 | **79** |

After Task 73 every warp has a slug (authored or stub), so its unmatched count is
zero. Unmatched bosses are NpcParam rows the catalog has no boss fact for; they
still appear in the engine's own data — this plane simply has no slug to map them
onto, and inventing one (or a coordinate) is out of scope. The regenerate command
prints the counts and, with `ALIAS_UNMATCHED=1`, the full name list.

## Why this is committed

`aliases.json` is committed, unlike `vendor/elden-ring-map/data/markers.json`. The `.gitignore`
rule for the vendor tree exists because tiles and `markers.json` are FromSoftware **art / marker
dumps** produced by the map engine from the install. `aliases.json` is name/id-only — no asset
bytes — the same class of derived data as the already-committed `open/names.json`,
`open/paramdex/`, `hosted-graces.json` and `npc-combat.json`. It is also needed at import time
for the synchronous `canonicalFactId`/`searchSync` paths, and at ~1.34 MB it is still small enough
to bundle. Committing it keeps the alias plane reproducible and reviewable; it can still be
regenerated from the local install with the command above.
