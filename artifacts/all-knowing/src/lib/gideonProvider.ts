import type { AgentMessage, AgentTool, ChatMessage, GideonLlmOptions } from './muse'

/**
 * Task 142 — the provider adapter.
 *
 * Every difference between the LLM vendors Gideon can talk to lives in this one
 * file: base URL, default model, dev proxy path, request body shape, JSON mode,
 * tool-call format, reasoning params and vision support. `muse.ts` only knows how
 * to fetch and parse. Adding a vendor means adding one entry to `PROVIDERS`.
 */
export type GideonProviderId = 'deepseek' | 'meta'

/** One HTTP attempt for a one-shot JSON completion. */
export type ProviderAttempt = { path: '/chat/completions' | '/responses'; body: unknown }

/** Meta Muse Spark defaults (kept exported for backwards compatibility). */
export const DEFAULT_GIDEON_BASE_URL = 'https://api.meta.ai/v1'
export const DEFAULT_GIDEON_MODEL = 'muse-spark-1.3-contributor'
/** DeepSeek defaults. */
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
export const DEEPSEEK_MODEL = 'deepseek-chat'

export const DEFAULT_GIDEON_TIMEOUT_MS = 45000

const DEFAULT_REASONING_EFFORT = 'minimal'
const DEFAULT_MAX_TOKENS = 1200
const CACHE_KEY = 'all-knowing-gideon'

const STAT_KEYS = ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane'] as const

/** The Task 101 action union, discriminated on `type`. */
const ACTION_SCHEMA = {
  anyOf: [
    ...['markDone', 'markNotDone', 'addOwned', 'removeOwned'].map((t) => ({
      type: 'object',
      additionalProperties: false,
      properties: { type: { const: t }, ids: { type: 'array', items: { type: 'string' } } },
      required: ['type', 'ids'],
    })),
    {
      type: 'object',
      additionalProperties: false,
      properties: { type: { const: 'setGoal' }, id: { type: 'string' } },
      required: ['type', 'id'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: { type: { const: 'equip' }, slot: { type: 'string' }, id: { type: 'string' } },
      required: ['type', 'slot', 'id'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { const: 'setStats' },
        ...Object.fromEntries(STAT_KEYS.map((k) => [k, { type: ['number', 'null'] }])),
        level: { type: ['number', 'null'] },
      },
      required: ['type', ...STAT_KEYS, 'level'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: { type: { const: 'showOnMap' }, id: { type: 'string' } },
      required: ['type', 'id'],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: { type: { const: 'open' }, id: { type: 'string' } },
      required: ['type', 'id'],
    },
  ],
} as const

/**
 * The GideonAct shape, as a strict JSON schema. Only the Meta provider can decode
 * against this. DeepSeek (and any OpenAI-compatible vendor without json_schema)
 * keeps the schema in the system prompt and validates client-side instead.
 */
const ACT_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'GideonAct',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        say: { type: 'string' },
        module: { type: ['string', 'null'], enum: ['reckon', 'map', 'build', 'quests', 'codex', null] },
        factId: { type: ['string', 'null'] },
        buildId: { type: ['string', 'null'] },
        goal: { type: ['string', 'null'] },
        offer: {
          type: ['object', 'null'],
          additionalProperties: false,
          properties: { label: { type: 'string' }, prompt: { type: 'string' } },
          required: ['label', 'prompt'],
        },
        navigateNow: { type: 'boolean' },
        links: { type: ['array', 'null'], items: { type: 'string' } },
        actions: { type: ['array', 'null'], items: ACTION_SCHEMA },
        sources: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            additionalProperties: false,
            properties: { title: { type: 'string' }, url: { type: 'string' } },
            required: ['title', 'url'],
          },
        },
      },
      required: ['say', 'module', 'factId', 'buildId', 'goal', 'offer', 'navigateNow', 'links', 'actions', 'sources'],
    },
  },
} as const

