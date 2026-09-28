import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  bucketFor,
  clearWikiCache,
  rankPostings,
  searchWiki,
  stem,
  tokenize,
  wikiPageForEntity,
  wikiSnippet,
} from './wikiSearch'

const WIKI_DIR = fileURLToPath(new URL('../../public/sourced/wiki/', import.meta.url))
const realFetch = globalThis.fetch

beforeAll(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const name = String(input).replace(/^.*\/sourced\/wiki\//, '')
    try {
      const body = readFileSync(WIKI_DIR + name, 'utf8')
      return { ok: true, json: async () => JSON.parse(body) } as Response
    } catch {
      return { ok: false, json: async () => ({}) } as Response
    }
  })
})

afterAll(() => {
  vi.stubGlobal('fetch', realFetch)
  clearWikiCache()
})

describe('Task 133 §1 — wiki tokenizer', () => {
  it('lowercases, folds accents and drops stopwords', () => {
    expect(tokenize('How to get to the Mohgwyn Palace?')).toEqual(['how', 'get', 'mohgwyn', 'palace'])
    expect(tokenize('Miquella’s Haligtree')).toEqual(['miquella', 'haligtree'])
  })

  it('applies the same stem-lite as the exporter', () => {
    expect(stem('sorceries')).toBe('sorcery')
    expect(stem('tears')).toBe('tear')
    expect(stem('blessing')).toBe('bless')
    expect(stem('shield')).toBe('shield')
    expect(stem('dragon')).toBe('dragon')
  })

  it('buckets a term by its first character', () => {
    expect(bucketFor('mohgwyn')).toBe('m')
    expect(bucketFor('2')).toBe('2')
  })
})

describe('Task 133 §1 — posting ranker', () => {
  it('ranks more/rarer term matches first', () => {
    const postings = new Map([
      ['mohgwyn', [[1, 0, 4], [2, 1, 1]] as [number, number, number][]],
      ['palace', [[1, 0, 1]] as [number, number, number][]],
    ])
    const ranked = rankPostings(['mohgwyn', 'palace'], 100, postings)
    expect(ranked[0]).toMatchObject({ pageId: '1', ord: 0 })
    expect(ranked[0].score).toBeGreaterThan(ranked[1]?.score ?? 0)
  })

  it('returns nothing without terms or documents', () => {
    expect(rankPostings([], 10, new Map())).toEqual([])
    expect(rankPostings(['x'], 0, new Map([['x', [[1, 0, 1]]]]))).toEqual([])
  })
})

describe('Task 133 §1/§3 — full-text search over the exported corpus', () => {
  it('finds the Frenzied Flame Proscription', async () => {
    const hits = await searchWiki('frenzy flame proscription')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((hit) => /frenz|proscription|three fingers/i.test(`${hit.title} ${hit.heading} ${hit.markdown}`))).toBe(true)
  })

  it('finds how to reach Mohgwyn Palace', async () => {
    const hits = await searchWiki('how to get to Mohgwyn')
    expect(hits.some((hit) => /mohgwyn/i.test(`${hit.title} ${hit.heading} ${hit.markdown}`))).toBe(true)
  })

  it('finds Melina', async () => {
    const hits = await searchWiki('who is Melina')
    expect(hits.some((hit) => /melina/i.test(`${hit.title} ${hit.heading}`))).toBe(true)
  })

  it('finds the Scadutree blessing', async () => {
    const hits = await searchWiki('what does Scadutree blessing do')
    expect(hits.some((hit) => /scadutree/i.test(`${hit.title} ${hit.heading} ${hit.markdown}`))).toBe(true)
  })

  it('links a known entity to its wiki page', async () => {
    const found = await wikiPageForEntity('boss:margit')
    expect(found?.meta.title).toMatch(/Margit/)
  })

  it('builds a plain snippet with markup removed', () => {
    const snippet = wikiSnippet('A [[boss:margit|Margit]] guards the path to the [[region:altus|Altus Plateau]].', 'margit')
    expect(snippet).toContain('Margit')
    expect(snippet).not.toContain('[[')
  })
})
