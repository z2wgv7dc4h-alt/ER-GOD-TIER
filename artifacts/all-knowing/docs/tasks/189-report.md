# Task 189 — 186 review, Batch C (name-table resolution) — report

Branch `task-189`, worktree `artifacts/all-knowing`. This continues the run that stalled
with nothing committed: it had only built read-only scratch analysers in `.scratch/189/`.
`.env` / `.env.local` were never opened; no server/preview/background process was started
(the one attempt at `npm run index:entities` hung on its Vite module runner and is reported below).

Brief: do exactly **Batch C** of `docs/tasks/186-report.md` (FIX LIST items 10–12). Owned
files: `scripts/gen-aliases.mjs`, `src/data/game-name-aliases.json`.

---

## What changed

| file | change |
|---|---|
| `src/data/game-name-aliases.json` | **+5 spellings**: `Asimi, Eternal King`, `Count Ymir, High Priest`, `Demi-Human Boc`, `Pureblood Knight Ansbach` (NpcName) and `Siofra River Well` (PlaceName) |
| `scripts/gen-aliases.mjs` | game-name-table pass now resolves a `Ash of War: <skill>` spelling to the bare-skill record when the prefixed spelling matches none (and matches the plural `Ashes of War:` form) |
| `public/sourced/aliases.json`, `src/data/aliases.json` | regenerated with `node scripts/gen-aliases.mjs` (+362 lines each) |
| `src/data/legacy-alias-exceptions.json` | regenerated; **7 fewer** dead legacy ids (`enemy:41109010`, `enemy:41109110`, `npcs:121810`, `npcs:142000`, `region:siofra-river-well`) now resolve through the new aliases |
| `src/lib/nameTableResolution.test.ts` | **new**: 7 tests, one per item |
| `docs/tasks/189-fix.md` | the brief, committed |

### Item 11 — NpcName regressions (the Task 184 name change)

The Task 182/184 index rebuild dropped the `npcs:<id>` FMG stubs via `foldFmgNpcRows`; where the
FMG spelling did not equal a surviving record's name the name lost its only link. Measured with the
report's method (resolve each `NpcName.json` value against every record name + every `aliases.json`
`fmgName`/`aliases`), **8 → 4** spellings unresolved (rawNorm form) and **4 → 2** with the app's
normal form. Fixed:

