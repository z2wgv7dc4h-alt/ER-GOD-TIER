export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Hard-coded provider defaults. Both are overridable by env; the key never is. */
export const DEFAULT_GIDEON_BASE_URL = 'https://api.meta.ai/v1'
export const DEFAULT_GIDEON_MODEL = 'muse-spark-1.3-contributor'
/**
 * Meta's docs: `reasoning_effort` ∈ minimal|low|medium|high|xhigh (none → HTTP
 * 400; max is Standard-tier only). Our asks are direct-answer JSON acts, so the
 * shortest pass is the right one — measured ~4x fewer reasoning tokens and the
 * lowest latency. Chat Completions cannot carry reasoning across turns for
 * external keys, so there is nothing to be gained by thinking harder per turn.
 */
const DEFAULT_REASONING_EFFORT = 'minimal'
// Reasoning tokens count against max_tokens too; with minimal effort the JSON
// act fits comfortably in this.
const DEFAULT_MAX_TOKENS = 1200
// Stable prefix cache key (system prompt + history), per the prompt-caching guide.
const CACHE_KEY = 'all-knowing-gideon'
// minimal reasoning keeps a turn fast; 45s still covers a slow backend.
const DEFAULT_TIMEOUT_MS = 45000

/**
 * The GideonAct shape, as a strict JSON schema. Decoding is constrained to this,
 * so the model can no longer return malformed JSON or extra fields — we can drop
 * the loose `json_object` parsing. Root is a plain object, every property is in
 * `required`, and `additionalProperties:false`, per the strict subset.
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
      },
      required: ['say', 'module', 'factId', 'buildId', 'goal', 'offer', 'navigateNow'],
    },
  },
} as const

/**
 * Optional Gideon LLM: **Meta Muse Spark 1.3 Contributor**.
 *
 * Router-first by design: `askGideon` always runs the deterministic router first
 * and only reaches for the model on an open-ended question, then falls back to the
 * router on any failure. An absent key means no `fetch` at all.
 *
 * The key is read from `VITE_GIDEON_API_KEY` only. Same client-side tradeoff the
 * app has always documented: it is a local-first, no-backend PWA, the browser talks
 * to the provider directly, and `.env.local` is gitignored. Never hardcode a key.
 */
export function gideonKey(): string {
  const raw = import.meta.env.VITE_GIDEON_API_KEY
  return typeof raw === 'string' ? raw.trim() : ''
}

export function hasGideonKey(): boolean {
  return gideonKey().length > 0
}

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

/**
 * Dev goes through the Vite proxy (`/gideon-llm` → `https://api.meta.ai`) so the
 * browser is not blocked by CORS. An explicit `VITE_GIDEON_BASE_URL` always wins;
 * prod without one talks to the provider directly.
 */
export function gideonBaseUrl(): string {
  const env = import.meta.env.VITE_GIDEON_BASE_URL
  if (typeof env === 'string' && env.trim()) return stripTrailingSlashes(env.trim())
  if (import.meta.env.DEV) return '/gideon-llm/v1'
  return DEFAULT_GIDEON_BASE_URL
}

export function gideonModel(): string {
  // Contributor 1.3 only (the key is scoped to it); no env override.
  return DEFAULT_GIDEON_MODEL
}

export type GideonLlmOptions = {
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
}

/** Pull the assistant text out of either provider response shape. */
function contentFrom(data: unknown): string {
  const d = data as {
    choices?: { message?: { content?: unknown } }[]
    output_text?: unknown
    output?: { content?: { text?: unknown }[] }[]
  }
  const chat = d.choices?.[0]?.message?.content
  if (typeof chat === 'string' && chat.trim()) return chat
  if (typeof d.output_text === 'string' && d.output_text.trim()) return d.output_text
  for (const item of d.output ?? []) {
    for (const part of item.content ?? []) {
      if (typeof part.text === 'string' && part.text.trim()) return part.text
    }
  }
  return ''
}

type Attempt = { path: '/chat/completions' | '/responses'; body: unknown }

/**
 * The two request shapes this provider is known to expose, in order: the OpenAI
 * chat body first, then Meta's `/responses` `input` shape. No third vendor is
 * guessed.
 */
function requestBodies(messages: ChatMessage[], opts: GideonLlmOptions): Attempt[] {
  const model = gideonModel()
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
}

/** One JSON-mode completion. Tries `POST {base}/chat/completions`; on a 404 it
 * retries `POST {base}/responses`. Anything else non-OK (or an empty body) throws
 * so the caller stays on the router.
 */
