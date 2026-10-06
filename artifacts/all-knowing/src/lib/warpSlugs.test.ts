import { describe, expect, it } from 'vitest'
import { byId } from '../knowledge/catalog'
import { canonicalFactId, generatedAliases } from './aliases'
import { searchSync } from './search'

/**
 * Task 160: an engine warp must canonicalise onto the `grace:<warpId>` record
 * the enrichment index already holds, not a synthetic `grace:{name-slug}` stub
 * the app has no page for (that left "Related" chips and search rows dead).
 * These five were the representative ghost slugs from the Task 157 audit.
 */
const CASES: [name: string, warpId: string][] = [
  ['Gateside Chamber', 'grace:100003'],
  ['Liftside Chamber', 'grace:100006'],
  ['Ainsel River Main', 'grace:120104'],
  ['Grand Cloister', 'grace:120108'],
  ['West Capital Rampart', 'grace:110005'],
]

describe('Task 160 warp ids resolve to real grace records', () => {
  for (const [name, slug] of CASES) {
    it(`canonicalises the ${name} warp to ${slug}`, () => {
      expect(canonicalFactId(slug)).toBe(slug)
    })

    it(`finds ${name} in searchSync as ${slug}`, () => {
      const hits = searchSync(name)
      expect(
        hits.some((h) => h.id === slug),
        `no ${slug} in [${hits.map((h) => h.id).join(', ')}]`,
      ).toBe(true)
    })
  }

  it('leaves exactly one ghost stub, the hosted Prince of Death’s Throne grace', () => {
    const stubs = generatedAliases.filter((r) => r.source === 'grace-stub')
    // Task 160 tracked the 354 ghost warps down to this single hosted grace that
    // has no enrichment record yet (`hosted-graces.id grace:120300`).
    expect(stubs.map((r) => r.engineId)).toEqual(['grace:120300'])
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
