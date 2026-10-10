import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { entityIndexReady, getRecord } from './entityIndex'
import {
  clearEntityIndex,
  enrichmentFor,
  ensureEntityIndex,
  loadEntityIndex,
  shouldLoadEntityIndex,
} from './entityEnrich'

/**
 * Task 191 §16 — the 4.4 MB entity index must load on demand, not on app mount.
 * These cover the loader's laziness/idempotency and the screen predicate the
 * shell uses to decide when to warm it.
 */

const DOC = {
  records: {
    'item:test-blade': { id: 'item:test-blade', kind: 'item', name: 'Test Blade', sources: ['test'] },
  },
  byKind: { item: 1 },
}

function stubFetch() {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => DOC }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  clearEntityIndex()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Task 191 §16 — the entity index loads lazily', () => {
  it('fetches nothing until a consumer asks', () => {
    const fetchMock = stubFetch()
    expect(entityIndexReady()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ensureEntityIndex fetches once and installs the records', async () => {
    const fetchMock = stubFetch()
    ensureEntityIndex()
    ensureEntityIndex()
    await loadEntityIndex()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(entityIndexReady()).toBe(true)
    expect(getRecord('item:test-blade')?.name).toBe('Test Blade')
  })

  it('settles empty on a failed fetch instead of wedging the UI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    ensureEntityIndex()
    await loadEntityIndex()
    expect(entityIndexReady()).toBe(true)
    expect(enrichmentFor('item:test-blade')).toBeUndefined()
  })

  it('re-fetches after the test seam clears the loader', async () => {
    const fetchMock = stubFetch()
    ensureEntityIndex()
    await loadEntityIndex()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    clearEntityIndex()
    expect(entityIndexReady()).toBe(false)
    ensureEntityIndex()
    await loadEntityIndex()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('Task 191 §16 — which screens warm the index', () => {
  it('skips the Tarnished overview/setup/profiles', () => {
    expect(shouldLoadEntityIndex('me', null)).toBe(false)
    expect(shouldLoadEntityIndex('me', 'overview')).toBe(false)
    expect(shouldLoadEntityIndex('me', 'setup')).toBe(false)
    expect(shouldLoadEntityIndex('me', 'profiles')).toBe(false)
  })

  it('warms the record-backed screens', () => {
    expect(shouldLoadEntityIndex('me', 'gear')).toBe(true)
    expect(shouldLoadEntityIndex('journey', null)).toBe(true)
    expect(shouldLoadEntityIndex('journey', 'map')).toBe(true)
    expect(shouldLoadEntityIndex('library', 'search')).toBe(true)
    expect(shouldLoadEntityIndex('gideon', null)).toBe(true)
  })

  it('keeps the shell from fetching on app mount', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
    expect(app).toMatch(/shouldLoadEntityIndex\(w\.section, w\.sub\)/)
    expect(app).not.toMatch(/useEffect\(\(\) => \{\s*ensureEntityIndex\(\)\s*\}, \[\]\)/)
  })
})
