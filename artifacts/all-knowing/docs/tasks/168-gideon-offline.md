# Task 168 — Offline Gideon: fix the measured failures (target ≥ 75% correct)

Follow AGENTS.md (completion contract applies). EXCEPTION: this task may edit Gideon's offline answering
code (`src/lib/gideon.ts` router, `src/lib/gideonWiki*`, search/intent helpers) — keep the online/DeepSeek
path behaviour and Task 153's token limits unchanged.

Baseline (`npm run eval:gideon`, `docs/GIDEON-EVAL.md`): 40.4% correct, 20.4% partial, 33.9% wrong.
Causes: entity not recognised 136, answer buried 112, wiki snippet irrelevant 56, overconfident on
unanswerable 40, data missing 30; build-hunt fallback ("Rivers of Blood — still missing 6…") fires on
generic questions.

1. **Clean the question set first** (`src/data/gideon-eval/questions.json`): some real posts are not
   questions for Gideon (co-op/summon requests "help me with Godskin duo", trades "anyone have a spare
   partisan"), and some labels are wrong. Mark those `answerable: false` with type `out-of-scope`
   (Gideon should say what he can do instead, e.g. point to the boss page/strategy), fix wrong labels.
   List every change in the report. Do not make questions easier to inflate the score.
2. **Entity recognition:** use the full alias plane + player nicknames + word-start matching
   (`src/lib/nameMatch.ts`) to find the subject; prefer the longest/most specific match; handle
   possessives, plurals, typos (edit distance ≤ 2 for names ≥ 6 chars).
3. **Intent → facet:** map each of the ~25 intents to the record fields that answer it (where-is →
   location/region/coords + Show on map; how-to-get → acquisition/sources (`src/map/itemSources.ts`);
   drops → drops with %; how-to-beat → weaknesses/strategy/phases; level → region level band; npc-quest →
   quest step; compare → both records' key stats). Lead with the asked facet in one sentence, then 2–3
   supporting lines and links.
4. **Kill wrong fallbacks:** the build-hunt branch only for build questions; when unsure, say so and
   offer the closest 2–3 pages instead of a confident wrong answer.
5. **Wiki fallback:** rank passages by overlap with subject + intent words; never answer from a passage
   that doesn't mention the subject.
6. Re-run `npm run eval:gideon` after each step; report before/after per intent. No per-question hacks.
Gates at the end once: full `npx vitest run`, `npm run lint`, `npm run build`, `npm run test:bundle`.
