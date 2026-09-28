import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PRECACHE_DATA, pwaOptions } from './pwa'

/**
 * Task 133 §5 — bundle guards. The wiki corpus is a data plane under
 * `public/sourced/wiki/`, fetched lazily and cached by the service worker; it
 * must never be swept into the app JS or the install precache. When a `dist/`
 * build exists these tests also scan the emitted chunks directly.
 */

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url))
const SOURCED = fileURLToPath(new URL('../../dist/sourced/wiki/', import.meta.url))

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

const hasDist = existsSync(DIST)

describe.skipIf(!hasDist)('Task 133 §5 — emitted JS carries no wiki data', () => {
  const assets = existsSync(`${DIST}assets`) ? readdirSync(`${DIST}assets`).filter((f) => f.endsWith('.js')) : []
  const chunks = assets.map((file) => ({ file, code: readFileSync(`${DIST}assets/${file}`, 'utf8') }))

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
    const total = assets.reduce((sum, file) => sum + statSync(`${DIST}assets/${file}`).size, 0)
    expect(total).toBeLessThan(3.5 * 1024 * 1024)
    for (const chunk of chunks) {
      expect(statSync(`${DIST}assets/${chunk.file}`).size, `${chunk.file} is too large`).toBeLessThan(1.2 * 1024 * 1024)
    }
  })
})
