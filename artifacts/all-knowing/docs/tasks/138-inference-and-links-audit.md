# Task 138 — Inference + links audit: measure, then close the gaps

Read `docs/DATA-CATALOG.md`, `docs/ARCHITECTURE.md`, `docs/USAGE-MODEL.md` first. Measure BEFORE changing anything;
report before/after for every metric. Commit after each section.

## 1. Real-player scenario fixture (the user's own character)
Create `src/lib/__fixtures__/scenarios/urmummytoilet.ts` from `src/lib/__fixtures__/ps5/ground-truth.json` (+ the
photos' visible content): Lv 87, base stats 59/14/22/16/18/9/15/13, runes 45,381, Radagon's Soreseal + Green Turtle
+ two other talismans equipped, Blood Reed Great Katana +14 (Lion's Claw), revealed map regions (Limgrave, Weeping
Peninsula, Liurnia, Caelid, Dragonbarrow, Altus, Leyndell, Mountaintops partial, Ainsel/Siofra underground),
Remembrance of the Starscourge held, 5 remembrances held total, Holy-Shrouding Cracked Tear. Only what the evidence
shows — mark uncertain items as such.

## 2. Inference audit (`scripts/inference-audit.mjs`, `npm run audit:inference`)
- Enumerate every inference rule (`infer.ts`, `inference.ts`, catalog `implies`, gates, storylines, setup-wizard
  rules, capture rules): id, trigger, conclusions, source → generated `docs/INFERENCE-RULES.md`.
- Run the scenario through the full pipeline: list every inferred fact with its reason chain, and every conclusion a
  knowledgeable player would draw that the app does NOT (e.g. Radahn dead ⇒ festival done, Nokron reachable;
  Mountaintops entered ⇒ Morgott defeated + Rold Medallion; Leyndell graces ⇒ Leyndell reached; Siofra graces ⇒
  Siofra well used; Ainsel graces ⇒ Ainsel accessed; remembrances ⇒ bosses dead; stat-boost talisman owned ⇒ its
  source reached; level + regions ⇒ main-path bosses likely beaten). Classify each: **certain** vs **likely**.
- Implement missing **certain** rules as data-driven rules with tests; **likely** ones as suggestions surfaced in
  Setup › Review and Journey › Now ("You've probably beaten Godrick — confirm? [Yes] [No]"), never silently applied.
- Guard: a test runs the scenario and asserts the inferred set ⊇ an expected list.

## 3. Links audit (`scripts/links-audit.mjs`, `npm run audit:links`)
- **Dead links**: every EntityLink/openEntity id in data and renderers resolves to an entity record. Count + fix.
- **Unlinked mentions**: scan player-visible text (entity descriptions, wiki sections, Gideon deterministic answers,
  quest steps, Area hub, advisor reasons) for known entity names not linked (use `glossary.autolink`). Count per
  surface; make renderers link them.
- **Edge coverage per kind**: bosses with drops + location; items with foundIn/soldBy/droppedBy; NPCs with quest +
  location; graces with region; locations with contained bosses/graces/items; quest steps with NPC + location;
  remembrances with boss + Enia trades. Fill gaps from catalog sources — never invent.
- Guards: dead links = 0; edge-coverage minimums per kind at the achieved level (≥ 90% where the data allows).

## 4. Surface it
- Entity page "My status" strip shows the inference reason ("Defeated — you hold Remembrance of the Starscourge").
- Journey › Now shows the top 3 "probably done — confirm?" suggestions.

Report: rule count; scenario inferred before/after with the missing-certain and likely lists; dead links before/after;
unlinked mentions before/after per surface; edge coverage before/after.
