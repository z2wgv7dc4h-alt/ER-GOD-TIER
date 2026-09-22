import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { erclItems, matchErcl, type Ercl } from './packs'

// Validate the generated pack file (like the corpus guard): a schema drift or a
// truncated ingest fails here instead of silently emptying the Codex section.
const ercl = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/ercl-items.json', import.meta.url), 'utf8'),
) as Ercl

describe('ercl pack', () => {
  it('carries categorised items incl. SotE', () => {
    const items = erclItems(ercl)
    expect(items.length).toBeGreaterThan(600)
    expect(items.find((i) => i.name === 'Glintstone Pebble')?.category).toBe('Sorceries')
  })
})

describe('matchers', () => {
  it('ignores short queries and matches by name', () => {
    expect(matchErcl('gl', erclItems(ercl))).toEqual([])
    expect(matchErcl('comet', erclItems(ercl)).length).toBeGreaterThan(0)
  })
})