| in-game spelling | record |
|---|---|
| `Asimi, Eternal King` | `npc:asimi-silver-tear` (wiki redirect: "Asimi, Eternal King → Asimi, Silver Tear") |
| `Count Ymir, High Priest` | `hunt:count-ymir-mother-of-fingers` (wiki: "Count Ymir, High Priest → Count Ymir"; same character's boss page — no `npc:` page exists) |
| `Demi-Human Boc` | `npc:boc` (wiki: "Demi-Human Boc → Boc the Seamster") |
| `Pureblood Knight Ansbach` | `enemy:sir-ansbach-npc-specimen-storehouse` (wiki: "Pureblood Knight Ansbach → Sir Ansbach"; the surviving Sir Ansbach NPC page) |
| `Night's Cavalry (Glaive)` / `(Flail)` | `boss:nights-cavalry` (already present; verified resolving) |

**Documented gaps (no record; never mapped to a stranger):** `Someone Yet Unseen` (the game's
placeholder for 16 unseen NPCs) and `The Noble Broken Mask` (no record, no wiki target).

### Item 12 — PlaceName

`Siofra River Well` (PlaceName 6101500) → `region:siofra-river`. PlaceName unresolved **1 → 0**.
(Chose the existing `region:siofra-river` rather than minting `region:siofra-river-well`, to keep
the edit inside the owned data file; see ASSUMPTIONS.)

### Item 10 — WeaponName / ArtsName / GemName

The measured `GemName` unresolved **25 → 9**: 16 DLC `Ash of War: <skill>` spellings now fold onto
their bare-skill record (`Ash of War: Blinkbolt → item:blinkbolt`, `… Dryleaf Whirlwind →
item:dryleaf-whirlwind`, `… Carian Sovereignty → item:carian-sovereignty`, … the full 16 are asserted
in the test). **The remaining gaps are documented, not invented:**

- **WeaponName 28** — 24 affinity-only spellings the FMG uses with labels the app's affinity list does
  not carry (`Bloody …`, `Sharp …`, `Flame …`, `Pyromancy …`, `Blessed …`, `Arcane …`) plus 4 real
  misses: `Royal Soldier Straight Sword` (cut), `Pulley Crossbow` (its `item:pulley-crossbow` record is
  named "Pulley Bow" — a different weapon), `Great Épée` and `Varré's Bouquet` (differ from
  `item:great-epee` / `item:varre-s-bouquet` only by an accent the app's normal form cannot fold).
- **ArtsName 134** (report: 135 under its rawNorm-only pass; the loose form resolves one) — weapon-skill
  names with **no record anywhere** (`Waterfowl Dance`, `Messmer's Assault`, …), confirmed by the test
  against `item:<skill>`, `item:skill-<skill>` and `item:ash-of-war-<skill>`.
- **GemName 9** — 3 `test gem` dev rows, `Ashes of War: Invisible Arrow`, `Ashes of War: Wicked Stance`,
  and the four base skills `Torch Attack` / `Spinning Chain` / `Firebreather` / `Buckler Parry` that
  have no record.

---

## Tests

`src/lib/nameTableResolution.test.ts` (7 tests, all passing):

1. §11 the six added NpcName spellings resolve through `canonicalFactId` to an existing record.
2. §11 `Someone Yet Unseen` / `The Noble Broken Mask` stay unresolved and unmapped.
3. §12 `Siofra River Well` → `region:siofra-river`.
4. §10 WeaponName base-name unresolved set **equals** the 28-name documented gap.
5. §10 GemName unresolved set **equals** the 9-name documented gap.
6. §10 the 16 DLC Ash of War spellings resolve through `canonicalFactId` to their skill record.
7. §10 the 134 ArtsName gaps are genuine: none has an `item:<skill>` / `item:skill-<skill>` /
   `item:ash-of-war-<skill>` record.

No count was loosened and no test was skipped/deleted.

---

## Final checks

| gate | result |
|---|---|
| `npx tsc -b` | PASS (exit 0) |
| `npx vitest run` | PASS — **222 files, 1590 passed, 11 skipped, 0 failed** (was 221/1583; +1 file / +7 tests = this task). Ran with `--testTimeout=300000`: the default 60 s run timed out on one unrelated test (`src/map/itemSources.test.ts`, a 165 s file) because five parallel tasks and their preview/supervisor processes were saturating the machine; the same suite passes green under normal load |
| `npm run lint` | PASS (exit 0; warnings only, none in changed files) |
| `npm run build` | PASS (76 engine files / 2.5 MB; normal plugin timings) |
| `npm run test:bundle` | PASS (7 passed) |
| `npm run audit:pages` | PASS (exit 0; 5598 entities, 9 flagged — all pre-existing); generated `docs/PAGE-AUDIT.md` reverted |
| `npm run audit:links` | PASS (exit 0; dead data 0, dead renderer 0, guard violations 0); generated `docs/LINKS-AUDIT.md` reverted |
| `npm run index:entities` | **not completed** — see below |

`npm run index:entities` builds the index through a Vite SSR module runner. Attempt 1 died with
`transport invoke timed out after 60000ms (fetchModule entityIndexBuild.ts)`; attempt 2 hung past
600 s with no output because port `24678` is held by the other parallel tasks (the same
`WebSocket server error: Port 24678 is already in use` the 186 report saw). **No index source was
touched by this task**, so `public/sourced/entity-index.json` is unchanged (5,595 records) and the
committed index remains valid. The alias plane was regenerated and verified directly.

---

## ASSUMPTIONS

- The 186 NpcName list was re-derived from `NpcName.json`; the named examples (`Count Ymir, High
  Priest`, `Pureblood Knight Ansbach`, `Night's Cavalry …`) do not all appear under the app's normal
  form (which drops `'s` differently), so I fixed the ones that are genuinely link-less and verified
  the named ones with `canonicalFactId`.
- Targets were taken from the repo's own `wiki-db/redirects.json` where it names one
  ("Demi-Human Boc → Boc the Seamster", "Asimi, Eternal King → Asimi, Silver Tear", "Pureblood Knight
  Ansbach → Sir Ansbach", "Count Ymir, High Priest → Count Ymir"). For the two characters with no
  `npc:` page I mapped to the surviving same-character record — `hunt:count-ymir-mother-of-fingers`
  (the builder itself prefixes matches to boss pages) and `enemy:sir-ansbach-npc-specimen-storehouse`.
  These two are the least certain decisions and are flagged here.
- `Siofra River Well` → existing `region:siofra-river` instead of minting `region:siofra-river-well`
  (which would need `src/data/game-place-regions.json` + an index rebuild — files/code outside this
  task's ownership). The Ainsel precedent (`region:ainsel-river-well`) suggests a dedicated region
  would also be valid.
- The DLC Ash of War fix lives in `gen-aliases.mjs` (owned) rather than ~16 hand entries, so future
  DLC rows fold automatically; the attachment still goes through the existing unambiguous-name guard.
- WeaponName affinity-only and the four accent/cut misses are documented gaps: the report item allows
  "add aliases **or** document the intentional gap" and mapping an alternate-affinity spelling or a
  wrong weapon (Pulley Crossbow → "Pulley Bow") would be less honest than leaving it.
- `region == "Shadow of the Erdtree"`, coords, merchant/grace emptiness and the other batches are
  other tasks' scope and were not touched.

## Not done

- `npm run index:entities` did not complete (environmental; Vite runner + port 24678 held by parallel
  tasks). No index source changed, so nothing is stale.
- No docs outside the owned files were changed (the gap documentation lives in this report and in the
  test allow-lists).

## Checklist

- [x] 10. WeaponName / ArtsName / GemName unresolved — 16 DLC Ash of War aliases added via the
      generator (GemName 25 → 9); WeaponName 28 and ArtsName 134 documented as intentional gaps and
      locked by a test that proves no target record exists.
- [x] 11. NpcName regressions — `Asimi, Eternal King`, `Count Ymir, High Priest`, `Demi-Human Boc`,
      `Pureblood Knight Ansbach` aliased; `Night's Cavalry (Glaive/Flail)` verified; the two
      target-less placeholders documented.
- [x] 12. `Siofra River Well` aliased to `region:siofra-river` (PlaceName unresolved 1 → 0).
- [x] Tests for each item (`src/lib/nameTableResolution.test.ts`, 7 tests) plus `npx tsc -b`.
- [x] Edits kept inside the owned files (`scripts/gen-aliases.mjs`, `src/data/game-name-aliases.json`)
      plus the regenerated planes and one new test; small, local diffs.
- [x] Full gates run once at the end (vitest 222/1590/11/0, lint exit 0, build PASS, test:bundle 7,
      audit:pages & audit:links exit 0); `index:entities` blocked environmentally, documented above.
- [x] Report written with before/after numbers, examples, assumptions and the not-done list.

ALL ITEMS DONE
