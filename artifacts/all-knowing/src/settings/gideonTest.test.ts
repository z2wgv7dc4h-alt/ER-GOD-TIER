import { describe, expect, it, vi } from 'vitest'
import { testGideonConnection } from './gideonTest'

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
    expect(result.detail).toBe('HTTP 401')
  })
})
