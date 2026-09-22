import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchMeta, metaExcerpts, type MetaBuilds } from './metaBuilds'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/builds-fextralife.json', import.meta.url), 'utf8'),
) as MetaBuilds

describe('fextralife meta builds/status', () => {
  it('has the build + status pages', () => {
    expect(doc.pages.length).toBeGreaterThan(15)
    expect(doc.pages.some((p) => /hemorrhage|bleed/i.test(p.title))).toBe(true)
    expect(doc.pages.some((p) => /community builds/i.test(p.title))).toBe(true)
    expect(metaExcerpts(doc).length).toBeGreaterThan(100)
  })

  it('matches a status term', () => {
    expect(matchMeta('bl', metaExcerpts(doc))).toEqual([])
    expect(matchMeta('hemorrhage', metaExcerpts(doc)).length).toBeGreaterThan(0)
  })
})
