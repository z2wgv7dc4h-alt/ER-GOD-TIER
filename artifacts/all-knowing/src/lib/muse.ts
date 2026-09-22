export type ChatMessage = { role: 'system' | 'user'; content: string }

/** Hard-coded provider defaults. Both are overridable by env; the key never is. */
export const DEFAULT_GIDEON_BASE_URL = 'https://api.meta.ai/v1'
export const DEFAULT_GIDEON_MODEL = 'muse-spark-1.3-contributor'
// Murmur is a *reasoning* model: a plain turn spends several hundred reasoning
// tokens before the answer, so the old 8s budget both aborted mid-think and left
// too little room for content. 60s covers the observed 7-45s range.
const DEFAULT_TIMEOUT_MS = 60000
// Room for reasoning + the JSON act. 700 was too small and returned null content.
const DEFAULT_MAX_TOKENS = 2500

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
  const env = import.meta.env.VITE_GIDEON_MODEL
  return typeof env === 'string' && env.trim() ? env.trim() : DEFAULT_GIDEON_MODEL
}

export type GideonLlmOptions = {
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
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
        response_format: { type: 'json_object' },
        // Verified against api.meta.ai: accepted, and keeps the reasoning budget
        // (and so latency) down. The `/responses` body rejects `reasoning_effort`
        // and uses the nested `reasoning` shape instead.
        reasoning_effort: 'low',
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      },
    },
    {
      path: '/responses',
      body: { model, input: messages, reasoning: { effort: 'low' }, max_output_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS },
    },
  ]
}

/**
 * One JSON-mode completion. Tries `POST {base}/chat/completions`; on a 404 it
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