/** DeepSeek's reasoning models reject sampling params such as `temperature`. */
export function isReasoningModel(model: string): boolean {
  return /reasoner|reasoning/i.test(model)
}

/** Responses uses FLAT tool objects (name/description/parameters at top level). */
function toResponsesTools(tools: AgentTool[]): unknown[] {
  return tools.map((t) =>
    t.type === 'function'
      ? { type: 'function', name: t.function.name, description: t.function.description, parameters: t.function.parameters }
      : { type: 'web_search' },
  )
}

/**
 * One vendor. `completionBodies`/`chatBody`/`responsesBody` are pure: they build a
 * request body from the already-resolved `model`, so the adapter never reads env.
 */
export type GideonProvider = {
  id: GideonProviderId
  /** Shown in Settings ("Test connection") and error messages. */
  label: string
  /** Production base URL when no `VITE_GIDEON_BASE_URL` is set. */
  defaultBaseUrl: string
  /** Default model when no `VITE_GIDEON_MODEL` is set. */
  defaultModel: string
  /** Same-origin dev-server proxy base (avoids CORS) when no explicit base URL. */
  devProxyBase: string
  /** Does the vendor expose an OpenAI `/responses` endpoint? */
  supportsResponses: boolean
  /** Can the model take image input? */
  supportsVision: boolean
  /** Can decoding be constrained to a strict JSON schema? */
  supportsStrictSchema: boolean
  /** Bodies to try, in order, for a one-shot JSON completion. */
  completionBodies(messages: ChatMessage[], opts: GideonLlmOptions, model: string): ProviderAttempt[]
  /** `/chat/completions` body for the tool-calling agent loop. */
  chatBody(messages: AgentMessage[], tools: AgentTool[], opts: GideonLlmOptions, model: string): Record<string, unknown>
  /** `/responses` body; only called when `supportsResponses`. */
  responsesBody(
    input: unknown,
    tools: AgentTool[],
    previousResponseId: string | undefined,
    opts: GideonLlmOptions,
    model: string,
  ): Record<string, unknown>
}

/** Meta Muse Spark (OpenAI chat body first, then Meta's `/responses` input shape). */
const META_PROVIDER: GideonProvider = {
  id: 'meta',
  label: 'Meta Muse',
  defaultBaseUrl: DEFAULT_GIDEON_BASE_URL,
  defaultModel: DEFAULT_GIDEON_MODEL,
  devProxyBase: '/gideon-llm/v1',
  supportsResponses: true,
  supportsVision: true,
  supportsStrictSchema: true,
  completionBodies(messages, opts, model) {
    return [
      {
        path: '/chat/completions',
        body: {
          model,
          messages,
          // Schema-constrained decoding (not just json_object).
          response_format: ACT_SCHEMA,
          // minimal: the shortest pass (docs: use the lowest level that works).
          reasoning_effort: opts.reasoningEffort ?? DEFAULT_REASONING_EFFORT,
          // Stable cache key: system prompt + history reuse the cached prefix.
          prompt_cache_key: CACHE_KEY,
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        },
      },
      {
        path: '/responses',
        body: {
          model,
          input: messages,
          reasoning: { effort: opts.reasoningEffort ?? DEFAULT_REASONING_EFFORT },
          prompt_cache_key: CACHE_KEY,
          max_output_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        },
      },
    ]
  },
  chatBody(messages, tools, opts, model) {
    const body: Record<string, unknown> = {
      model,
      messages,
      reasoning_effort: opts.reasoningEffort ?? DEFAULT_REASONING_EFFORT,
      prompt_cache_key: CACHE_KEY,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    }
    if (tools.length) {
      body.tools = tools
      body.tool_choice = 'auto'
      // With tools in play the model may emit either the act JSON or a tool call;
      // constrain only the final answer via the schema when no tool is chosen.
      body.parallel_tool_calls = false
    } else {
      body.response_format = ACT_SCHEMA
    }
    return body
  },
  responsesBody(input, tools, previousResponseId, opts, model) {
    const body: Record<string, unknown> = {
      model,
      input,
      reasoning: { effort: opts.reasoningEffort ?? DEFAULT_REASONING_EFFORT },
      prompt_cache_key: CACHE_KEY,
      max_output_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    }
    if (tools.length) body.tools = toResponsesTools(tools)
    if (previousResponseId) body.previous_response_id = previousResponseId
    return body
  },
}

