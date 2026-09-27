import { describe, expect, it } from 'vitest'
import {
  cachedDatasetIds,
  DATASETS,
  downloadAllForOffline,
  type CacheSink,
} from './dataFreshness'

describe('data freshness (Task 112 §1)', () => {
  it('lists the datasets the app needs', () => {
    expect(DATASETS.length).toBeGreaterThan(5)
    expect(DATASETS.every((d) => d.urls.length > 0)).toBe(true)
  })

  it('reports only fully-present datasets', async () => {
    const have = new Set(['/sourced/aliases.json'])
    const ids = await cachedDatasetIds({ has: async (url) => have.has(url) })
    expect(ids).toContain('aliases')
    expect(ids).not.toContain('regulation')
  })

  it('downloads everything and lists failures', async () => {
    const put: string[] = []
    const cache: CacheSink = { put: async (url) => { put.push(url) } }
    const result = await downloadAllForOffline(
      async (url) => {
        if (url.includes('boss-pins')) throw new Error('offline')
        return { url }
      },
      async () => cache,
    )
    expect(result.failed).toEqual(['/sourced/open/boss-pins.json'])
    expect(result.downloaded).toBe(DATASETS.flatMap((d) => d.urls).length - 1)
    expect(put).toContain('/sourced/aliases.json')
  })
})
