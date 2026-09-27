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

describe('gideon tool dispatcher (Task 101 grounded tools)', () => {
  const area = { region: 'Limgrave', place: 'Church of Elleh', source: 'grace' as const, at: 1 }
  const groundedCtx = { character: emptyCharacter, memory: {}, area }

  it('character() includes the current area and a progress summary', async () => {
    const r = (await runGideonTool('character', {}, groundedCtx)) as {
      currentArea: { region: string; place: string | null } | null
      progress: unknown
      goals: unknown[]
    }
    expect(r.currentArea).toEqual({ region: 'Limgrave', place: 'Church of Elleh', source: 'grace' })
    expect(r.progress).toBeTruthy()
    expect(Array.isArray(r.goals)).toBe(true)
  })

  it('get_entity() returns the entity plus this character’s status and edges', async () => {
    const r = (await runGideonTool('get_entity', { id: 'boss:godrick' }, ctx)) as {
      id: string
      status: string
      edges: unknown[]
    }
    expect(r.id).toBe('boss:godrick')
    expect(r.status).toBeTruthy()
    expect(Array.isArray(r.edges)).toBe(true)
  })

  it('edges() filters by relation', async () => {
    const all = (await runGideonTool('edges', { id: 'boss:godrick' }, ctx)) as unknown[]
    const weak = (await runGideonTool('edges', { id: 'boss:godrick', rel: 'weakTo' }, ctx)) as unknown[]
    expect(all.length).toBeGreaterThanOrEqual(weak.length)
    expect(weak.every((e) => (e as { rel: string }).rel === 'weakTo')).toBe(true)
  })

  it('quest() lists beats with a done / pending state', async () => {
    const r = (await runGideonTool('quest', { id: 'ranni' }, ctx)) as {
      line: string
      beats: { do: string; state: string }[]
    }
    expect(r.line).toBe('ranni')
    expect(r.beats.length).toBeGreaterThan(0)
    expect(['done', 'pending']).toContain(r.beats[0].state)
  })

  it('search() filters by entity kind', async () => {
    const hits = (await runGideonTool('search', { q: 'godrick', kind: 'boss' }, ctx)) as { id: string; kind: string }[]
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.kind === 'boss')).toBe(true)
  })

  it('advise() dispatches on kind without throwing', async () => {
    const todo = (await runGideonTool('advise', { kind: 'todo' }, ctx)) as unknown[]
    expect(Array.isArray(todo)).toBe(true)
  })
})
