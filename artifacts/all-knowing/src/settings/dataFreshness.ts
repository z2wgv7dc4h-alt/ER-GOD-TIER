import { SOURCED_OFFLINE_CACHE } from '../lib/pwa'

/**
 * Task 112 §1 / Task 137 §2 — data freshness + "Download everything for offline".
 *
 * The service worker serves `/sourced/**` cache-first from one dedicated Cache
 * Storage bucket (`SOURCED_OFFLINE_CACHE`). A phone that has never opened a
 * screen has not fetched that screen's dataset, so this module reads the
 * generated `offline-manifest.json` (every file under `public/sourced/**`, with
 * byte sizes), reports which are already in the bucket, and warms the rest with a
 * progress callback. The fetch/cache IO is injected so the logic is unit-tested.
 */

export type Dataset = { id: string; label: string; urls: string[] }

/** The small always-useful JSON, kept as a named "critical path" list. */
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

// ---------------------------------------------------------------------------
// Task 137 §2 — the full sourced/** offline manifest
// ---------------------------------------------------------------------------

export const OFFLINE_MANIFEST_URL = '/sourced/offline-manifest.json'

export type OfflineFile = { path: string; bytes: number }
export type OfflineManifest = {
  generatedAt?: string
  root?: string
  fileCount: number
  totalBytes: number
  files: OfflineFile[]
}

/** Read the generated manifest. Returns null when it is absent (older checkout). */
export async function loadOfflineManifest(
  fetchImpl: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }> = fetch,
): Promise<OfflineManifest | null> {
  try {
    const res = await fetchImpl(OFFLINE_MANIFEST_URL)
    if (!res.ok) return null
    const doc = (await res.json()) as Partial<OfflineManifest>
    if (!doc || !Array.isArray(doc.files)) return null
    return {
      generatedAt: doc.generatedAt,
      root: doc.root ?? '/sourced',
      fileCount: doc.fileCount ?? doc.files.length,
      totalBytes: doc.totalBytes ?? doc.files.reduce((n, f) => n + (f.bytes ?? 0), 0),
      files: doc.files,
    }
  } catch {
    return null
  }
}

export type OfflinePlan = {
  total: number
  totalBytes: number
  pending: OfflineFile[]
  /** Files already present in the cache, skipped on a resumed download. */
  cached: OfflineFile[]
}

/**
 * Split a manifest into cached and pending files. Pure: the caller decides what
 * "cached" means (usually `cache.match`). A resumed download therefore only
 * fetches what is still missing.
 */
export function planOfflineDownload(manifest: OfflineManifest, has: (path: string) => boolean): OfflinePlan {
  const pending: OfflineFile[] = []
  const cached: OfflineFile[] = []
  for (const file of manifest.files) {
    if (has(file.path)) cached.push(file)
    else pending.push(file)
  }
  return {
    total: manifest.files.length,
    totalBytes: manifest.totalBytes,
    pending,
    cached,
  }
}

export type OfflineProgress = {
  done: number
  total: number
  /** Bytes downloaded this run (skipped files are not counted). */
  bytes: number
  totalBytes: number
  current: string
}

export type OfflineDownloadResult = {
  downloaded: number
  skipped: number
  failed: string[]
  bytes: number
  total: number
}

export type OfflineIO = {
  has(url: string): Promise<boolean>
  fetch(url: string): Promise<{ ok: boolean; status: number }>
  put(url: string, response: unknown): Promise<void>
}

/**
 * Fetch each file into the cache, skipping any already present. Never throws:
 * a failed file is listed and the run continues, so a partial download is still
 * useful and can be resumed.
 */
export async function downloadManifestFiles(
  files: OfflineFile[],
  io: OfflineIO,
  onProgress?: (progress: OfflineProgress) => void,
  totalBytes = files.reduce((n, f) => n + (f.bytes ?? 0), 0),
): Promise<OfflineDownloadResult> {
  const total = files.length
  let done = 0
  let bytes = 0
  let skipped = 0
  const failed: string[] = []
  for (const file of files) {
    if (await io.has(file.path)) {
      skipped += 1
      done += 1
      onProgress?.({ done, total, bytes, totalBytes, current: file.path })
      continue
    }
    try {
      const res = await io.fetch(file.path)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await io.put(file.path, res)
      bytes += file.bytes ?? 0
    } catch {
      failed.push(file.path)
    }
    done += 1
    onProgress?.({ done, total, bytes, totalBytes, current: file.path })
  }
  return { downloaded: total - skipped - failed.length, skipped, failed, bytes, total }
}

/** The "Download everything for offline" action: warm every sourced file. */
export async function downloadEverythingForOffline(
  onProgress?: (progress: OfflineProgress) => void,
): Promise<OfflineDownloadResult> {
  const empty: OfflineDownloadResult = { downloaded: 0, skipped: 0, failed: [], bytes: 0, total: 0 }
  if (typeof caches === 'undefined' || typeof fetch === 'undefined') return empty
  const manifest = await loadOfflineManifest()
  if (!manifest) return { ...empty, failed: [OFFLINE_MANIFEST_URL] }
  const cache = await caches.open(SOURCED_OFFLINE_CACHE)
  return downloadManifestFiles(
    manifest.files,
    {
      has: async (url) => Boolean(await cache.match(url)),
      fetch: (url) => fetch(url),
      put: (url, response) => cache.put(url, response as Response),
    },
    onProgress,
    manifest.totalBytes,
  )
}

/** Remove the whole offline bucket. Returns false when the Cache API is absent. */
export async function removeOfflineData(): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  return caches.delete(SOURCED_OFFLINE_CACHE)
}

/** Human-readable bytes for the progress/status lines. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export type StorageEstimate = { usage: number; quota: number }

/** `navigator.storage.estimate()`, or null when unavailable. */
export async function offlineStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return null
  }
}

/** Ask the browser to keep the offline bucket instead of evicting it under pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
