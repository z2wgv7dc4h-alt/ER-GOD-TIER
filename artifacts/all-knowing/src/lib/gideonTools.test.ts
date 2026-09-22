import { describe, expect, it } from 'vitest'
import { runGideonTool } from './gideonTools'
import { emptyCharacter } from '../data/seed'

const ctx = { character: emptyCharacter, memory: {} }

describe('gideon tool dispatcher (synchronous tools)', () => {
  it('search resolves a name to real ids', async () => {
    const hits = (await runGideonTool('search', { q: 'godrick' }, ctx)) as { id: string }[]
    expect(hits.some((h) => h.id.includes('godrick'))).toBe(true)
  })

  it('here returns the region scope without throwing', async () => {
    const r = (await runGideonTool('here', { q: 'limgrave' }, ctx)) as { region: string | null; items: unknown[] }
    expect(r).toHaveProperty('items')
  })

  it('unknown tool degrades to an error object, never throws', async () => {
    const r = await runGideonTool('nope', {}, ctx)
    expect(r).toMatchObject({ error: expect.stringContaining('unknown tool') })
  })
})
