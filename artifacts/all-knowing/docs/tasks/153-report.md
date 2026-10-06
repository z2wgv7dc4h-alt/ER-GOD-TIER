# Task 153 report — make Gideon's DeepSeek usage lean

Branch `task-153`. Commit `92feb3c` (implementation + tests). Only the files the
brief lists (plus their tests and this report) were touched.

## What changed

### 1. Slim grounding when tools are available (`gideonLlm.ts`, `gideonAgent.ts`)
- `buildGrounding(question, character, memory, area, mode)` now takes
  `mode: 'full' | 'slim'` (default `'full'`, so every existing caller is unchanged).
- **slim** = a compact character summary (level, stats, gear, current area, active
  goal) + up to 12 `{id, name}` pairs the deterministic matcher found (search,
  `matchMany`, `matchAllWarps`) — no long text, no storylines/route/catalog.
- The agent path (`askGideonAgent`) always uses `'slim'`; the plain no-tools path
  keeps `'full'`.
- `validateGideonAct(raw, g, allowedUrls, extraIds)` gained an `extraIds`
  parameter. The agent collects every id-shaped string from tool results
  (`collectIds`) and folds it into the allowed `factIds` / `buildIds` / `goalIds`
  sets, so an id the model learned via a tool still validates.

### 2. Tool subset per question (`gideonTools.ts`, `gideonAgent.ts`, `gideon.ts`)
- New `selectGideonTools(intents)` + `MAX_GIDEON_TOOLS = 8`. Always-on core:
  `search`, `get_entity`, `wiki_search`. Intent groups add `boss`/`enemy`,
  `find_item`/`where`/`here`, `guide`/`wiki`, `upgrade`/`advise`,
  `level_check`, `dialogue`, `quest`/`quest_steps`/`recipe`.
- The selection is filtered back through `GIDEON_TOOLS`, so the array order is
  the canonical one: identical intent sets produce an identical tool array
  (cache-stable). `askGideon` passes its existing `wantsCombat`, `wantsPlacements`,
  `wantsGuides`, `wantsWeapons`, `wantsLevels`, `wantsDialogue`, `wantsMedusa`
  flags straight through.
- Every tool `description` is now one sentence; parameters whose description only
  restated the name lost it. The 21-tool schema shrank from **7,216 → 5,592 chars**
  and a typical per-question subset is **860–2,049 chars**.

### 3. Loop limits (`gideonAgent.ts`)
- `MAX_STEPS` 4 → 3.
- Tool results are now compact JSON (`dropEmpty` drops null/empty/`''`/empty
  arrays; `compactToolResult` caps at **1,500 chars**, was 4,000).
- On an **API/HTTP** failure (`Gideon LLM HTTP nnn` / `Gideon responses HTTP nnn`
  / network/abort) `askGideon` goes **straight to the wiki/router fallback** and
  never makes the second full `callGideonLlm` call. The plain completion is kept
  only for a provider with `supportsTools === false` (new capability on
  `gideonProvider.ts`; both current providers are `true`) or for a non-HTTP
  harness error (e.g. an older/mocked build).

### 4. Output cap (`gideonProvider.ts`)
- `DEFAULT_MAX_TOKENS` 1200 → **500** (still overridable via `opts.maxTokens`).
- `muse.test.ts` asserted `max_tokens >= 1000` in two places; those two numbers
  were updated to `toBe(500)` (the only existing assertions changed, as the brief
  allows).

### 5. Cache-friendly prompts (`gideonLlm.ts`)
- Order is already and still `system` (constant) → history → user (grounding +
  question). No date/random data in the system prompt. Identical intent sets now
  also produce identical tool arrays (see §2).

### 6. Usage counter (`muse.ts`, `settings/SettingsPanel.tsx`)
- `recordGideonUsage` reads `usage` from every response (`prompt_tokens`,
  `completion_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`) in
  `callGideonLlm`, `callGideonChat` and `callGideonResponses`, and adds it to a
  store at localStorage key `all-knowing-gideon-usage` (all storage access in
  try/catch; falls back to an in-memory mirror when storage is absent).
- Per-answer totals via `beginGideonUsage()` / `endGideonUsage()` (wrapped in
  `askGideon`), plus a per-day running total.
- Settings › Gideon now shows, under “Test connection”:
  `Last answer: N calls · X tokens (Y cached)` and `Today: …` (plain text, existing
  `.note` style).

### 7. Answer cache (`gideon.ts`)
- In-memory `Map` (max 50, FIFO eviction) keyed by normalised question +
  character/area/goal state. Same key → the previous act is returned with no API
  call. `clearGideonAnswerCache()` is exported as a test seam.

## Before / after (5 sample questions, first request)

