import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fanImage } from './fanImage'
import { brandCategoryIcon, entityImage } from './extraImages'

/**
 * Task 193 §4/§6 — the brand category fallbacks and the brand asset guard.
 *
 * When an entity has no real picture the matching `cat-<kind>` WebP is shown
 * instead of nothing; a real picture always wins. This suite pins the kind →
 * file mapping and proves every `/brand/...` path referenced anywhere in the
 * app source actually exists on disk, so a renamed asset can never ship broken.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

const BRAND_KINDS = [
  'mechanic', 'gate', 'build', 'pvp', 'quest', 'ending',
  'guide', 'region', 'grace', 'merchant', 'npc', 'enemy',
] as const

describe('brand category fallbacks (Task 193 §4)', () => {
  it('maps every brand kind to its cat-<kind> WebP', () => {
    for (const kind of BRAND_KINDS) {
      expect(brandCategoryIcon(kind), kind).toBe(`/brand/cat-${kind}.webp`)
    }
  })

  it('has no fallback for kinds without brand art', () => {
    expect(brandCategoryIcon('weapon')).toBeUndefined()
    expect(brandCategoryIcon(undefined)).toBeUndefined()
  })

  it('real pictures always win over the fallback', () => {
    const real = fanImage('Hand Axe')
    expect(real).toBeTruthy()
    expect(entityImage('Hand Axe', [], 'enemy')).toBe(real)
  })

  it('falls back to the brand icon only when no other plane resolves one', () => {
    expect(entityImage('Definitely Not A Real Entity', [], 'mechanic')).toBe('/brand/cat-mechanic.webp')
    expect(entityImage('Definitely Not A Real Entity')).toBeUndefined()
  })
})

describe('referenced brand files exist (Task 193 §6)', () => {
  it('every /brand/ path referenced in the app source is on disk', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        const path = join(dir, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (/\.(ts|tsx|css|html|webmanifest)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
          files.push(path)
        }
      }
    }
    walk(join(ROOT, 'src'))
    files.push(join(ROOT, 'index.html'), join(ROOT, 'public', 'manifest.webmanifest'))

    const referenced = new Set<string>()
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/\/brand\/([A-Za-z0-9._-]+)/g)) referenced.add(match[1])
    }

    expect(referenced.size).toBeGreaterThan(0)
    const missing = [...referenced].filter((file) => !existsSync(join(ROOT, 'public', 'brand', file)))
    expect(missing).toEqual([])
  })
})
