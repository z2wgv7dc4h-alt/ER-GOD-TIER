import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { scadutreeFragments } from '../knowledge/collectibles'
import type { GuideItem } from './guide'
import { blessingLine, blessingProgress, blessingSets, isSoteRun, levelFromCount } from './blessings'

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
  it('computes the blessing level from the cited threshold table', () => {
    const [scadu] = blessingProgress(catalog, [])
    expect(scadu.level).toBe(0)
    expect(blessingLine(scadu)).toContain('Lv 0')
    expect(blessingLine(scadu)).toContain('0/50 fragments')

    const five = catalog.filter((i) => i.category === 'scadutree-fragment').slice(0, 5).map((i) => i.id)
    const scadu5 = blessingProgress(catalog, five)[0]
    // Cumulative thresholds: level 3 needs 5 fragments, level 4 needs 7.
    expect(scadu5.level).toBe(3)
    expect(blessingLine(scadu5)).toContain('Lv 3')
  })

  it('levelFromCount matches the published cumulative tables', () => {
    expect(levelFromCount(0, blessingSets[0].thresholds)).toBe(0)
    expect(levelFromCount(1, blessingSets[0].thresholds)).toBe(1)
    expect(levelFromCount(4, blessingSets[0].thresholds)).toBe(2)
    expect(levelFromCount(7, blessingSets[0].thresholds)).toBe(4)
    expect(levelFromCount(50, blessingSets[0].thresholds)).toBe(20)
    expect(levelFromCount(25, blessingSets[1].thresholds)).toBe(10)
    // The last threshold must equal the set total, or the meter can never max.
    for (const set of blessingSets) {
      expect(set.thresholds[0], set.id).toBe(0)
      expect(set.thresholds[set.thresholds.length - 1], set.id).toBe(set.total)
    }
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
