import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { guideExcerpts, matchGuides, type Guides } from './guides'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/guides-fextralife.json', import.meta.url), 'utf8'),
) as Guides

describe('fextralife guides', () => {
  it('has the mechanics pages', () => {
    expect(doc.pages.length).toBeGreaterThan(20)
    expect(doc.pages.some((p) => /Upgrades/i.test(p.title))).toBe(true)
    expect(guideExcerpts(doc).length).toBeGreaterThan(200)
  })

  it('matches a heading phrase', () => {
    expect(matchGuides('up', guideExcerpts(doc))).toEqual([])
    expect(matchGuides('smithing stone', guideExcerpts(doc)).length).toBeGreaterThan(0)
  })
})
