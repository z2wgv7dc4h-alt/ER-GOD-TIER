import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  callGideonChat,
  callGideonLlm,
  callGideonResponses,
  DEFAULT_GIDEON_BASE_URL,
  gideonBaseUrl,
  gideonModel,
  hasGideonKey,
  type ChatMessage,
} from './muse'

const messages: ChatMessage[] = [
  { role: 'system', content: 'You are Gideon.' },
  { role: 'user', content: 'Where next?' },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('gideon muse config', () => {
  it('reads only VITE_GIDEON_API_KEY and reports absence', () => {
    vi.stubEnv('VITE_GIDEON_API_KEY', '')
    expect(hasGideonKey()).toBe(false)

    vi.stubEnv('VITE_GIDEON_API_KEY', '  secret  ')
    expect(hasGideonKey()).toBe(true)
  })

  it('pins the contributor 1.3 model and honors a base-url override', () => {
    vi.stubEnv('VITE_GIDEON_BASE_URL', '')
    vi.stubEnv('VITE_GIDEON_MODEL', '')
    expect(gideonBaseUrl()).toBe('/gideon-llm/v1') // dev goes through the Vite proxy
    expect(gideonModel()).toBe('muse-spark-1.3-contributor')

    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.meta.ai/v1/')
    vi.stubEnv('VITE_GIDEON_MODEL', 'muse-spark-1.3-contributor')
    expect(gideonBaseUrl()).toBe('https://api.meta.ai/v1')
    expect(DEFAULT_GIDEON_BASE_URL).toBe('https://api.meta.ai/v1')
  })
})

describe('callGideonLlm', () => {
  it('never fetches without a key (router-only path)', async () => {
    vi.stubEnv('VITE_GIDEON_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(callGideonLlm(messages)).rejects.toThrow('VITE_GIDEON_API_KEY is not set')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses POST /chat/completions when it returns 200 (OpenAI body)', async () => {
    vi.stubEnv('VITE_GIDEON_API_KEY', 'test-key')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.meta.ai/v1')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"say":"From chat."}' } }] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGideonLlm(messages)).resolves.toEqual({ say: 'From chat.' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.meta.ai/v1/chat/completions')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body as string)
    expect(body.messages).toEqual(messages)
    // Reasoning model: shortest pass + room for the JSON act + cache affinity.
    expect(body.reasoning_effort).toBe('minimal')
    expect(body.max_tokens).toBeGreaterThanOrEqual(1000)
    expect(body.prompt_cache_key).toBe('all-knowing-gideon')
  })

  it('falls back to POST /responses when /chat/completions 404s (Meta input body)', async () => {
    vi.stubEnv('VITE_GIDEON_API_KEY', 'test-key')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.meta.ai/v1')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404))
      .mockResolvedValueOnce(jsonResponse({ output_text: '{"say":"From responses."}' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGideonLlm(messages)).resolves.toEqual({ say: 'From responses.' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('https://api.meta.ai/v1/chat/completions')
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://api.meta.ai/v1/responses')
    const body = JSON.parse(init.body as string)
    expect(body.input).toEqual(messages)
    expect(body.messages).toBeUndefined()
    expect(body.reasoning).toEqual({ effort: 'minimal' })
    expect(body.max_output_tokens).toBeGreaterThanOrEqual(1000)
  })

  it('throws (so the router takes over) on other HTTP errors', async () => {
    vi.stubEnv('VITE_GIDEON_API_KEY', 'test-key')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.meta.ai/v1')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, 500)))
    await expect(callGideonLlm(messages)).rejects.toThrow('Gideon LLM HTTP 500')
  })
})

describe('callGideonLlm — DeepSeek provider (Task 142 §1)', () => {
  function stubDeepseek() {
    vi.stubEnv('VITE_GIDEON_API_KEY', 'test-key')
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.deepseek.com/v1')
    vi.stubEnv('VITE_GIDEON_MODEL', '')
  }

  it('posts a single json_object chat with no Meta reasoning/cache params', async () => {
    stubDeepseek()
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"say":"From deepseek."}' } }] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGideonLlm(messages)).resolves.toEqual({ say: 'From deepseek.' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('deepseek-chat')
    expect(body.messages).toEqual(messages)
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.reasoning_effort).toBeUndefined()
    expect(body.prompt_cache_key).toBeUndefined()
  })

  it('does not retry /responses on a 404 (DeepSeek has one endpoint)', async () => {
    stubDeepseek()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGideonLlm(messages)).rejects.toThrow('Gideon LLM HTTP 404')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws on a non-JSON body so the router takes over', async () => {
    stubDeepseek()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'not json' } }] })))
    await expect(callGideonLlm(messages)).rejects.toThrow()
  })
})

describe('Gideon agent transport routing (Task 142 §5)', () => {
  function stubDeepseek() {
    vi.stubEnv('VITE_GIDEON_API_KEY', 'test-key')
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.deepseek.com/v1')
    vi.stubEnv('VITE_GIDEON_MODEL', '')
  }

  it('sends OpenAI-style tools and reads tool_calls on DeepSeek', async () => {
    stubDeepseek()
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: '', tool_calls: [{ id: 'c1', function: { name: 'search', arguments: '{"q":"x"}' } }] } }],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const tools = [{ type: 'function' as const, function: { name: 'search', description: 'd', parameters: {} } }]
    const out = await callGideonChat([{ role: 'user', content: 'hi' }], tools)
    expect(out.toolCalls).toEqual([{ id: 'c1', name: 'search', arguments: '{"q":"x"}' }])

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)
    expect(body.tools).toEqual(tools)
    expect(body.tool_choice).toBe('auto')
    expect(body.response_format).toBeUndefined()
  })

  it('refuses /responses for DeepSeek instead of guessing', async () => {
    stubDeepseek()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(callGideonResponses([], [], undefined)).rejects.toThrow('no /responses endpoint')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
