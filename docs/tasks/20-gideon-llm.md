# Task 20 — Real LLM behind Gideon (DeepSeek, grounded, same Act contract)

## Context

Repo root is `artifacts/all-knowing/`. Read `ARCHITECTURE.md`'s "AI" section and
`HANDOFF-CLAUDE.md`'s P1 item 14 in full: *"DeepSeek behind `GideonAct` with grounding pack
(stillAvailable + planRoute + searchSync + top catalog). No invented ids."* Read
`src/lib/gideon.ts` (the current deterministic regex router) and `src/Gideon.tsx` (the UI that
calls `askGideon` and executes the returned `GideonAct`) in full before writing anything.

The project owner has confirmed: use **DeepSeek** as the provider, reusing the same API key
already configured for this project's own dev tooling (`DEEPSEEK_API_KEY` — check how it's
exposed in this environment; for the shipped app itself you'll need a Vite-exposed env var, e.g.
`VITE_DEEPSEEK_API_KEY`, read via `import.meta.env` — **never hardcode a key in source, never
commit one**, document the env var name in the README instead).

**If you need to write any scratch file (e.g. a smoke-test script to verify API connectivity),
save it to `./.scratch/` inside this repo (already gitignored), never `/tmp`, `%TEMP%`, or any
path outside the project.** A prior run of this exact task died the moment it tried to write a
connectivity-check script to `%TEMP%\opencode\...` — writing outside the sandboxed working tree
gets silently auto-rejected in headless mode and kills the entire run immediately. Test API
connectivity by writing a throwaway script inside `.scratch/`, or better, just write the real
implementation directly and test it live via `npm run dev` using the `.env.local` mentioned below
— you don't need a separate smoke-test script at all.

**This is a local-first, no-backend project.** The API call happens directly from the client
(browser) to DeepSeek's API. That means the key is present in client-side code at runtime — an
accepted tradeoff here because this app is run locally by its owner, not deployed as a public
multi-tenant service; don't try to build a backend proxy to hide the key, that would contradict
the project's architecture. Do note this tradeoff in a code comment near wherever the key is
read, so it isn't silently forgotten if the project's distribution model ever changes.

## Objective

Replace (or more precisely: front) `askGideon`'s deterministic router with a real DeepSeek call
that returns the exact same `GideonAct` shape, so nothing downstream (`Gideon.tsx`, the shell's
`setModule(act.module)` handling, etc.) needs to change. Per `ARCHITECTURE.md`: *"Replace the
router later; do not replace the act."*

## Requirements

### Grounding pack (mandatory — this is what prevents hallucination)

Before calling the model, assemble a context package from data that already exists in this
codebase — do not let the model free-associate:
- `stillAvailable(character)` (from `src/knowledge/storylines.ts`)
- `planRoute` output for the character's current goal, if one is set (from
  `src/knowledge/endings.ts`)
- Top `searchSync(question)` results for the player's actual question (from `src/lib/search.ts`)
- A relevant slice of the catalog (`src/knowledge/catalog.ts`) — not the whole thing, something
  bounded and relevant to keep the prompt reasonable in size

Send this grounding pack to the model alongside the player's question and instruct it, in the
system prompt, to **only reference fact ids, module names, and build ids that appear in the
grounding pack** — never invent an id that isn't there.

### Structured output matching `GideonAct`

The response must deserialize into the existing `GideonAct` type (`{ say, module?, factId?,
buildId?, offer?, goal?, navigateNow? }`) — use DeepSeek's JSON mode / structured output /
function-calling capability if it has one (check DeepSeek's API docs for what's actually
supported) rather than parsing free-form text and hoping it's valid JSON.

### Validate before returning — never trust the model blindly

After getting a response, **validate every id the model returned against what's actually in the
grounding pack / catalog** (`factId`, `buildId`, `module`) before constructing the `GideonAct`.
If the model referenced something that doesn't exist, don't pass it through — either drop that
field or fall back to the deterministic router for that turn. This is the concrete mechanism for
"no invented ids," not just a prompt instruction hoped to be followed.

### Fallback to the deterministic router

- If no API key is configured (`import.meta.env.VITE_DEEPSEEK_API_KEY` is undefined/empty), skip
  the LLM path entirely and use the existing router — don't break the app for anyone who hasn't
  set up a key.
- If the API call fails (network error, timeout, malformed response, validation failure per
  above), fall back to the existing deterministic router for that turn rather than showing an
  error to the player. Log the failure to the console for debugging, don't surface it as a broken
  UI state.
- Consider a reasonable timeout (a few seconds) so a slow/hung API call doesn't leave Gideon
  looking unresponsive — fall back to the router if the call takes too long.

### Live testing

A `.env.local` with `VITE_DEEPSEEK_API_KEY` already set has been placed in your working
directory (gitignored, matches the existing `*.local` pattern) — use it to actually test the live
integration end-to-end via `npm run dev`, not just verify the code compiles. Don't remove or
commit this file.

### Cost/latency sanity

- Don't call the LLM for every single interaction if a fast, confident deterministic match
  already exists (e.g. an exact ending-name match, an exact warp-name match) — those can still go
  straight through the existing router for speed and cost. Use your judgment on where the line is
  between "this needs real reasoning" and "this is a lookup the router already handles well" —
  document the heuristic you land on.

## Explicit exclusions

- No voice I/O (STT/TTS) — that's a separate, later phase per `PROJECT_BRIEF.md`'s Phase 2/3
  spec, not this task.
- No RAG/vector store over wiki text — the grounding pack above is structured-data-only, matching
  what this project already has; don't introduce a new data pipeline for this task.
- No backend/proxy server — direct client-to-DeepSeek calls only, per the local-first
  architecture note above.

## Acceptance criteria

- With a valid API key configured, asking Gideon a question that the deterministic router
  couldn't handle well (something requiring real reasoning across the grounding pack, not just a
  keyword match) gets a sensible, grounded response.
- Demonstrate the "no invented ids" validation actually firing: construct or describe a case
  where the model might plausibly hallucinate an id, and show it gets caught/rejected rather than
  passed through.
- With no API key configured, the app behaves exactly as it does today (deterministic router,
  unchanged) — no broken UI, no console errors about a missing key beyond an informational log.
- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- README or a code comment documents the `VITE_DEEPSEEK_API_KEY` env var and the client-side-key
  tradeoff.
- Final report: the cost/latency heuristic you used for when to call the LLM vs. use the router
  directly, and what happened in your hallucination-guard test case.
