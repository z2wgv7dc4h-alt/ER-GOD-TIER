# Task 19 — Gideon: real boss-resist detours, real 100% checklist

## Context

Repo root is `artifacts/all-knowing/`. Read `ARCHITECTURE.md`'s "AI" section and
`HANDOFF-CLAUDE.md`'s P1 "Gideon / planner" items 16 and 17 specifically:

> 16. Detours use level only loosely — use Armory boss resists when "stuck".
> 17. 100% spine is Medusa chapter titles, not a real checklist.

Read `src/lib/gideon.ts` in full — it's a deterministic regex-pattern router (`askGideon`), not
an LLM. That's intentional per `ARCHITECTURE.md` ("Replace the router later; do not replace the
act") — **this task does not add an LLM**, it improves two specific response handlers within the
existing deterministic router. A separate, larger task covers the eventual LLM upgrade; don't
attempt that here.

## Part A — real boss-resist detours (the "stuck" handler, gideon.ts ~line 184)

Today, asking Gideon for help against a boss/hunt returns generic advice regardless of the
target: *"summon, swap to strike/slash/pierce you have not tried, or leave and come back."* This
part **depends on Task 17** (erdb `NpcParam` extraction) having landed first — if it hasn't, stop
and report rather than guessing resistance numbers; per this project's rules, never invent
combat data.

- Once Task 17's boss absorb/resistance data exists, look it up for the matched
  `hunt`/`named` target in the "stuck" handler and give real, specific advice: which damage
  types it's weak/resistant to, not generic "try something different."
- Keep the response format/tone consistent with the rest of `gideon.ts` (short, direct, offers a
  build-sheet action) — don't turn this into a paragraph of stats dumped on the player.

## Part B — real 100% completion checklist (the "100%" handler, gideon.ts ~line 196)

Today this just walks through `medusaChapters` and narrates the next chapter's title and goal —
it has no connection to the player's actual completion state (facts/evidence on their
`Character`). Build a real spine: for each of the tracked categories (bosses, graces, items,
quests — whatever `Character`'s fact lists cover), compute actual done/remaining counts and
surface genuine next-actionable items, not just a chapter narration.

- Keep `medusaChapters` as the *structural* backbone (its ordering reflects a sensible
  playthrough sequence) but layer real completion percentages and concrete next-fact
  suggestions on top, pulling from `src/lib/infer.ts`'s `summarize()` (already used elsewhere per
  Task 06) or similar existing completion-counting logic — don't build a second, parallel
  progress-counting system if one already exists.
- If Task 18 (catalog completeness — more bosses/items/quests) has landed by the time you do
  this, the checklist will naturally be more complete; if it hasn't, work with whatever's in
  `catalog.ts` at the time, don't block on it.

## Explicit exclusions

- No LLM integration — stays within the existing deterministic router pattern.
- Don't touch the other `askGideon` intent handlers (builds, warps, shops, missables, etc.) —
  scoped to just the "stuck" and "100%" handlers.
- If Task 17 hasn't landed when you start Part A, do Part B only and report that Part A is
  blocked — don't fabricate resistance data to unblock yourself.

## Acceptance criteria

- Part A: asking about a specific named boss/hunt returns advice referencing its actual real
  resistances (verify with 2-3 examples, e.g. a boss resistant to Bleed should get different
  advice than one weak to it).
- Part B: the "100%" response reflects the character's actual tracked completion state, not just
  a chapter title walk-through — verify by toggling some facts on a test character and confirming
  the response changes accordingly.
- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Final report: whether Part A was blocked on Task 17, and what completion-counting logic Part B
  ended up reusing vs. building fresh.
