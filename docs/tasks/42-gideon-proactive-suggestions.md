# Task 42 — Gideon proactive suggestions + search auto-populate

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md`,
`src/lib/gideon.ts`, `src/QoL.tsx` (command palette / `CommandHits`), and `src/lib/search.ts`
first. Right now Gideon only reacts to a submitted question, and the search bar only returns
results once the user has typed 2+ characters and hits enter/reads the dropdown — nothing is
suggested proactively. The user's own words: "Maybe it should auto populate based on your search
etc or suggest things to do also." This app already has the real data to do this
(`stillAvailable()`, `nextMoves()`, `leftovers()`, `searchSync`) — this task wires it into a
proactive UX, not new data.

Task 25/35/40 already deepened the router significantly (comprehensive questline coverage,
multi-id completion, OP/PvP builds) — read those commits (`git log` for "Task 25"/"Task 35") to
see the current shape of `askGideonRouter`/`GideonAct` before extending it.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

1. Gideon should show 2-3 real, contextual suggested next actions when idle (no question typed
   yet, or right after answering one) — derived from `stillAvailable()`/`nextMoves()`, not
   generic placeholder text.
2. The search/command palette should show live suggestions as the user types (debounced,
   starting from 1-2 characters for exact prefix matches, current 2-char minimum is fine to keep
   for substring matches) rather than requiring a full submit.

## Requirements

- Suggestions must come from real character state (`stillAvailable`, `nextMoves`, `leftovers`) —
  no generic "try asking about X" filler text.
- Each suggestion should be a real, clickable chip/button that either asks the underlying question
  through the existing `askGideon`/`run()` flow or navigates directly (reuse the existing `offer`
  mechanism in `GideonAct` if it fits, don't invent a parallel suggestion-rendering path).
- Live search-as-you-type: reuse `searchSync`/`groupHits` (Task 32's grouping) as-is — this is a
  UI/timing change (debounce + render-on-type), not a new matching algorithm.
- Keep suggestions cheap to compute — they must not block typing or re-render on every keystroke
  in a way that causes visible lag. Debounce appropriately (~150-200ms is reasonable).
- Don't make suggestions intrusive — idle suggestions should be a small, dismissible/collapsible
  section, not a modal or something that steals focus.

## Explicit exclusions

- Don't touch OCR, save parser, or the map engine.
- Don't change `askGideonRouter`'s actual answer logic — this task is about proactive/live
  presentation of data that already exists, not new router branches.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: idle suggestions reflect real `stillAvailable()`/`nextMoves()` output for a given
  character; live search returns real `searchSync` results as text is typed.
- `npm run dev`: demonstrate idle suggestions appearing with a real character, and live search
  results updating as you type before hitting enter.
