import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { scadutreeFragments } from '../knowledge/collectibles'
import type { GuideItem } from './guide'
import { blessingLine, blessingProgress, blessingSets, isSoteRun } from './blessings'

const catalog = JSON.parse(
  readFileSync(new URL('../../public/sourced/guide/catalog.json', import.meta.url), 'utf8'),
) as GuideItem[]

const count = (category: string) => catalog.filter((i) => i.category === category).length

describe('blessing meter totals are the real in-repo guide counts', () => {
  it('matches the guide catalog category row counts', () => {
    expect(count('scadutree-fragment')).toBe(50)
    expect(count('revered-spirit-ash')).toBe(25)
    for (const set of blessingSets) {
      expect(set.total, set.id).toBe(count(set.category))
    }
  })
})

describe('blessingProgress', () => {
  it('is count-only (no level) because no threshold table is in-repo', () => {
    const [scadu] = blessingProgress(catalog, [])
    expect(scadu.level).toBeUndefined()
    expect(scadu.listCount).toBe(50)
    expect(scadu.incomplete).toBe(false)
    expect(blessingLine(scadu)).toContain('Lv —')
    expect(blessingLine(scadu)).toContain('0/50 fragments')
  })

  it('does not claim 100% for a partial or empty collection', () => {
    const none = blessingProgress(catalog, [])
    expect(none.every((p) => p.done === 0 && p.done < p.total)).toBe(true)

    const some = blessingProgress(catalog, ['scadutree-fragment-01', 'scadutree-fragment-02'])
    const scadu = some.find((p) => p.id === 'scadutree')!
    expect(scadu.done).toBe(2)
    expect(scadu.done).toBeLessThan(scadu.total)
  })

  it('reaches the full count only with the whole guide list', () => {
    const all = catalog.filter((i) => i.category === 'revered-spirit-ash').map((i) => i.id)
    const [scadu, ash] = blessingProgress(catalog, all)
    expect(scadu.done).toBe(0)
    expect(ash.done).toBe(25)
    expect(ash.done).toBe(ash.total)
  })

  it('ignores the partial collectibles.ts pin ids (does not double-count)', () => {
    const pins = scadutreeFragments.map((f) => f.id)
    expect(pins.length).toBeLessThan(50)
    const [scadu] = blessingProgress(catalog, pins)
    // frag:* ids are not guide rows, so they contribute nothing to the meter.
    expect(scadu.done).toBe(0)
    expect(scadu.total).toBe(50)
  })
})

describe('isSoteRun', () => {
  it('is true once the Realm of Shadow is known or the interview says so', () => {
    expect(isSoteRun(emptyCharacter)).toBe(false)
    expect(isSoteRun({ ...emptyCharacter, answers: { dlc: 'sote' } })).toBe(true)
    expect(isSoteRun({ ...emptyCharacter, answers: { soteStart: 'yes' } })).toBe(true)
    expect(isSoteRun({ ...emptyCharacter, collectedItems: ['region:shadow'] })).toBe(true)
    expect(isSoteRun({ ...emptyCharacter, collectedItems: ['item:shadow-realm-blessing'] })).toBe(true)
  })
})
