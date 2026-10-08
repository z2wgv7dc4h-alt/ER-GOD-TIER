# Task 166 report — UX fixes 11, 13–20 + confident cheap-PS5 inferences

Branch `task-166`. Build tasks **11, 13, 14, 15, 16, 17, 18, 19, 20** from
`docs/tasks/161-proposal.md` §7, plus the confident items of the §6 "New cheap-PS5
inferences". Every change is presentation/inference only; no build record, build
data or Gideon code was touched, and the owner's builds were not changed or relabelled.

Gates at the end (once): full `npx vitest run`, `npm run lint`, `npm run build`,
`npm run test:bundle`, `npm run audit:pages` — see **Final checks**. Generated docs
`docs/INFERENCE-RULES.md` and `docs/PAGE-AUDIT.md` were regenerated, never hand-edited.

---

## Task 11 — stop mis-typing guide/secret/recipe/wiki entities

**Changed** `src/lib/entityGraph.ts` (`prefixKind`), `src/library/EntityPanel.tsx`
(`CATEGORY_KIND`).

- `prefixKind` now maps `guide:`, `secret:`, `recipe:` and `wiki:` ids to the
  reference kind `mechanic` instead of falling through to `item`. `CATEGORY_KIND`
  maps the Library's `guides`/`secrets`/`recipes` categories the same way, so the
  category-driven path (browser panel) matches the id-driven path (overlay).
- Because `mechanic` is not in `OWNABLE`/`OWNED_KINDS`, the page renders
  *"How it works — Reference, nothing to track"* and the footer has **no
  "Mark owned"** button. A Fextralife guide no longer claims you own it.
- **Phone user sees:** opening a guide/secret/wiki page shows a reference status
  line instead of a green "Owned ✓" badge and an Owned/Not-owned toggle.
- Tests: `src/library/pageModel.test.ts` (new) asserts the four prefixes resolve to
  a non-ownable kind and `trackActionLabel` returns `null`.

## Task 13 — standing "What we inferred" card

**Changed** `src/shell/JourneyNow.tsx`; reuses `inferenceReasons()` /
`removeInferredFact()` from `src/lib/setupWizard.ts`.

- Journey › Now's secondary "More" section gains a **"What we inferred"** card that
  lists every inferred fact with the reason chain Setup › Review shows, each with a
  **remove** button. It only renders when there is something to show, so the first
  paint is unchanged.
- **Phone user sees:** scrolled one screen past the goal, a plain list such as
  *"Godrick the Grafted — Godrick's Great Rune requires Godrick the Grafted"* with a
  remove control, instead of the reasons being buried inside Setup › Review.
- This is also where inference items #4 (grace → region/path) and #5 ("I beat X" →
  what it opens) become visible: both are already computed by `closeWorld`, and their
  derived regions/quests now show in this card with a reason.

## Task 14 — retract changed interview seeds

**Changed** `src/lib/infer.ts` (`applyAnswers` now calls a new private
`retractInterviewSeeds`).

- Before seeding, the old interview pass is undone: evidence tagged `interview`
  (source `answer`) and its inferred closure (`implied by interview`) are dropped.
  The world is then re-closed from every remaining direct fact, so a fact a *photo*
  still proves survives, while a fact only the changed answer proved is removed from
  the lists. This covers the progress answer, last-grace, class/pack weapon and the
  shardbearer multi-select.
- **Phone user sees:** changing "How far has the world opened?" from Altus to
  Limgrave actually removes the Altus region/boss ticks, instead of both sticking.
- Tests: `src/lib/infer.test.ts` (answer change retracts; a photographed grace keeps
  Liurnia; a removed shardbearer is dropped).

## Task 15 — split Altus → Leyndell; drop Mountaintops → Morgott

**Changed** `src/knowledge/catalog.ts`, `src/lib/infer.ts`, `src/lib/inferenceAudit.ts`.

- The interview answer is split: **"Reached Altus Plateau"** seeds `region:altus`
  only; a new **"Entered Leyndell, Royal Capital"** seeds `region:leyndell` (which
  still implies Altus). Reaching Altus no longer claims the capital.
- `region:mountaintops` no longer directly `implies boss:morgott`. (The Rold
  Medallion chain is left intact: the medallion really is only granted after
  Morgott, so `item:rold-medallion → boss:morgott` and the Mountaintops → Rold chain
  are unchanged and the real-player scenario still derives Morgott when it should.)
- **Phone user sees:** answering "Altus" no longer ticks Leyndell in Setup/progress.
- Tests: `src/lib/infer.test.ts` (Altus vs Leyndell seeds; direct edge gone).

## Task 16 — Niall no longer hands over the full Haligtree medallion

**Changed** `src/knowledge/catalog.ts`.

- `boss:commander-niall` now implies `item:haligtree-medallion-left` (the half found
  in Castle Sol he guards) instead of the full `item:haligtree-secret-medallion`.
  `boss:stray-mimic-tear`'s full-medallion edge is dropped. A lone half is inert by
  design, so neither boss marks the Haligtree reached on its own.
