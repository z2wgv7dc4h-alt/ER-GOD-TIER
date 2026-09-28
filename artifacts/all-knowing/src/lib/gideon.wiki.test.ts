import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { askGideonWiki, wikiExcerpt } from './gideonWiki'
import { clearWikiCache, searchWiki } from './wikiSearch'

/**
 * Task 133 §4 — the 20-question wiki eval. Each question must find a section
 * whose page/heading/body covers the answer, and Gideon must be able to answer
 * from it. Runs against the committed corpus, not the network.
 */

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

const QUESTIONS: { q: string; wants: RegExp }[] = [
  { q: 'how do I get to Mohgwyn Palace', wants: /mohgwyn/i },
  { q: 'what does the Frenzied Flame do', wants: /frenz|frenzy|three fingers/i },
  { q: 'who is Melina', wants: /melina/i },
  { q: "how do I start Ranni's quest", wants: /ranni/i },
  { q: 'what does Scadutree blessing do', wants: /scadutree/i },
  { q: 'where is the Abyssal Woods', wants: /abyssal/i },
  { q: 'who is Miquella', wants: /miquella/i },
  { q: 'what is the Haligtree', wants: /haligtree/i },
  { q: 'where is Nokron, Eternal City', wants: /nokron/i },
  { q: 'how do I reach the Consecrated Snowfield', wants: /consecrated|snowfield/i },
  { q: 'who is Rykard', wants: /rykard/i },
  { q: 'what is the Elden Beast', wants: /elden beast/i },
  { q: 'what does the Mimic Tear do', wants: /mimic/i },
  { q: 'where is Castle Sol', wants: /castle sol/i },
  { q: 'what is the Frenzied Flame Proscription', wants: /frenz|proscription/i },
  { q: 'who is Maliketh', wants: /maliketh/i },
  { q: 'how do I get to the Forbidden Lands', wants: /forbidden lands/i },
  { q: 'what does the Purifying Crystal Tear do', wants: /purifying|crystal tear/i },
  { q: 'who is Godfrey', wants: /godfrey/i },
  { q: 'what is the Erdtree', wants: /erdtree/i },
]

describe('Task 133 §4 — 20 wiki questions find a relevant section', () => {
  for (const { q, wants } of QUESTIONS) {
    it(`"${q}"`, async () => {
      const hits = await searchWiki(q, 5)
      const relevant = hits.some((hit) => wants.test(`${hit.title} ${hit.heading} ${hit.markdown}`))
      expect(relevant, `no relevant section in ${hits.map((h) => h.title).join(' | ')}`).toBe(true)
    })
  }
})

describe('Task 133 §4 — Gideon answers from the wiki', () => {
  it('quotes the top sections and cites the page', async () => {
    const act = await askGideonWiki('how do I get to Mohgwyn Palace')
    expect(act).toBeTruthy()
    expect(act!.say).toMatch(/mohgwyn/i)
    expect(act!.sources?.[0]?.url).toMatch(/^https?:\/\//)
    expect(act!.say).toMatch(/From the wiki page/)
  })

  it('returns null when nothing matches', async () => {
    expect(await askGideonWiki('zzzzzqqqqxxxx')).toBeNull()
  })

  it('strips link markers from a quoted excerpt', () => {
    const text = wikiExcerpt('Reach [[region:limgrave|Limgrave]] and cross [[region:altus|Altus Plateau]].', 200)
    expect(text).not.toContain('[[')
    expect(text).toContain('Limgrave')
  })
})
