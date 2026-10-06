# Task 153 — Make Gideon's DeepSeek usage lean

EXCEPTION to AGENTS.md: this task MAY edit Gideon code (only the files listed here + their tests).
All other AGENTS.md rules apply (never open `.env`/`.env.local`, no dev server, no install, no push).
Gideon must keep every ability it has; this is about tokens, not features.

Files: `src/lib/gideon.ts` (askGideon ~line 1480-1552), `src/lib/gideonAgent.ts`, `src/lib/gideonLlm.ts`
(`buildGrounding`, `gideonMessages`, `SYSTEM_PROMPT`), `src/lib/gideonTools.ts` (21 tools),
`src/lib/muse.ts` (fetch + parse), `src/lib/gideonProvider.ts`, `src/Gideon.tsx`, Settings
(`src/settings/`, where "Test connection" lives).

Measured today for "where do I find the Moonveil katana": system prompt 2,316 chars, grounding pack
7,502 chars, tool definitions 7,216 chars (21 tools) — ~4.5k tokens per call before history; agent loop
up to 4 calls (MAX_STEPS=4), tool results up to 4,000 chars each re-sent every step, then on failure a
second full `callGideonLlm` call; max_tokens 1200.

## Changes
1. **Slim grounding when tools are available.** `buildGrounding` gets a `mode: 'full' | 'slim'`. Slim =
   character summary (level, stats, gear, current area, active goal) + the ids the deterministic
   router already matched for this question (names + ids only, no long text). Target ≤ 1,500 chars.
   The agent path uses slim; the plain no-tools path keeps full. `validateGideonAct` must still accept
   ids the model got via tools (collect ids from tool results into the allowed set).
2. **Tool subset per question.** Pick tools by the same intent flags askGideon already computes
   (wantsCombat, wantsPlacements, wantsGuides, wantsWeapons, wantsLevels, wantsDialogue, …) plus a small
   always-on core (entity lookup/search). Max 8 tools per request. Shorten every tool `description`
   to one sentence and drop parameter descriptions that only restate the name. Keep the tool ORDER
   stable (same order every request) so the prefix caches.
3. **Loop limits.** MAX_STEPS 4 → 3. Tool results: compact JSON, drop empty/null fields, cap 1,500
   chars each. If the agent returns null because of an API/HTTP error, do NOT make the second full
   `callGideonLlm` call — go straight to the wiki/router fallback. Keep the plain call only when the
   provider has no tool support.
4. **Output cap.** Default max_tokens 1200 → 500 (keep `opts.maxTokens` override).
5. **Cache-friendly prompts.** Message order: system prompt (constant), then history, then the user
   message containing grounding + question. Nothing variable (dates, random ids) in the system prompt.
   Tools array identical for identical intent sets.
6. **Usage counter.** In `muse.ts`, read `usage` from every DeepSeek response (`prompt_tokens`,
   `completion_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens` when present) and add it
   to a small store (localStorage key `all-knowing-gideon-usage`, wrapped in try/catch): per-answer
   totals (calls, prompt, cached, completion) and a per-day running total. Show in Settings next to
   "Test connection": "Last answer: N calls · X tokens (Y cached)" and "Today: …". Plain text, existing
   styles.
7. **Answer cache.** Same normalised question + same character/area state within the session → reuse
   the previous act without calling the API (in-memory Map, max 50 entries).

## Tests (new `src/lib/gideonTokens.test.ts`, mocked fetch — no network)
- slim grounding ≤ 1,500 chars for 5 sample questions (Moonveil katana, Godrick strategy, where is Ranni,
  what level for Caelid, upgrade my weapon);
- ≤ 8 tools per request and tool order stable for the same question;
- agent stops after 3 steps; each tool result in the request ≤ 1,500 chars;
- on HTTP error from the agent call there is exactly ONE fetch (no second full call);
- max_tokens is 500 by default;
- usage from a mocked response is recorded and summed;
- the same question twice → one fetch.
- Before/after: total request characters for the 5 sample questions (first call), printed in the report.
Existing Gideon tests must still pass unchanged (if one asserts an old number such as max_tokens 1200,
update only that number and say so).

## Testing / finish
While working: only the Gideon test files + `npx tsc -b`. At the end ONCE: full `npx vitest run`,
`npm run lint`, `npm run build`. Commit on `task-153` per step. Report `docs/tasks/153-report.md`
(print it): before/after chars and estimated tokens per sample question, calls per question, what
changed, ASSUMPTIONS, anything not done.
