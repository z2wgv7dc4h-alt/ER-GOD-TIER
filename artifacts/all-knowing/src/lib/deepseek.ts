export type ChatMessage = { role: 'system' | 'user'; content: string }

const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const DEFAULT_MODEL = 'deepseek-flash'
const DEFAULT_TIMEOUT_MS = 6000

/**
 * DeepSeek API key for the shipped app.
 *
 * Client-side key tradeoff: All-Knowing is a local-first, no-backend PWA, so the
 * browser talks to DeepSeek directly and this key is present in client code at
 * runtime. That is an accepted tradeoff because the app runs on its owner's
 * machine and is not deployed as a public multi-tenant service. If the
 * distribution model ever changes, move this call behind a server proxy and stop
 * shipping the key to the client.
 *
 * Configure it as `VITE_DEEPSEEK_API_KEY` in `.env.local` (gitignored). Never
 * hardcode a key in source and never commit one.
 */
export function deepseekKey(): string {
  const raw = import.meta.env.VITE_DEEPSEEK_API_KEY
  return typeof raw === 'string' ? raw.trim() : ''
}

export function hasDeepSeekKey(): boolean {
  return deepseekKey().length > 0
}

export type DeepSeekJsonOptions = {
  model?: string
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
}

/**
 * One JSON-mode chat completion. DeepSeek's `response_format: json_object`
 * guarantees the message content is valid JSON, so callers can parse without
 * guessing at prose. The abort timer keeps a hung call from freezing Gideon.
 */
export async function callDeepSeekJson(
  messages: ChatMessage[],
  opts: DeepSeekJsonOptions = {},
): Promise<unknown> {
  const key = deepseekKey()
  if (!key) throw new Error('VITE_DEEPSEEK_API_KEY is not set')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const model = opts.model || (import.meta.env.VITE_DEEPSEEK_MODEL as string | undefined) || DEFAULT_MODEL
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 700,
      }),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200)
      throw new Error(`DeepSeek HTTP ${res.status}: ${detail}`)
    }
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('DeepSeek returned empty content')
    }
    return JSON.parse(content)
  } finally {
    clearTimeout(timeout)
  }
}