- **Phone user sees:** beating Niall no longer closes the Haligtree region/the secret
  path until both halves are actually held.
- Tests: `src/lib/infer.test.ts` (edges gone; a lone Niall half does not open the
  Haligtree).

## Task 17 — make "remove / not sure" sticky

**Changed** `src/lib/infer.ts` (`clearFact`), `src/lib/setupWizard.ts`.

- `clearFact` now also drops the fact's evidence rows, so a removed fact stops being
  listed by `inferenceReasons()` and is genuinely unknown.
- Setup's **remove** and boss **"not sure"** (`removeInferredFact`) use `denyFacts`,
  recording an explicit answer-authority denial. A later closure cannot silently
  re-add the fact (an inference at rank 10 loses to the answer at rank 20).
  `inferenceReasons()` now skips denied facts so they leave the review list.
- **Phone user sees:** tapping remove / "not sure" in Setup makes the row disappear
  and stay gone after the next screenshot, instead of coming back.
- Tests: `src/lib/setupWizard.test.ts` (removed fact is gone from the list and stays
  gone after a re-read).

## Task 18 — remembrance → boss chains

**Changed** `src/knowledge/inferChains.ts` (new `remembranceChains()` generated from
`src/knowledge/remembrances.ts`).

- Every remembrance with a `bossFactId` gets a `certain` chain
  `item:remembrance-* → boss:*` through the existing closer. This generalises the
  Great-Rune/catalog pattern and adds the SotE remembrances the catalog never mapped
  (Impaler→Messmer, Twin Moon Knight→Rellana, Dancing Lion, A God and a Lord→Consort,
  Lord of Frenzied Flame→Midra).
- **Phone user sees:** a remembrance read from the Tools/Inventory page now ticks its
  boss in progress/Setup, with the reason "A Remembrance of the Impaler only exists
  once Messmer the Impaler is dead".
- Tests: `src/lib/inferChains.test.ts` (every mapped remembrance has a chain;
  `item:remembrance-impaler → boss:messmer`; `…a-god-and-a-lord → boss:consort`).

## Task 19 — fix the stale `inferenceAudit` likely keys

**Changed** `src/lib/inferenceAudit.ts`; new `src/lib/inferenceAudit.test.ts`.

- The previous "likely" keys referenced catalog edges that no longer existed (the
  safety net was inert). The list now holds a real, genuinely likely-not-certain
  catalog edge: `item:dusk-medallion → region:altus` (both Dectus halves can be held
  without ever riding the lift, since Altus is also reachable up the Ruin-Strewn
  Precipice). Note updated to match.
- A test pins every likely key to a live `implies` edge and requires a note, so it
  cannot go stale silently again. `docs/INFERENCE-RULES.md` was regenerated.
- **Phone user sees:** no runtime change; the audit doc is now accurate.
- **FIX (after merge with master).** The first pass also listed
  `item:haligtree-secret-medallion → region:haligtree`, but the guard test proved
  that is **not** a catalog `implies` edge: Task 160 §12 had deliberately moved the
  conclusion to a one-way chain in `inferChains.ts` (confidence 0.8) to break the
  region↔item cycle. The catalog row is `implies: []`, so the catalog-only set
  cannot list it. That entry (and its note) was removed; the conclusion remains
  documented as a chain rule. The live `dusk-medallion` edge is the one verified
  catalog likely key.

## Task 20 — structured region equality for area "Visited"

**Changed** `src/library/pageModel.ts`; new `src/library/pageModel.test.ts`.

- The region/dungeon "Visited" inference no longer does a free-text
  `name.includes(...)` match. It resolves both sides to a canonical region fact via
  `regionFactFor` (the same map the boss roster uses) and compares ids. A known fact
  in Stormveil counts for Limgrave; a fact in another region never does.
- **Phone user sees:** a region page shows "Visited" only when you actually have
  knowledge in that region, instead of a name-substring false positive (and it now
  also catches labels that differ from the display name, e.g. Realm of Shadow =
  Gravesite Plain).
- Tests: `src/library/pageModel.test.ts` (Realm of Shadow via Gravesite Plain grace;
  Limgrave via The First Step; Liurnia does not mark Limgrave).

---

## New cheap-PS5 inferences (§6)

Implemented the confident, fact-producing rules; each runs through `applyFacts` and
shows a reason:

