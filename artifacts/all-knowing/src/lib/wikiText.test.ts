import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchWiki, type WikiTextDoc } from './wikiText'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/wiki-sections.json', import.meta.url), 'utf8'),
) as WikiTextDoc

describe('wiki text (from MCP DB)', () => {
  it('has many sections', () => {
    expect(doc.sections.length).toBeGreaterThan(15000)
  })

  it('finds sections by text/heading', () => {
    expect(matchWiki('qq', doc.sections)).toEqual([])
    expect(matchWiki('bloodhound step', doc.sections).length).toBeGreaterThan(0)
  })
})