/**
 * DeepSeek (OpenAI-compatible). No `/responses`, no strict json_schema, no image
 * input. JSON mode is `response_format: {type:'json_object'}` with the schema kept
 * in the system prompt; the act is validated by `validateGideonAct` client-side.
 */
const DEEPSEEK_PROVIDER: GideonProvider = {
  id: 'deepseek',
  label: 'DeepSeek',
  defaultBaseUrl: DEEPSEEK_BASE_URL,
  defaultModel: DEEPSEEK_MODEL,
  devProxyBase: '/gideon-llm-deepseek/v1',
  supportsResponses: false,
  supportsVision: false,
  supportsStrictSchema: false,
  completionBodies(messages, opts, model) {
    const body: Record<string, unknown> = {
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    }
    if (!isReasoningModel(model)) body.temperature = opts.temperature ?? 0.3
    return [{ path: '/chat/completions', body }]
  },
  chatBody(messages, tools, opts, model) {
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    }
    if (!isReasoningModel(model)) body.temperature = opts.temperature ?? 0.3
    if (tools.length) {
      body.tools = tools
      body.tool_choice = 'auto'
    } else {
      body.response_format = { type: 'json_object' }
    }
    return body
  },
  responsesBody() {
    throw new Error('DeepSeek has no /responses endpoint')
  },
}

export const PROVIDERS: Record<GideonProviderId, GideonProvider> = {
  meta: META_PROVIDER,
  deepseek: DEEPSEEK_PROVIDER,
}

export function isGideonProviderId(value: unknown): value is GideonProviderId {
  return value === 'deepseek' || value === 'meta'
}

/**
 * Resolve the configured provider. An explicit `VITE_GIDEON_PROVIDER` wins; a
 * `VITE_GIDEON_BASE_URL` that names DeepSeek selects it; anything else (or
 * nothing) stays on Meta for backwards compatibility.
 */
export function gideonProviderId(): GideonProviderId {
  const explicit = import.meta.env.VITE_GIDEON_PROVIDER
  if (typeof explicit === 'string') {
    const v = explicit.trim().toLowerCase()
    if (isGideonProviderId(v)) return v
  }
  const base = import.meta.env.VITE_GIDEON_BASE_URL
  if (typeof base === 'string' && base.trim()) return /deepseek/i.test(base) ? 'deepseek' : 'meta'
  return 'meta'
}

/** The resolved provider descriptor. */
export function gideonProvider(): GideonProvider {
  return PROVIDERS[gideonProviderId()]
}

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

/**
 * Dev goes through the Vite proxy (`/gideon-llm` → Meta, `/gideon-llm-deepseek`
 * → DeepSeek) so the browser is not blocked by CORS. An explicit
 * `VITE_GIDEON_BASE_URL` always wins; prod without one talks to the provider
 * directly.
 */
export function gideonBaseUrl(): string {
  const env = import.meta.env.VITE_GIDEON_BASE_URL
  if (typeof env === 'string' && env.trim()) return stripTrailingSlashes(env.trim())
  const provider = gideonProvider()
  if (import.meta.env.DEV) return provider.devProxyBase
  return provider.defaultBaseUrl
}

export function gideonModel(): string {
  const env = import.meta.env.VITE_GIDEON_MODEL
  if (typeof env === 'string' && env.trim()) return env.trim()
  return gideonProvider().defaultModel
}
