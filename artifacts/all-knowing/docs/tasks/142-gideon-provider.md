# Task 142 — Gideon LLM provider: DeepSeek and Meta Muse, config-driven

Gideon's LLM path (`src/lib/muse.ts`, `gideonLlm.ts`, `gideonAgent.ts`, `settings/gideonTest.ts`) is hard-wired to
Meta Muse Spark (`api.meta.ai`, model `muse-spark-1.3-contributor`, dev proxy `/gideon-llm` → `https://api.meta.ai`).
The user may be using a DeepSeek key. Support both, chosen by config, with no code change to switch.

1. **Provider config**: `VITE_GIDEON_PROVIDER` = `deepseek` | `meta` (default: infer from `VITE_GIDEON_BASE_URL` if set,
   else `meta` for backwards compatibility). Defaults per provider:
   - deepseek → base `https://api.deepseek.com/v1`, model `deepseek-chat` (reasoning model `deepseek-reasoner`
     optional via `VITE_GIDEON_MODEL`), OpenAI-compatible `/chat/completions`, `response_format: {type:'json_object'}`
     (DeepSeek does not support strict json_schema — keep the schema in the system prompt and validate client-side
     with the existing GideonAct validator), tool calling via OpenAI-style `tools`.
   - meta → existing behaviour unchanged.
   Isolate provider differences behind one adapter (request shape, JSON mode, tool calls, reasoning params, prompt
   cache key, vision support). Vision (`museVision.ts`): DeepSeek chat has no image input — fall back to OCR and say so.
2. **Dev proxy**: `vite.config.ts` gets `/gideon-llm-deepseek` → `https://api.deepseek.com` alongside the Meta route;
   the dev base URL picks the proxy for the configured provider (so the phone never hits CORS).
3. **Test connection**: use the same 45 s timeout as real calls (it was 12 s and aborted on a slow model); show the
   provider + model + latency in the result; on failure show the HTTP status/error body summary (never the key).
4. **Docs**: `.env.example` lists all four variables with comments for both providers; README "Gideon AI" section
   explains how to set DeepSeek or Meta and to restart the dev server; note the key is embedded client-side (LAN only).
5. **Tests**: adapter request-shape tests for both providers (mock fetch), JSON-mode fallback validation, proxy base
   selection, test-connection timeout/latency reporting.

NEVER read .env / .env.local files (they hold the user's key). No dev servers, no installs. `npx tsc -b`, `npm test`,
`npm run lint`, `npm run build` pass; commit after each numbered section.
