# Tasks 104–106 — parallel batch (independent of Task 103's files)

Task 103 is editing the shell header, `App.tsx`, `index.css`, `EntityPanel.tsx`, `Quests.tsx`, the
Gideon dock and Library loading. These tasks **must not edit those files**; they build pure modules +
self-contained components (own CSS file) and data, with tests. Wiring into the shell happens after 103
merges.

## 104 — Dungeons & area data completeness
The Area hub (Task 98) lists only Stormveil as a dungeon. Build `src/data/dungeons.json` (generator
script in `scripts/`) covering every catacomb, cave, tunnel, hero's grave, evergaol, divine tower,
ruins-with-cellar and legacy dungeon in base game + Shadow of the Erdtree, from data already in the repo
(`public/sourced/open/game-areas.json`, `place-names.json`, `map-points.json`, `boss-pins.json`,
`coords.json`, `acquisition.json`, EldenRingMap engine dungeon markers, `src/knowledge/dungeons.ts`).
Each: id, name, kind, region, map coords, boss(es) (fact ids), notable loot (fact ids), required key/
lever/imp seal count if known, DLC flag. Expose `dungeonsInRegion(region)` in `src/lib/dungeons.ts`
and make `JourneyArea.tsx` use it (the only shell file you may edit). Tests: counts per kind sanity
(e.g. ≥ 20 catacombs, ≥ 20 caves), every boss id resolves via the entity graph.

## 105 — Combat toolkit engine
`src/lib/combat.ts` (pure, tested) + `src/combat/BossPrepCard.tsx`, `DamageCalc.tsx`,
`StatusTable.tsx` with `src/combat/combat.css` (not wired):
- `bossPrep(bossId, character)` → weaknesses/resists (negations), status resist + procs needed for
  bleed/frost/poison/rot/sleep/madness at the character's best owned weapon, poise, HP, best owned
  weapon vs this boss (AR × negation), owned spirit ashes ranked (by tier table), owned buffs/talismans
  that help (tag table), recommended level (region band), summon/NPC availability if known.
- `damageVs(weaponId, upgrade, affinity, stats, targetId)` → per-damage-type breakdown after negation
  and defense.
- Reuse `ar.ts`, `weaponStats.ts`, `lib/enemy.ts`, `boss-combat.json`, `npc-combat.json`, advisor.
Tests with real Margit / Malenia / Radahn rows.

## 106 — Mechanics glossary + auto-linking
`src/knowledge/mechanics.ts`: 40+ short mechanics cards (poise, stance break, soft caps per stat,
equip load classes, flask upgrades (Golden Seeds/Sacred Tears counts), Great Rune activation (Rune
Arc), Scadutree blessing, Revered Spirit Ash, weapon affinities, status effects, hyperarmor, backstab/
riposte, guard counter, two-handing STR ×1.5, rune loss/recovery, NG+ scaling, summoning pools, etc.),
each: id `mechanic:<slug>`, title, 2–4 sentence body, key numbers, related fact ids. Register them as
entities in the entity graph (`kind: 'mechanic'`) without breaking existing tests.
`src/lib/glossary.ts`: `autolink(text)` → segments splitting on known entity names/aliases and mechanic
terms (longest-match, word-boundary, case-insensitive, max one link per term per paragraph) for
`WikiText` / Gideon answers to consume later. Tests for overlap handling and false positives
("rune" inside "runes of", "Margit" vs "Margit, the Fell Omen").
