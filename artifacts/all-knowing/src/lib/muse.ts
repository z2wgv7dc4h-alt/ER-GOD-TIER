import {
  DEFAULT_GIDEON_TIMEOUT_MS,
  gideonBaseUrl,
  gideonModel,
  gideonProvider,
} from './gideonProvider'

export type { GideonProvider, GideonProviderId } from './gideonProvider'
export {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL,
  DEFAULT_GIDEON_BASE_URL,
  DEFAULT_GIDEON_MODEL,
  DEFAULT_GIDEON_TIMEOUT_MS,
  gideonBaseUrl,
  gideonModel,
  gideonProvider,
  gideonProviderId,
} from './gideonProvider'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type GideonLlmOptions = {
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
}

/**
 * Optional Gideon LLM. Two providers are supported, chosen by config with no
 * code change: **Meta Muse Spark 1.3 Contributor** (schema-constrained
 * chat/responses) and **DeepSeek** (OpenAI-compatible json_object chat). The
 * differences live in `gideonProvider.ts`; this module is the transport.
 *
 * Router-first by design: `askGideon` always runs the deterministic router first
 * and only reaches for the model on an open-ended question, then falls back to
 * the router on any failure. An absent key means no `fetch` at all.
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

// --- Task 153 §6: token usage counter -------------------------------------

/** One answer's (or one day's) accumulated token usage. */
export type GideonUsageTotals = {
  calls: number
  prompt: number
  cached: number
  completion: number
}

const USAGE_KEY = 'all-knowing-gideon-usage'

type GideonUsageStore = {
  /** Totals of the most recent answered question. */
  last: GideonUsageTotals
  /** Running totals for today, keyed by local date. */
  today: GideonUsageTotals & { date: string }
  allTime: GideonUsageTotals
}

const emptyUsage = (): GideonUsageTotals => ({ calls: 0, prompt: 0, cached: 0, completion: 0 })

function defaultUsageStore(): GideonUsageStore {
  return { last: emptyUsage(), today: { date: todayKey(), ...emptyUsage() }, allTime: emptyUsage() }
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// In-memory mirror so the counter works where localStorage is absent (tests,
// private mode). localStorage is still the source of truth in the browser.
let memoryUsage: GideonUsageStore | null = null

function readUsageStore(): GideonUsageStore {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(USAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GideonUsageStore>
        return {
          last: { ...emptyUsage(), ...(parsed.last ?? {}) },
          today: { date: todayKey(), ...emptyUsage(), ...(parsed.today ?? {}) },
          allTime: { ...emptyUsage(), ...(parsed.allTime ?? {}) },
        }
      }
    }
  } catch {
    /* corrupt or unavailable storage: fall through to memory */
  }
  return memoryUsage ? structuredCloneSafe(memoryUsage) : defaultUsageStore()
}

