import { describe, expect, it } from 'vitest'
import { byId } from '../knowledge/catalog'
import { canonicalFactId, generatedAliases } from './aliases'
import { searchSync } from './search'

/**
 * Task 73: every `checklists/graces.json` warp gets a `grace:{slug}` stub from
 * its English name when no authored slug exists. These five were unmatched
 * before the pass; all exist verbatim in `open/names.json`.
 */
const CASES: [name: string, warpId: number, slug: string][] = [
  ['Gateside Chamber', 100003, 'grace:gateside-chamber'],
  ['Liftside Chamber', 100006, 'grace:liftside-chamber'],
  ['Ainsel River Main', 120104, 'grace:ainsel-river-main'],
  ['Grand Cloister', 120108, 'grace:grand-cloister'],
  ['West Capital Rampart', 110005, 'grace:west-capital-rampart'],
]

describe('Task 73 warp slug stubs', () => {
  for (const [name, warpId, slug] of CASES) {
    it(`canonicalises the ${name} warp to ${slug}`, () => {
      expect(canonicalFactId(`grace:${warpId}`)).toBe(slug)
    })

    it(`finds ${name} in searchSync as ${slug}`, () => {
      const hits = searchSync(name)
      expect(
        hits.some((h) => h.id === slug),
        `no ${slug} in [${hits.map((h) => h.id).join(', ')}]`,
      ).toBe(true)
    })
  }

  it('keeps the stubs name-only: no catalog fact, so nothing chains off them', () => {
    const stubs = generatedAliases.filter((r) => r.source === 'grace-stub')
    expect(stubs.length).toBeGreaterThan(300)
    for (const row of stubs) {
      expect(row.kind).toBe('grace')
      expect(row.engineId).not.toBe(row.slug)
      // Not a catalog grace fact: authored ids win and a stub implies nothing.
      expect(byId.has(row.slug), row.slug).toBe(false)
    }
  })

  it('leaves every engine warp id canonically resolvable', () => {
    const warps = generatedAliases.filter((r) => r.engineId.startsWith('grace:') && /^\d+$/.test(r.engineId.slice(6)))
    expect(warps.length).toBeGreaterThanOrEqual(418)
    for (const row of warps) expect(canonicalFactId(row.engineId)).toBe(row.slug)
  })
})
