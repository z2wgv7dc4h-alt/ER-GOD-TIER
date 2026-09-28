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
