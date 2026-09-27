import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { completionCategories } from './completionView'

describe('completion categories (Task 100 §5)', () => {
  it('covers every category named in the task with honest totals', () => {
    const cats = completionCategories(emptyCharacter)
    const ids = cats.map((c) => c.id)
    for (const wanted of [
      'bosses',
      'graces',
      'items',
      'spirit-ashes',
      'crystal-tears',
      'cookbooks',
      'bell-bearings',
      'map-fragments',
      'scadutree',
    ]) {
      expect(ids).toContain(wanted)
    }
    expect(cats.find((c) => c.id === 'graces')!.total).toBeGreaterThan(0)
    expect(cats.find((c) => c.id === 'bosses')!.total).toBeGreaterThan(0)
  })

  it('moves a known row out of missing and into have', () => {
    const before = completionCategories(emptyCharacter)
    const graces = before.find((c) => c.id === 'graces')!
    expect(graces.missing.length).toBe(graces.total)
    expect(graces.have).toBe(0)

    const known = { ...emptyCharacter, discoveredGraces: [graces.missing[0].id] }
    const after = completionCategories(known).find((c) => c.id === 'graces')!
    expect(after.have).toBe(1)
    expect(after.missing.some((m) => m.id === graces.missing[0].id)).toBe(false)
  })

  it('only marks pin-backed categories as pinned', () => {
    const cats = completionCategories(emptyCharacter)
    expect(cats.find((c) => c.id === 'bosses')!.pinned).toBe(true)
    expect(cats.find((c) => c.id === 'graces')!.pinned).toBe(true)
    expect(cats.find((c) => c.id === 'cookbooks')!.pinned).toBe(false)
  })
})
