import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testGideonConnection } from './gideonTest'

const { callGideonLlm } = vi.hoisted(() => ({ callGideonLlm: vi.fn() }))

vi.mock('../lib/muse', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/muse')>()
  return { ...actual, callGideonLlm }
})

beforeEach(() => {
  callGideonLlm.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Gideon connection test (Task 112 §1)', () => {
  it('reports a missing key without calling out', async () => {
    const call = vi.fn()
    const result = await testGideonConnection({ hasKey: () => false, call })
    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/router/i)
    expect(call).not.toHaveBeenCalled()
  })

  it('reports success and quotes the reply', async () => {
    const result = await testGideonConnection({
      hasKey: () => true,
      model: () => 'muse-spark-1.3-contributor',
      call: async () => ({ say: 'pong' }),
    })
    expect(result.ok).toBe(true)
    expect(result.detail).toContain('pong')
    expect(result.detail).toContain('muse-spark-1.3-contributor')
  })

  it('treats a raised error as a failed connection', async () => {
    const result = await testGideonConnection({
      hasKey: () => true,
      call: async () => { throw new Error('HTTP 401') },
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('HTTP 401')
  })
})

describe('Gideon connection test (Task 142 §3)', () => {
  it('uses the same 45 s timeout as real calls', async () => {
    callGideonLlm.mockResolvedValue({ say: 'pong' })
    const result = await testGideonConnection({
      hasKey: () => true,
      provider: () => 'Meta Muse',
      model: () => 'muse-spark-1.3-contributor',
    })
    expect(result.ok).toBe(true)
    expect(callGideonLlm).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: 'user', content: 'ping' })]),
      { timeoutMs: 45000, maxTokens: 200 },
    )
  })

  it('reports the provider, model and latency', async () => {
    let t = 1000
    const result = await testGideonConnection({
      hasKey: () => true,
      provider: () => 'DeepSeek',
      model: () => 'deepseek-chat',
      call: async () => ({ say: 'pong' }),
      now: () => (t += 250),
    })
    expect(result.ok).toBe(true)
    expect(result.detail).toBe('DeepSeek · deepseek-chat replied “pong” in 250 ms.')
  })

  it('surfaces the HTTP status/body on failure and never the key', async () => {
    vi.stubEnv('VITE_GIDEON_API_KEY', 'sk-secret-key')
    const result = await testGideonConnection({
      hasKey: () => true,
      provider: () => 'DeepSeek',
      model: () => 'deepseek-chat',
      call: async () => { throw new Error('Gideon LLM HTTP 401: {"error":"invalid key sk-secret-key"}') },
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('HTTP 401')
    expect(result.detail).toContain('DeepSeek · deepseek-chat')
    expect(result.detail).not.toContain('sk-secret-key')
    expect(result.detail).toContain('***')
  })
})