function writeUsageStore(store: GideonUsageStore): void {
  memoryUsage = structuredCloneSafe(store)
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(USAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private-mode failures */
  }
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let activeUsage: GideonUsageTotals | null = null

/** Start a new answer: subsequent `recordGideonUsage` calls accumulate. */
export function beginGideonUsage(): void {
  activeUsage = emptyUsage()
}

/** Commit the active answer's totals to `last` (per-answer totals). */
export function endGideonUsage(): void {
  if (!activeUsage) return
  const store = readUsageStore()
  store.last = { ...activeUsage }
  writeUsageStore(store)
  activeUsage = null
}

function addUsage(into: GideonUsageTotals, add: GideonUsageTotals): void {
  into.calls += add.calls
  into.prompt += add.prompt
  into.cached += add.cached
  into.completion += add.completion
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Read the provider `usage` block and add it to the per-answer, per-day and
 * all-time totals. Accepts OpenAI/DeepSeek `prompt_tokens` / `completion_tokens`
 * plus the cache split. Never throws.
 */
export function recordGideonUsage(raw: unknown): void {
  if (!raw || typeof raw !== 'object') return
  const u = raw as Record<string, unknown>
  const cached = asCount(u.prompt_cache_hit_tokens)
  const miss = asCount(u.prompt_cache_miss_tokens)
  const prompt = asCount(u.prompt_tokens) || cached + miss
  const completion = asCount(u.completion_tokens)
  if (!prompt && !completion && !cached && !miss) return
  const add: GideonUsageTotals = { calls: 1, prompt, cached, completion }
  if (activeUsage) addUsage(activeUsage, add)
  const store = readUsageStore()
  if (store.today.date !== todayKey()) store.today = { date: todayKey(), ...emptyUsage() }
  addUsage(store.today, add)
  addUsage(store.allTime, add)
  writeUsageStore(store)
}

/** The last answer's totals and today's running total (for Settings). */
export function gideonUsageSummary(): { last: GideonUsageTotals; today: GideonUsageTotals } {
  const store = readUsageStore()
  const today = store.today.date === todayKey() ? store.today : { ...emptyUsage() }
  return { last: { ...store.last }, today: { ...today } }
}

/** Test seam: wipe the counter from storage and memory. */
export function clearGideonUsage(): void {
  memoryUsage = null
  activeUsage = null
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(USAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Does the resolved provider expose a `/responses` endpoint (server-held reasoning)? */
export function supportsGideonResponses(): boolean {
  return gideonProvider().supportsResponses
}

/** Can the resolved provider take image input? DeepSeek chat cannot, so vision falls back to OCR. */
export function supportsGideonVision(): boolean {
  return gideonProvider().supportsVision
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

/**
 * One JSON-mode completion. Meta tries `POST {base}/chat/completions`; on a 404
 * it retries `POST {base}/responses`. DeepSeek has a single OpenAI-compatible
 * `/chat/completions` attempt with `json_object` mode. Anything non-OK (or an
 * empty body) throws so the caller stays on the router.
 */
export async function callGideonLlm(
  messages: ChatMessage[],
  opts: GideonLlmOptions = {},
): Promise<unknown> {
  const key = gideonKey()
  if (!key) throw new Error('VITE_GIDEON_API_KEY is not set')
  const base = gideonBaseUrl()
  const attempts = gideonProvider().completionBodies(messages, opts, gideonModel())

  let lastError: Error | null = null
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_GIDEON_TIMEOUT_MS)
    try {
      const res = await fetch(`${base}${attempt.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        signal: controller.signal,
        body: JSON.stringify(attempt.body),
      })
      if (res.status === 404 && i < attempts.length - 1) {
        // Endpoint shape not found here — fall through to the next attempt.
        lastError = new Error('Gideon LLM chat endpoint returned 404')
        continue
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 200)
        throw new Error(`Gideon LLM HTTP ${res.status}: ${detail}`)
      }
      const data = await res.json()
      recordGideonUsage((data as { usage?: unknown } | null)?.usage)
      const text = contentFrom(data)
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

/**
 * The Meta Responses API path. The server keeps the conversation (reasoning +
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
  const provider = gideonProvider()
  if (!provider.supportsResponses) throw new Error(`${provider.label} has no /responses endpoint`)
  const body = provider.responsesBody(input, tools, previousResponseId, opts, gideonModel())

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_GIDEON_TIMEOUT_MS)
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
      usage?: unknown
      output_text?: unknown
      output?: { type?: string; name?: string; arguments?: string; call_id?: string; content?: { text?: unknown }[] }[]
    }
    recordGideonUsage(data.usage)
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
 * One chat turn that may return `tool_calls`. Meta is schema-constrained to the
 * act when no tools are in play; DeepSeek uses json_object mode. With tools, both
 * providers use OpenAI-style `tools`. External keys cannot carry reasoning across
 * turns on Chat Completions, so we keep turns cheap (Meta: `minimal`).
 */
export async function callGideonChat(
  messages: AgentMessage[],
  tools: AgentTool[] = [],
  opts: GideonLlmOptions = {},
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const key = gideonKey()
  if (!key) throw new Error('VITE_GIDEON_API_KEY is not set')
  const body = gideonProvider().chatBody(messages, tools, opts, gideonModel())

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_GIDEON_TIMEOUT_MS)
  try {
    const res = await fetch(`${gideonBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Gideon LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as {
      usage?: unknown
      choices?: {
        message?: {
          content?: unknown
          tool_calls?: { id: string; function: { name: string; arguments: string } }[]
        }
      }[]
    }
    recordGideonUsage(data.usage)
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
