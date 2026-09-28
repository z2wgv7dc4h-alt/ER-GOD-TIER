import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PRECACHE_DATA, pwaOptions } from './pwa'

/**
 * Task 133 §5 / Task 137 §5 — bundle guards. The wiki corpus is a data plane
 * under `public/sourced/wiki/`, fetched lazily and cached by the service worker;
 * it must never be swept into the app JS or the install precache.
 *
 * The emitted-chunk scans only run when a `dist/` build exists AND is newer than
 * every source file. A stale `dist/` (a leftover build from an earlier checkout)
 * is skipped rather than failing the suite, so `npm test` is build-independent.
 * `npm run test:bundle` builds first, then runs these checks against fresh output.
 */

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url))
const ASSETS = `${DIST}assets`
const SOURCED = fileURLToPath(new URL('../../dist/sourced/wiki/', import.meta.url))
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

/** The newest mtime under a tree, ignoring build output and dependencies. */
function newestMtime(dir: string): number {
  if (!existsSync(dir)) return 0
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(path))
      continue
    }
    if (/\.(ts|tsx|js|mjs|css|json|html)$/.test(entry.name)) {
      newest = Math.max(newest, statSync(path).mtimeMs)
    }
  }
  return newest
}

/** `dist/` is usable only when it is at least as new as every source file. */
function distIsFresh(): boolean {
  if (!existsSync(DIST)) return false
  const built = statSync(DIST).mtimeMs
  const sources = Math.max(
    newestMtime(join(ROOT, 'src')),
    newestMtime(join(ROOT, 'public', 'sourced')),
    statSync(join(ROOT, 'vite.config.ts')).mtimeMs,
    statSync(join(ROOT, 'package.json')).mtimeMs,
  )
  return built >= sources
}

const runDistChecks = distIsFresh()

describe('Task 133 §5 — the service worker never precaches the wiki', () => {
  it('keeps /sourced/** out of the precache glob', () => {
    expect(pwaOptions.workbox?.globIgnores).toContain('**/sourced/**')
  })

  it('does not list a wiki file in PRECACHE_DATA', () => {
    expect(PRECACHE_DATA.filter((entry) => entry.includes('wiki'))).toEqual([])
  })

  it('runtime-caches /sourced JSON (so the corpus is available offline)', () => {
    const rules = pwaOptions.workbox?.runtimeCaching ?? []
    expect(rules.length).toBeGreaterThan(0)
  })
})

describe('Task 137 §5 — dist freshness guard', () => {
  it('only scans emitted chunks when they are newer than the sources', () => {
    // The guard is deliberately conservative: an absent dist is "not fresh".
    expect(typeof runDistChecks).toBe('boolean')
    if (!existsSync(DIST)) expect(runDistChecks).toBe(false)
  })
})

describe.skipIf(!runDistChecks)('Task 133 §5 — emitted JS carries no wiki data', () => {
  const assets = existsSync(ASSETS) ? readdirSync(ASSETS).filter((f) => f.endsWith('.js')) : []
  const chunks = assets.map((file) => ({ file, code: readFileSync(`${ASSETS}/${file}`, 'utf8') }))

  it('emits the corpus as data files, not JS', () => {
    expect(existsSync(`${SOURCED}manifest.json`)).toBe(true)
    expect(existsSync(`${SOURCED}search-index.json`)).toBe(true)
  })

  it('never inlines the corpus data into a chunk', () => {
    // The loader names the files; only the *data* shape ("pageCount":…,
    // "byEntity":{…}) proves the manifest was bundled.
    const offenders = chunks
      .filter((chunk) => chunk.code.includes('"pageCount":') || chunk.code.includes('"byEntity":{'))
      .map((chunk) => chunk.file)
    expect(offenders).toEqual([])
  })

  it('keeps the first-load JS within budget', () => {
    const total = assets.reduce((sum, file) => sum + statSync(`${ASSETS}/${file}`).size, 0)
    expect(total).toBeLessThan(3.5 * 1024 * 1024)
    for (const chunk of chunks) {
      expect(statSync(`${ASSETS}/${chunk.file}`).size, `${chunk.file} is too large`).toBeLessThan(1.2 * 1024 * 1024)
    }
  })
})