Measured by `src/lib/gideonTokens.test.ts`. “Before” grounding = full pack;
“before” tools = the brief's 7,216-char pre-task 21-tool schema. Tokens ≈ chars / 4.

| question | before chars/tokens | after chars/tokens | grounding | tools |
|---|---|---|---|---|
| where do I find the Moonveil katana | 17,119 / ~4,280 | 4,232 / ~1,058 | 7,505 → 222 | 7,216 → 1,612 |
| Godrick strategy | 17,172 / ~4,293 | 3,471 / ~868 | 7,577 → 232 | 7,216 → 860 |
| where is Ranni | 18,092 / ~4,523 | 4,174 / ~1,044 | 8,499 → 185 | 7,216 → 1,612 |
| what level for Caelid | 17,151 / ~4,288 | 4,321 / ~1,080 | 7,551 → 220 | 7,216 → 1,717 |
| upgrade my weapon | 16,995 / ~4,249 | 4,611 / ~1,153 | 7,399 → 182 | 7,216 → 2,049 |
| **total** | **86,529 / ~21,632** | **20,809 / ~5,202** | | |

**−76 % request characters** before the model even answers, per question.

Calls per question: 1 request when the model answers immediately; bounded to
**3** agent steps (was 4) and the old failure path's extra full completion is gone
(was up to 5 API requests on an error). `max_tokens` 1200 → 500.

## Files

- `src/lib/gideonLlm.ts` — slim grounding, `extraIds` validation.
- `src/lib/gideonAgent.ts` — MAX_STEPS 3, compact/1,500-char tool results,
  slim grounding, intent-based tool subset, tool-id collection.
- `src/lib/gideonTools.ts` — trimmed descriptions/params, `selectGideonTools`,
  `GideonIntent`, `MAX_GIDEON_TOOLS`.
- `src/lib/gideonProvider.ts` — `DEFAULT_MAX_TOKENS = 500`, `supportsTools`.
- `src/lib/muse.ts` — usage store + `recordGideonUsage` in all three transports.
- `src/lib/gideon.ts` — intents → agent, HTTP-error short-circuit, answer cache,
  usage begin/end.
- `src/settings/SettingsPanel.tsx` — usage lines.
- `src/lib/gideonTokens.test.ts` — new (13 tests, mocked fetch, no network).
- `src/lib/muse.test.ts` — two `max_tokens` assertions 1000 → 500.

## Final checks (run once)

- `npx vitest run` — **199 files, 1433 passed, 11 skipped**.
- `npm run lint` — exit 0; warnings only (all pre-existing, none in the files
  changed here).
- `npm run build` — exit 0, built in ~2 s.
- `npx tsc -b` — clean.

## ASSUMPTIONS

- Slim grounding cap: “≤ 1,500 chars” is enforced by bounding the id list to 12
  and omitting long text; no hard truncation. Measured 182–232 chars with the
  test character; a fully-geared character adds a few hundred more, still far
  under 1,500.
- “the ids the deterministic router already matched” = `searchSync`,
  `matchMany` and `matchAllWarps` hits for the question (names + ids only).
- `DEFAULT_MAX_TOKENS = 500` is the provider default; `askGideon` does not pass
  an explicit cap, so all normal answers use 500.
- The plain no-tools `callGideonLlm` is retained for a provider that reports
  `supportsTools === false` **and** for a non-HTTP harness failure (a mocked or
  older build where the agent transport is absent), so the existing plain-path
  tests keep working. On a real HTTP/network error the plain call is skipped, as
  the brief requires.
- The answer cache is populated only from the tool-harness path (the primary
  path). Caching plain-path/fallback answers was deliberately avoided so an
  earlier successful answer can never mask a later failure in the same session;
  the deterministic router needs no cache anyway (it never calls the API).
- “Exactly ONE fetch” on an HTTP error is counted over the LLM endpoints
  (`/chat/completions`, `/responses`); the wiki fallback may still request its
  static `/sourced/wiki/*` data files, which are not model calls.
- Usage is recorded for both providers (Meta and DeepSeek), not DeepSeek only;
  Meta carries the same `usage` shape.
- The task-153 worktree had no `node_modules`; the repo forbids `npm install`, so
  I linked the sibling (identical `package.json`) task-152 worktree's gitignored
  `node_modules` directory to run `tsc`/`vitest`/`lint`/`build`.

## Not done

- The system prompt itself was left at 2,316 chars: the brief's change list did
  not ask to shorten it, and trimming it risks altering behaviour/voice. The
  wins come from grounding, tools, the loop and the output cap.
- `npm run index:entities`, `test:bundle`, `audit:pages`, `audit:links` were not
  run: the brief's “finish” section names only `npx vitest run`, `npm run lint`
  and `npm run build`.