| # | Rule | Status |
|---|---|---|
| 3 | Remembrance in inventory → boss defeated (certain) | done as Task 18 |
| 4 | One grace / warp line → region + path (certain) | already closed by the catalog; now surfaced with its reason in the new "What we inferred" card (Task 13) |
| 5 | A single "I beat X" → "what this opens" (certain) | already closed by `closeWorld`; now surfaced as a card with the reason (Task 13) |
| 1 | Status photo → build shape (presentation only) | skipped — it only preselects PvP/Builds filters, which another agent owns; no fact is produced, so `applyFacts` does not apply |
| 2 | Highest armament upgrade → region band (**likely**, confirm-only) | skipped — the PS5 equipment path does not persist `upgrade` levels and the suggestion would drive a Builds/PvP filter; left as a documented follow-up rather than asserted |
| 6 | Fixed-source item → region (certain) | skipped — no source-uniqueness signal exists in the repo (`loot.how` is prose and the entity index is an async, enriched view); the two true fixed-source rules (Radagon's Soreseal, Green Turtle Talisman) plus every catalog `implies` edge already cover the certain cases, so no rule was invented |
| 7 | Flask/blessing photo → Scadutree / flask progress | skipped — `collectibles.ts` has no per-count tracking and no photo→count mapping; inventing one would break the "empty beats fake" rule |

## ASSUMPTIONS

- **Mountaintops → Morgott.** Removing the *direct* catalog edge is what the brief
  asked for; the transitive path `region:mountaintops → item:rold-medallion →
  boss:morgott` (authored in Task 138, and tested) was left alone because the Rold
  Medallion genuinely only exists after Morgott. The scenario guard's `boss:morgott`
  expectation therefore still passes without change.
- **Niall's half.** Pointed at `item:haligtree-medallion-left` because Niall guards
  Castle Sol, where that half sits; the Stray Mimic Tear drops no half, so its edge
  was dropped rather than guessed.
- **"remove / not sure" semantics.** Both now record an explicit denial (sticky).
  In Setup's boss yes/no/"not sure" row the chip therefore reads as "no"; this keeps
  the app honest about not claiming the boss and matches the brief's grouping of
  "remove/not sure".
- **Reference kind for guides/secrets/wikis** is `mechanic` (a prefix map) rather than
  a brand-new `EntityKind`, which the task allowed. It is a smaller, typed-safe change
  and definitely removes the "Owned" affordance.
- **`regionFactFor` mapping** is the app's existing structured region map; "Visited"
  now follows it consistently with the boss roster and area hub.
- **Generated docs.** `docs/INFERENCE-RULES.md` and `docs/PAGE-AUDIT.md` were
  regenerated by their scripts, not edited.
- Did **not** run `npm run index:entities`: no source data or generator changed.

## Skipped / not done

- Inference items **1, 2, 6, 7** and the non-confident parts of §6 — reasons in the
  table above.
- Tasks 1–10, 12, 21, 22 from §7 are owned by the other agents named in the brief and
  were not touched (except `JourneyNow.tsx`, which the brief explicitly assigns to
  Task 13).

## Final checks

All gates were run once, after merging master and applying the gate FIX (branch
`task-166`).

- `npx vitest run` — **215 files, 1518 passed, 11 skipped** (up from 214/1512/11
  after the master merge added tests; no test was loosened or deleted).
- `src/lib/inferenceAudit.test.ts` — 3 passed (the FIX target).
- `npx tsc -b` — clean.
- `npm run lint` (`oxlint`) — exit 0 (warnings only, pre-existing).
- `npm run build` — built successfully (via `npm run test:bundle`).
- `npm run test:bundle` — 7 passed.
- `npm run audit:pages` — written, 5630 entities, 0 flagged.
- `npm run audit:inference` — regenerated `docs/INFERENCE-RULES.md`, 581 rules,
  17 scenario facts.

Note: `public/sourced/entity-index.json` was taken from master on the merge and
regenerated with `npm run index:entities` in commit `b9dd404`; no source data or
generator changed since, so it was not re-run here.

## Checklist

- [x] Task 11 — guide/secret/recipe/wiki entities are reference, never "Owned".
- [x] Task 13 — standing "What we inferred" card with per-row remove.
- [x] Task 14 — changed interview answers retract the old seeds.
- [x] Task 15 — Altus/ Leyndell split; Mountaintops no longer directly implies Morgott.
- [x] Task 16 — Niall points at one medallion half; Stray Mimic edge dropped.
- [x] Task 17 — remove / "not sure" is sticky and leaves the reason list.
- [x] Task 18 — remembrance → boss chains for every mapped remembrance.
- [x] Task 19 — likely keys match live catalog edges, with a guarding test.
- [x] Task 20 — area "Visited" uses structured region equality.
- [x] Confident §6 inferences 3, 4 and 5 implemented; 1, 2, 6, 7 skipped with reasons.
- [x] Tests added/adjusted for every task; commits labelled `Task 166 #N`.
- [x] Merge with master (`git merge --no-edit master`), regenerated index.
- [x] FIX — stale `item:haligtree-secret-medallion->region:haligtree` likely key
      removed (it is an authored chain, not a catalog edge; Task 160 §12); the test
      passes unmodified and `docs/INFERENCE-RULES.md` was regenerated.
- [x] Final gates run once; report written. Full `npx vitest run` passes.

(pending FIX 2)
