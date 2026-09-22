# Task 25 — Make the deterministic Gideon router actually helpful, not just wired

**Scope note from the user, verbatim intent: Gideon should become "a master of all knowledge,"
know "absolutely everything," and handle "all interactions, answers about quests etc." This app
is literally named All-Knowing — comprehensive quest/NPC coverage is the core differentiator, not
a nice-to-have. Do not artificially cap this to a handful of NPCs. Cover as many of the game's
major questlines as you can reasonably get through in real, author-encoded depth (the same way
Task 12 went from 8 lines/24 steps to 87 real steps with lockout edges) in the time you have. If
you run out of runway, get as far as you can, commit what's real and tested, and list exactly
what's left undone in your report — a wide, accurate pass that stops honestly beats a narrow one
padded with guesses.**

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first, plus
`src/lib/gideon.ts` in full (478 lines) — it's the real, working, rule-based router that answers
every Gideon question **before** any LLM call is even attempted (`askGideonRouter`, called
directly when there's no `VITE_DEEPSEEK_API_KEY`, and as the fallback when there is one but the
call fails/times out/gets rejected by the hallucination guard). Right now this repo has no
DeepSeek key configured at all, so **this router is the entire user-facing "AI" experience** —
making it better has an immediate, direct payoff independent of whether an LLM key ever gets
added.

The router already does real work: ending-route planning (`speakPlan`), a mid-run survey
(`stillAvailable`), build recommendations, boss-resist "stuck" advice backed by Task 17's real
`NpcParam` data, a 100%-completion spine, field-hunt lookups, merchant/shop lookups
(`findSellers`), missables, scadutree fragments, loot, warps, and a generic catalog/search
fallback. What it does **not** do, read directly from the code:

- Line 323–325: any question mentioning a major questline NPC (Ranni, Seluvis, Alexander, Boc,
  Leda, Millicent) that isn't already a recognized "ending line" (`findLine`) gets a placeholder
  non-answer: `'Quest graph. If this is for an ending, say the ending name...'`. It never actually
  answers "what does Ranni want next" the way it answers a boss-resist or a loot question.
- Task 23 (just landed) generated a real `aliases.json` across every fact category (grace, boss,
  invader, item, quest, region) with `matchGeneratedAliases()` / `searchSync`'s new `alias`
  source — but `gideon.ts` doesn't call any of that; it still only recognizes entities through
  the older, narrower matchers (`matchMany`, `matchLoot`, `findBossPin`, `findLine`, `findSellers`,
  `fieldHunts`). Check whether wiring the generated alias plane into the router's matching widens
  what it can recognize by name.
- No rememberance-shop (Enia) table — `HANDOFF-CLAUDE.md` §7 names this as a valid, not-yet-built
  product idea.
- No "is X better than Y" / comparison handling at all — every question routes to a single best
  guess, never a real comparison between two named things.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Make the deterministic router noticeably more capable at answering real player questions, using
data this repo already has (or can reasonably add as author-encoded knowledge, the same way
Task 12's quest DAG edges were author-encoded from game knowledge, not extracted from
`regulation.bin`) — not by stubbing in fake answers.

## Requirements

- **NPC questline steps, comprehensively**: give the router real step-by-step guidance for the
  game's major companion questlines — the same shape as `speakPlan`'s ending-route output — reuse
  the existing `PlanStep`/`requires`/`grants`/`lockouts` machinery from `src/knowledge/endings.ts`
  (Task 12's work) rather than inventing a second format. If a questline isn't already represented
  as a `Line` in `storylines.ts`/`endings.ts`, add it there (author-encoded from real game
  knowledge, same standard as Task 12's original edges) so the whole system — router, quest graph
  UI, lockout tracking — benefits, not just Gideon's chat replies. Aim to cover the base game's
  and Shadow of the Erdtree's major companion arcs — Ranni, Seluvis, Alexander/Nepheli/Kenneth,
  Boc, Millicent, Dung Eater, Fia, Rogier, Rya/Volcano Manor, Tanith, Hyetta/Yura, Gowry/Gurranq,
  D/Fia, Latenna, Sellen/the Carian scholars, Corhyn/Goldmask, plus the DLC's Freyja, Igon,
  Thiollier, Ansbach, St. Trina thread, and any others you find well-documented enough to encode
  accurately — is a reasonable target list, not a hard requirement to hit every one. Prioritize
  getting each one *right* (real requires/grants/lockouts, not vibes) over rushing all of them.
- **Wire the generated alias plane**: check whether adding `matchGeneratedAliases()` /
  `generatedAliasStatus()` to the router's entity-matching chain (alongside or ahead of the
  existing matchers) lets it recognize more names correctly. Demonstrate at least 3 real questions
  that fail to match today (name not recognized, falls through to the generic search or the "say
  an ending, a grace, a boss" catch-all) and succeed after the change.
- **Enia rememberance shop**: add a real table (spirit ashes ↔ remembrance items, per the actual
  game) and wire a router branch for "what can I get from Enia" / "what does the Radahn
  remembrance give" style questions.
- **Basic comparison handling**: at least one real case — e.g. "is bleed better than sorcery for
  X boss" using the existing boss-resist data, or "should I use build A or build B" using
  `opBuilds` — that actually compares two named things instead of picking one arbitrarily.
- Every new branch needs the same shape of output as the existing ones (`GideonAct`: `say`,
  `module`, `factId`, `offer`, `goal`, `navigateNow` as appropriate) — don't invent a parallel
  response format.

## Explicit exclusions

- Don't touch `deepseek.ts`, `gideonLlm.ts`, or anything about the LLM path itself — this task is
  entirely about the deterministic router that runs with or without a key.
- Don't touch OCR, the save parser, or the map engine.
- Depth over breadth when they trade off: a questline with real, correct requires/grants/lockouts
  beats three questlines with guessed edges. Don't fabricate steps to inflate the count.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: at least one real question → real answer for each new capability (NPC questline
  step, alias-widened match, Enia lookup, a comparison case) — assert on the actual `GideonAct`
  returned, not just "doesn't throw."
- `isFastLookup()`'s heuristic (the router-vs-LLM cost gate) may need updating if new question
  shapes should be treated as fast lookups — check whether it needs a change, and say so either
  way in your report.
- Report before/after: how many previously-unanswerable question patterns now get a real answer,
  with concrete before/after examples (question text → old response vs new response).
