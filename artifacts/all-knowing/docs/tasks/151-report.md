# Task 151 report — replace generated filler descriptions with real text

Branch `task-150` (worktree `task-149`). Rebuilt `public/sourced/entity-index.json` with
`npm run index:entities`, then `npx tsc -b` and the full `npx vitest run`. Claude runs the
lint/build/test:bundle/audit gates once after merging.

## What produced the filler

| Sentence | Producer | Fix |
| --- | --- | --- |
| `X is a hostile creature encountered in <places>. It has HP …` | `entityIndexBuild.ts` → `fillEnemyDescriptions()` (Task 132 §4) | Function and its call deleted. The facts it carried (location, HP, status resist) already show as `location`/`stats`, so nothing is lost in prose. |
| `X is a location in <Region>.` / `X is a location within the Realm of Shadow in Shadow of the Erdtree.` | wiki-db `location.json`/`dungeon.json` lead (`first_para`) copied by `enrichFromWiki`, and the same Summary sentence via `wikiLead` | A new `PLACE_DEFINITIONAL` guard rejects the category/placement definition in `usableWikiDescription`, `acceptableLeadSentence` and a place-only strip pass. The page's real `Overview`/`Background` sentence is then used. |
| `Offer to Twin Maiden Husks for new item access` | `fmgDescription()` returned the FMG `info` effect line before the `GoodsCaption` flavour text | `fmgDescription` now prefers the game caption for `goods`; the old `info` line is kept as `stats.Effect`. Every bell bearing/cookbook/material/remembrance now carries its unique in-game prose. |

All source text is on disk (wiki-db, `wiki-sections.json` = the DB `pages`/`sections` lead,
FanAPI `checklists/creatures.json`, Fextralife, FMG captions). No text was authored.

## Before → after

| Metric | Before | After |
| --- | --- | --- |
| `is a hostile creature encountered` | 587 | 0 |
| `is a location in [A-Z]` | 5 | 0 |
| `is a location` (case-insensitive) | 71 | 0 |
| `…is a location within the Realm of Shadow…` | 63 | 0 |
| `for new item access` | 63 | 0 |
| enemies with a real description (≥20 chars, not the name) | 20 | 553 |
| enemies left empty (real text absent) | 0 | 53 |
| normalised descriptions shared by >25 records | 8 families | 2 families (both game text, allow-listed) |

Shared families that remain and are explicitly allow-listed in `auditFixes.test.ts`:
`grants affinities and skills to an armament` (Ash of War caption, 87) and
`locks the player character in place during the animation.` (gesture animation label, 27).

## 5 examples

1. `enemy:abductor-virgin` — `Abductor Virgin is a hostile creature encountered in Abyssal Woods…` → `Abductor Virgins are automatons affiliated with the Volcano Manor.`
2. `enemy:aging-untouchable` — `Aging Untouchable is a hostile creature encountered in Abyssal Woods. It has HP 4,400.` → *(empty — the wiki page only has a category line)*
3. `grace:69514500` (Cathedral of Manus Metyr) — `The Cathedral of Manus Metyr is a location in Shadow of the Erdtree…` → `The Cathedral of Manus Metyr is the current location of the finger-weaver and high priest Count Ymir and his companion…`
4. `region:writheblood-ruins` — `Writheblood Ruins is a location in Elden Ring, located on the Altus Plateau.` → `A set of ruins in northern Altus Plateau, overrun by creatures infected by cursed blood.`
5. `item:abandoned-merchant-s-bell-bearing` — `Offer to Twin Maiden Husks for new item access` → `Bell bearing of a merchant left behind, found upon his perished flesh. Offer to the Twin Maiden Husks at the Roundtable Hold to gain access to new items.`

## Files touched

- `src/lib/entityIndexBuild.ts` — delete `fillEnemyDescriptions`; `PLACE_DEFINITIONAL` +
  `stripDefinitionalSentences`; `usableWikiDescription`/`acceptableLeadSentence` reject
  definitions; `fmgDescription` prefers the goods caption and keeps `info` as `Effect`;
  skip FMG goods `+N` rows so the alias plane cannot rename the base page; `foldUpgrades`
  builds spirit-ash/flask levels from the FMG goods plane; FanAPI creature description
  fallback; `grace` added to the fillable kinds.
- `src/lib/entityCoverage.ts` — enemy `description + location` floor 95% → 90% (see ASSUMPTIONS).
- `src/lib/auditFixes.test.ts` — Task 151 §3 guards.
- `public/sourced/entity-index.json` — regenerated.

## Gates

- `npm run index:entities`: 5685 records, 0 matches for all three patterns.
- `npx tsc -b`: clean.
- `npx vitest run`: **198 files passed, 1414 tests passed, 11 skipped** (no failures).

## ASSUMPTIONS

1. **Enemy coverage floor lowered 95% → 90%.** The task says "Else leave empty". 53 enemies
   (Goat, Catapult, Watling Stars, generic slugs, phase/variant rows such as
   `Maliketh (Farum Azula)`) have no wiki page or FanAPI/Fextralife prose at all, so honest
   coverage is 553/607 (91.1%). Keeping 95% would require the very filler Task 151 removes.
   `entityIndexQuality.test.ts` already only required ≥90%.
2. **The 2 remaining shared families are legitimate game text.** `grants affinities and skills
   to an armament` is the in-game Ash of War caption; `locks the player character in place
   during the animation.` is the gesture animation label. Both are listed by name in the test.
   The wiki's DLC placement template is *not* treated as a caption and is removed.
3. **`wiki-sections.json`/`wiki-db/*.json` are the committed form of the er-mcp.db `pages`
   lead paragraph** (they are exported from it by `scripts/export-wiki-db.py`); the build reads
   them directly rather than opening the gitignored SQLite file, which is absent in a fresh
   checkout.
4. **Goods captions own the item prose; the effect line moves to `stats.Effect`.** This is the
   only way the 63 bell bearings (and the other repeated FMG effect lines) get real unique text
   without dropping their effect fact.
5. **The alias plane already resolves an upgrade `+N` id to its base page**, which stopped the
   `+N` spirit-ash/flask rows from being seeded and silently emptied every `upgradeLevels`
   table. Rebuilding the levels from the FMG goods plane restores the 85 upgrade tables the
   committed index had (a latent Task 150 regression, surfaced by regenerating in Task 151).
