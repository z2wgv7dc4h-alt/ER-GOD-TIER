import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  erclItems,
  ermLocations,
  matchErcl,
  matchErm,
  type EldenringMap,
  type Ercl,
} from './packs'

// Validate the generated pack files (like the corpus guard): a schema drift or
// a truncated ingest fails here instead of silently emptying the Codex sections.
const erm = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/eldenringmap.json', import.meta.url), 'utf8'),
) as EldenringMap
const ercl = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/ercl-items.json', import.meta.url), 'utf8'),
) as Ercl

describe('eldenringmap pack', () => {
  it('has locations in the engine frame', () => {
    const locs = ermLocations(erm)
    expect(locs.length).toBeGreaterThan(400)
    const firstStep = locs.find((l) => l.name === 'The First Step')
    expect(firstStep).toMatchObject({ kind: 'graces', region: 'Limgrave', world: 'overworld' })
  })

  it('has DLC collectibles', () => {
    expect(erm.collectibles.golden_seed.length).toBeGreaterThan(40)
    expect(erm.collectibles.scadutree.length).toBeGreaterThan(30)
  })
})

describe('ercl pack', () => {
  it('carries categorised items incl. SotE', () => {
    const items = erclItems(ercl)
    expect(items.length).toBeGreaterThan(600)
    expect(items.find((i) => i.name === 'Glintstone Pebble')?.category).toBe('Sorceries')
  })
})

describe('matchers', () => {
  it('ignore short queries and match by name', () => {
    expect(matchErm('li', ermLocations(erm))).toEqual([])
    expect(matchErcl('gl', erclItems(ercl))).toEqual([])
    expect(matchErm('limgrave', ermLocations(erm)).length).toBeGreaterThan(0)
    expect(matchErcl('comet', erclItems(ercl)).length).toBeGreaterThan(0)
  })
})
