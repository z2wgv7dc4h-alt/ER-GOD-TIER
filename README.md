# ER GOD TIER

A local-first Elden Ring companion — one shared character state driving an interactive atlas, a
real attack-rating build lab, a quest/ending planner with real lockout edges, a save-file reader,
on-device OCR for PS5 players, and Gideon: a router that answers "where is X," "what should I do
now," and "I've done X, what now" from real game data, with an optional DeepSeek LLM layer behind
it when a key is configured.

Base game + Shadow of the Erdtree + Tarnished Pack. No accounts, no server, no uploads — save
files and screenshots are parsed entirely in the browser.

## The app

The actual product lives at **[`artifacts/all-knowing/`](artifacts/all-knowing/)**. Its own
`HANDOFF-CLAUDE.md` is the live source of truth for what's built, what's still open, and how the
pieces fit together — start there, not here. `ARCHITECTURE.md`, `DATA.md`, and `docs/` in that
same directory cover the fact-graph contracts, the data inventory, and per-feature notes.

```bash
cd artifacts/all-knowing
npm install
npm run dev        # http://localhost:5173
```

The live map (Atlas room) needs a real Elden Ring install and a separate engine process:

```bash
npm run map:setup  # one-time: extract tiles + markers from your local install
npm run map        # starts the live-sync map server on :8099
```

## This repo

`docs/tasks/` holds the task-brief series this project was built through — each one a
self-contained spec for a coding agent (DeepSeek via `opencode`, or a Haiku subagent for smaller,
well-scoped work), reviewed and merged one at a time with independent verification
(`tsc`/`lint`/`test`/`build`, not just the agent's own say-so) before landing on `master`.
`PROJECT_BRIEF.md` has the project's earlier planning history and licensing policy; treat
`artifacts/all-knowing`'s own docs as current where the two disagree.