export async function callGideonLlm(
  messages: ChatMessage[],
  opts: GideonLlmOptions = {},
): Promise<unknown> {
  const key = gideonKey()
  if (!key) throw new Error('VITE_GIDEON_API_KEY is not set')
  const base = gideonBaseUrl()

  let lastError: Error | null = null
  for (const attempt of requestBodies(messages, opts)) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    try {
      const res = await fetch(`${base}${attempt.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        signal: controller.signal,
        body: JSON.stringify(attempt.body),
      })
      if (res.status === 404 && attempt.path === '/chat/completions') {
        // Endpoint shape not found here — fall through to the /responses attempt.
        lastError = new Error('Gideon LLM chat endpoint returned 404')
        continue
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 200)
        throw new Error(`Gideon LLM HTTP ${res.status}: ${detail}`)
      }
      const text = contentFrom(await res.json())
      if (!text) throw new Error('Gideon LLM returned empty content')
      return JSON.parse(text)
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError ?? new Error('Gideon LLM request failed')
}

// --- Responses API (agent, reasoning continuity) --------------------------

export type ResponsesResult = {
  id: string
  outputText: string
  functionCalls: ToolCall[]
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
 * The Responses API path. The server keeps the conversation (reasoning +
 * tool calls) via `previous_response_id`, so a follow-up only sends the new
 * turn — the recommended transport for tool-calling agents. We extract any
 * `function_call` items for local execution and the final `output_text`.
 */
export async function callGideonResponses(
  input: unknown,
  tools: AgentTool[],
  previousResponseId: string | undefined,
  opts: GideonLlmOptions = {},
): Promise<ResponsesResult> {
  const key = gideonKey()
  if (!key) throw new Error('VITE_GIDEON_API_KEY is not set')
  const body: Record<string, unknown> = {
    model: gideonModel(),
    input,
    reasoning: { effort: opts.reasoningEffort ?? DEFAULT_REASONING_EFFORT },
    prompt_cache_key: CACHE_KEY,
    max_output_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
  }
  if (tools.length) body.tools = toResponsesTools(tools)
  if (previousResponseId) body.previous_response_id = previousResponseId

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(`${gideonBaseUrl()}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Gideon responses HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as {
      id?: string
      output_text?: unknown
      output?: { type?: string; name?: string; arguments?: string; call_id?: string; content?: { text?: unknown }[] }[]
    }
    const functionCalls: ToolCall[] = (data.output ?? [])
      .filter((i) => i.type === 'function_call')
      .map((i) => ({ id: String(i.call_id ?? ''), name: String(i.name ?? ''), arguments: String(i.arguments ?? '') }))
    let outputText = typeof data.output_text === 'string' ? data.output_text : ''
    if (!outputText) {
      for (const item of data.output ?? []) {
        for (const part of item.content ?? []) if (typeof part.text === 'string') outputText += part.text
      }
    }
    return { id: String(data.id ?? ''), outputText, functionCalls }
  } finally {
    clearTimeout(timeout)
  }
}

export type AgentMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
}

export type AgentTool =
  | { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }
  | { type: 'web_search' }

export type ToolCall = { id: string; name: string; arguments: string }

/**
 * One chat turn that may return `tool_calls`. Schema-constrained to the act when
 * no tools are in play; with tools, the model either calls a tool or emits the
 * act JSON. External keys cannot carry reasoning across turns on Chat
 * Completions, so we keep turns cheap (`reasoning_effort: minimal`).
 */
export async function callGideonChat(
  messages: AgentMessage[],
  tools: AgentTool[] = [],
  opts: GideonLlmOptions = {},
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const key = gideonKey()
  if (!key) throw new Error('VITE_GIDEON_API_KEY is not set')
  const base = gideonBaseUrl()
  const body: Record<string, unknown> = {
    model: gideonModel(),
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Gideon LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as {
      choices?: {
        message?: {
          content?: unknown
          tool_calls?: { id: string; function: { name: string; arguments: string } }[]
        }
      }[]
    }
    const msg = data.choices?.[0]?.message
    const content = typeof msg?.content === 'string' ? msg.content : ''
    const toolCalls: ToolCall[] = (msg?.tool_calls ?? []).map((t) => ({
      id: t.id,
      name: t.function.name,
      arguments: t.function.arguments,
    }))
    return { content, toolCalls }
  } finally {
    clearTimeout(timeout)
  }
}
