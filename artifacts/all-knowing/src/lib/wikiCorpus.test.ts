import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { WikiManifest } from './wikiSearch'

/**
 * Task 133 §1/§5 — guards for the exported wiki corpus. The corpus is generated
 * by `scripts/export-wiki-db.py` and committed under `public/sourced/wiki/`;
 * these tests read it exactly like the app does, so a broken export fails CI.
 */

const WIKI_DIR = fileURLToPath(new URL('../../public/sourced/wiki/', import.meta.url))
const manifest = JSON.parse(readFileSync(WIKI_DIR + 'manifest.json', 'utf8')) as WikiManifest
const searchMeta = JSON.parse(readFileSync(WIKI_DIR + 'search-index.json', 'utf8')) as {
  docs: number
  single?: boolean
  buckets?: Record<string, string>
  terms?: Record<string, [number, number, number][]>
}

describe('Task 133 §1 — wiki corpus manifest', () => {
  it('accounts for every page and chunk', () => {
    expect(manifest.pageCount).toBe(Object.keys(manifest.pages).length)
    expect(manifest.pageCount).toBeGreaterThan(4000)
    for (const chunk of manifest.chunks) expect(existsSync(WIKI_DIR + chunk), `missing ${chunk}`).toBe(true)
    for (const page of Object.values(manifest.pages)) expect(manifest.chunks, `${page.title} has a bad chunk`).toContain(page.chunk)
  })

  it('gives every page a non-empty entity id and a section count', () => {
    const empty = Object.values(manifest.pages).filter((page) => !page.entityId || !Number.isFinite(page.sections))
    expect(empty.map((page) => page.title)).toEqual([])
  })

  it('links each non-wiki entity id back to a real page', () => {
    const bad = Object.entries(manifest.byEntity).filter(([, pageId]) => !manifest.pages[String(pageId)])
    expect(bad.slice(0, 10)).toEqual([])
    for (const page of Object.values(manifest.pages)) {
      if (!page.entityId.startsWith('wiki:')) {
        expect(manifest.byEntity[page.entityId], `${page.entityId} does not index its own page`).toBeTruthy()
      }
    }
  })

  it('resolves the well-known entities to a page', () => {
    for (const id of ['boss:margit', 'boss:malenia', 'npc:ranni-the-witch', 'item:moonveil', 'region:limgrave']) {
      expect(manifest.byEntity[id], `${id} has no wiki page`).toBeTruthy()
    }
  })
})

describe('Task 133 §1 — corpus markup is clean', () => {
  it('has no raw templates, refs or bold markers left', () => {
    const offenders: string[] = []
    for (const chunkName of manifest.chunks) {
      const chunk = JSON.parse(readFileSync(WIKI_DIR + chunkName, 'utf8')) as {
        pages: { title: string; sections: { markdown: string }[] }[]
      }
      for (const page of chunk.pages) {
        for (const section of page.sections) {
          if (/\{\{|<ref|'''/.test(section.markdown)) offenders.push(page.title)
        }
      }
    }
    expect(offenders.slice(0, 10)).toEqual([])
  })

  it('keeps only canonical entity-link markers', () => {
    const offenders: string[] = []
    let links = 0
    for (const chunkName of manifest.chunks) {
      const chunk = JSON.parse(readFileSync(WIKI_DIR + chunkName, 'utf8')) as {
        pages: { title: string; sections: { markdown: string }[] }[]
      }
      for (const page of chunk.pages) {
        for (const section of page.sections) {
          for (const match of section.markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
            links++
            if (!/^[a-z]+:[a-z0-9-]+$/.test(match[1])) offenders.push(`${page.title}: ${match[1]}`)
          }
        }
      }
    }
    expect(offenders.slice(0, 10)).toEqual([])
    expect(links).toBeGreaterThan(50)
  })
})

describe('Task 133 §1 — search index', () => {
  it('ships every bucket the meta names', () => {
    if (searchMeta.single) {
      expect(Object.keys(searchMeta.terms ?? {}).length).toBeGreaterThan(1000)
      return
    }
    const buckets = Object.values(searchMeta.buckets ?? {})
    expect(buckets.length).toBeGreaterThan(0)
    for (const file of buckets) expect(existsSync(WIKI_DIR + file), `missing ${file}`).toBe(true)
  })

  it('indexes every section (docs count matches the pages)', () => {
    const sections = Object.values(manifest.pages).reduce((sum, page) => sum + page.sections, 0)
    expect(searchMeta.docs).toBe(sections)
  })
})
