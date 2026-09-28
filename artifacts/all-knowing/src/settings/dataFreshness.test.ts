import { describe, expect, it } from 'vitest'
import {
  cachedDatasetIds,
  DATASETS,
  downloadAllForOffline,
  downloadEverythingForOffline,
  downloadManifestFiles,
  formatBytes,
  loadOfflineManifest,
  planOfflineDownload,
  removeOfflineData,
  type CacheSink,
  type OfflineManifest,
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

const MANIFEST: OfflineManifest = {
  fileCount: 3,
  totalBytes: 3000,
  files: [
    { path: '/sourced/a.json', bytes: 1000 },
    { path: '/sourced/wiki/pages-000.json', bytes: 1000 },
    { path: '/sourced/maps/m0.jpg', bytes: 1000 },
  ],
}

describe('offline manifest download (Task 137 §2)', () => {
  it('formats bytes for the progress line', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1048576)).toBe('5.0 MB')
  })

  it('loads and normalises a manifest, and returns null when absent', async () => {
    const ok = await loadOfflineManifest(async () => ({ ok: true, json: async () => MANIFEST }))
    expect(ok?.fileCount).toBe(3)
    expect(ok?.totalBytes).toBe(3000)
    const missing = await loadOfflineManifest(async () => ({ ok: false, json: async () => ({}) }))
    expect(missing).toBeNull()
    const junk = await loadOfflineManifest(async () => ({ ok: true, json: async () => ({ nope: 1 }) }))
    expect(junk).toBeNull()
  })

  it('splits a manifest into cached and pending by id, for a resumable run', () => {
    const cached = new Set(['/sourced/a.json'])
    const plan = planOfflineDownload(MANIFEST, (p) => cached.has(p))
    expect(plan.cached.map((f) => f.path)).toEqual(['/sourced/a.json'])
    expect(plan.pending.map((f) => f.path)).toEqual(['/sourced/wiki/pages-000.json', '/sourced/maps/m0.jpg'])
    expect(plan.total).toBe(3)
    expect(plan.totalBytes).toBe(3000)
  })

  it('downloads the pending set, skips the cache, reports progress and failures', async () => {
    const has = new Set(['/sourced/a.json'])
    const put: string[] = []
    const progress: number[] = []
    const result = await downloadManifestFiles(
      MANIFEST.files,
      {
        has: async (url) => has.has(url),
        fetch: async (url) => ({ ok: !url.includes('m0.jpg'), status: url.includes('m0.jpg') ? 404 : 200 }),
        put: async (url) => { put.push(url) },
      },
      (p) => progress.push(p.done),
      MANIFEST.totalBytes,
    )
    expect(put).toEqual(['/sourced/wiki/pages-000.json'])
    expect(result.skipped).toBe(1)
    expect(result.downloaded).toBe(1)
    expect(result.failed).toEqual(['/sourced/maps/m0.jpg'])
    expect(result.bytes).toBe(1000)
    expect(progress).toEqual([1, 2, 3])
  })

  it('is resumable: a second run over a full cache downloads nothing', async () => {
    const has = new Set(MANIFEST.files.map((f) => f.path))
    let fetches = 0
    const result = await downloadManifestFiles(MANIFEST.files, {
      has: async (url) => has.has(url),
      fetch: async () => { fetches += 1; return { ok: true, status: 200 } },
      put: async () => {},
    })
    expect(fetches).toBe(0)
    expect(result.downloaded).toBe(0)
    expect(result.skipped).toBe(3)
  })

  it('degrades safely when the browser Cache API / fetch are unavailable', async () => {
    const result = await downloadEverythingForOffline()
    expect(result).toEqual({ downloaded: 0, skipped: 0, failed: [], bytes: 0, total: 0 })
    expect(await removeOfflineData()).toBe(false)
  })
})
