import { SOURCED_DATA_CACHE } from '../lib/pwa'

/**
 * Task 112 §1 — data freshness + "Download all for offline".
 *
 * The service worker already runtime-caches `/sourced/**`, but a phone that has
 * never opened a screen has not fetched that screen's dataset. This module names
 * the datasets the app depends on, reports which are already in the cache, and
 * warms the rest in one action. The cache/fetch are injected so the logic is
 * unit-testable with fakes.
 */

export type Dataset = {
  id: string
  label: string
  urls: string[]
}

/** The small always-useful JSON plus the bigger lazily-fetched dumps. */
export const DATASETS: Dataset[] = [
  { id: 'aliases', label: 'Alias plane', urls: ['/sourced/aliases.json'] },
  { id: 'regulation', label: 'Regulation stamp', urls: ['/sourced/regulation-vanilla-v1.17.json'] },
  { id: 'guide-catalog', label: 'Guide catalog', urls: ['/sourced/guide/catalog.json'] },
  { id: 'guide-legs', label: 'Guide routes', urls: ['/sourced/guide/legs.json'] },
  { id: 'coords', label: 'Map coordinates', urls: ['/sourced/open/coords.json'] },
  { id: 'boss-pins', label: 'Boss pins', urls: ['/sourced/open/boss-pins.json'] },
  { id: 'names', label: 'Entity names', urls: ['/sourced/open/names.json'] },
  { id: 'armory-weapons', label: 'Armory — weapons', urls: ['/sourced/armory-weapons.json'] },
  { id: 'armory-bosses', label: 'Armory — bosses', urls: ['/sourced/armory-bosses.json'] },
  { id: 'npc-combat', label: 'NPC combat', urls: ['/sourced/npc-combat.json'] },
]

export type CacheLookup = { has(url: string): Promise<boolean> }
export type CacheSink = { put(url: string, response: unknown): Promise<void> }

/** Which named datasets are fully present, in the order above. */
export async function cachedDatasetIds(lookup: CacheLookup): Promise<string[]> {
  const out: string[] = []
  for (const dataset of DATASETS) {
    let cached = true
    for (const url of dataset.urls) {
      if (!(await lookup.has(url))) { cached = false; break }
    }
    if (cached) out.push(dataset.id)
  }
  return out
}

export type DownloadResult = { downloaded: number; failed: string[] }

/** Fetch every dataset URL into the cache. Never throws — failures are listed. */
export async function downloadAllForOffline(
  fetchImpl: (url: string) => Promise<unknown>,
  openCache: () => Promise<CacheSink>,
): Promise<DownloadResult> {
  const cache = await openCache()
  const result: DownloadResult = { downloaded: 0, failed: [] }
  for (const dataset of DATASETS) {
    for (const url of dataset.urls) {
      try {
        const response = await fetchImpl(url)
        await cache.put(url, response)
        result.downloaded += 1
      } catch {
        result.failed.push(url)
      }
    }
  }
  return result
}

/** Browser-backed lookup. Null when the Cache API is unavailable (insecure ctx / SSR). */
export function browserCacheLookup(): CacheLookup | null {
  if (typeof caches === 'undefined') return null
  return {
    async has(url: string) {
      return (await caches.match(url)) !== undefined
    },
  }
}

/** The button's action: warm every dataset into the sourced-data cache. */
export async function downloadEverything(): Promise<DownloadResult> {
  const urls = DATASETS.flatMap((d) => d.urls)
  if (typeof caches === 'undefined' || typeof fetch === 'undefined') {
    return { downloaded: 0, failed: urls }
  }
  const cache = await caches.open(SOURCED_DATA_CACHE)
  return downloadAllForOffline(
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
      return res
    },
    async () => ({ put: (url, response) => cache.put(url, response as Response) }),
  )
}
