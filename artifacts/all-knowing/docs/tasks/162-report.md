# Task 162 report — Offline Gideon: question set + scoring harness (measure only)

Branch `task-162`. Measurement only: **no** file under `src/lib/gideon*.ts` was changed.

## What changed

| | before | after |
| --- | --- | --- |
| Question set | none | `src/data/gideon-eval/questions.json` — 300 questions, 25 intents × 12, **209 real** from the Task 163 corpus, 20 unanswerable, each with a data-derived `expected` block |
| Question generator | none | `scripts/build-gideon-eval.mjs` (`npm run build:eval`) — deterministic, regenerates the set from `player-questions.json` + `entity-index.json` + `aliases.json` + `region-levels.json` |
| Harness | none | `scripts/gideon-eval.mjs` (`npm run eval:gideon`) — runs `askGideon` offline for an empty and a mid-game character, scores, records latency, writes the doc |
| Report | none | `docs/GIDEON-EVAL.md` (generated) |

No generated file was hand-edited; `questions.json` and `GIDEON-EVAL.md` both come from the scripts above.

## Headline score (offline, no API key)

**226 / 560 answerable runs correct (40.4%)** — 114 partial (20.4%), 190 wrong (33.9%), 30 no-answer (5.4%).
Unanswerable: **0 / 40 honest, 40 made up (100%)** — Gideon never declines, it answers anyway.
Latency: median 3 ms, p95 30 ms. Empty and mid-game characters score almost identically (empty 102, mid 100 correct of 280 each), so the deterministic path barely uses character state on these questions.

## Top failure causes (of 398 misses)

1. **entity-not-recognised — 136 (34%)**: the question's subject was never mentioned; the router keyed on the wrong entity or fell through to an unrelated build/hunt branch.
2. **answer-buried — 112 (28%)**: the subject was recognised but the asked facet (location, drop, level band) was missing.
3. **wiki-snippet-irrelevant — 56 (14%)**: an answer came from the wiki corpus but did not match the question.
4. **overconfident — 40 (10%)**: an unanswerable question (co-op request, bug/glitch, trade) was answered as if answerable.
5. **data-missing — 30 (8%)**, plus 24 smaller/no-cause misses. A recurring specific bug is the build-hunt fallback returning “Rivers of Blood — still missing 6…” for generic questions.

## 5 example rows from the set

| id | type | question (real corpus text) | expected |
| --- | --- | --- | --- |
| q055 | where-is | “- Need help at West Capital Rampart - Mini Boss - Location at Grace” | `grace:110005`; must mention “Leyndell, Royal Capital” |
| q133 | build-advice | “. what would be the best bleed build?” | `mechanic:status-bleed` |
| q145 | how-to-beat | “: Does anyone know any tips to beat Devonia in NG+5?” | `boss:crucible-knight-devonia`; “Ancient Ruins of Rauh” |
| q157 | level | “( )Am I ready for Raya Lucaria?” | `region:academy-of-raya-lucaria`; “Academy of Raya Lucaria” |
| q181 | mechanics | “How exactly does hyperarmor interact with stance damage?” | `mechanic:hyperarmor` |
| q229 | co-op | “Can someone plz help me with Godfrey?” | unanswerable (co-op matchmaking) |

(Six rows shown; five answerable + the co-op unanswerable sample.)

## Checks run

- `npx tsc -b` → exit 0.
- `npm run eval:gideon` → run once, wrote `docs/GIDEON-EVAL.md`.
- `npm run build:eval` → deterministic (identical SHA-256 on a second run).
- Full gates not run: the brief says none are needed.

## ASSUMPTIONS

- **“~25 types, 12+ each”** read as exactly 25 intents × 12 = 300 (min 12 × 25 already equals 300, so no per-type room to weight above 12).
- **Corpus labels are noisy** (“other” 2337, co-op/help requests everywhere). Real questions are therefore re-classified by intent regex, with a second, looser corpus pass per intent to reach the ≥200-real floor. Both are still real corpus text. 209 real, 91 synthetic (templated from entity-index records for the location/requirements/how-to-use intents the corpus barely covers).
- **`expected` is data-only**: ids are the Task 163 resolved entity ids that exist in `entity-index.json`; `mustInclude` is read from the record (`drops`, `stats.Requirements`, `stats.Skill`, `region`) or from proper names found in the record's `location` text. No game text is written by hand.
- **Mention matching** resolves each id to its surface names (entity-index `name`, slug tail, aliases JSON `fmgName`/`aliases`) and does a normalised substring test; `factId`/`links`/`offer.factId` also count.
- **Scoring**: `correct` = all ids mentioned **and** all mustInclude present; `partial` = some; `noAnswer` = a decline/fallback prompt; `wrong` = a confident answer with no expected fact. Unanswerable = `honest` if the answer contains a hedge/decline phrase, else `madeUp`.
- **Unanswerable quota ~20** is enforced; the 20 are co-op matchmaking, bug/glitch and a couple of out-of-scope navigation questions.
- **Offline enforcement**: Vite SSR with `envDir` pointed at an empty temp dir and `VITE_GIDEON_API_KEY` deleted; global `fetch` is stubbed to read `/sourced/**` from disk. The harness aborts if a key is somehow present. `.env`/`.env.local` were never read.
- **Environment fix (not committed)**: the worktree's `node_modules` junction pointed at a malformed `C:\C:\Users\…` target, so Vite/Vitest could not resolve; I recreated the junction. This is what stopped the previous run immediately.
- `AGENTS.md` shows as modified in `git status`; it was not edited by me and is left unstaged.

## Not done

- No full gate suite (`npm run lint`, `test`, `build`, audits) — the brief explicitly says not needed.
- No change to Gideon answering logic (out of scope by design).

## Checklist

- [x] §1 `src/data/gideon-eval/questions.json`: 300 questions, 25 intents × 12, 209 real (≥200), 20 unanswerable, every `expected` derived from disk data.
- [x] §2 `scripts/gideon-eval.mjs` + `npm run eval:gideon`, running offline `askGideon` for empty + mid-game characters, scoring correct/partial/wrong/noAnswer and honest/madeUp, recording latency.
- [x] §3 `docs/GIDEON-EVAL.md` generated: overall %, per intent, per character, 30 worst misses, failure causes with counts.
- [x] §4 `eval:gideon` added to `package.json`; `npx tsc -b` (exit 0) and the harness run once; committed; this report with headline, top causes, ASSUMPTIONS and example rows.

ALL ITEMS DONE
