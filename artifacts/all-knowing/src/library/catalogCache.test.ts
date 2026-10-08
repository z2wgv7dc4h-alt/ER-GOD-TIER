import { describe, expect, it } from 'vitest'
import { cachedBuildCatalog, type CatalogInput } from './catalog'

/**
 * Task 185 §1 — the UI crawl's search screens hung because the catalogue was
 * reconstructed on every interaction. This guards the fix: the builder is keyed
 * by the reference datasets, so re-rendering for a rail click (or any future
 * dep that arrives with an equal value) returns the already-built catalogue
 * instead of paying the multi-second build again.
 */

const fan: CatalogInput['fan'] = {
  armors: [],
  talismans: [],
  spells: [],
  ashes: [],
  spirits: [],
  items: [],
  locations: [],
  creatures: [],
  bosses: [],
  npcs: [],
  ammos: [],
  classes: [],
  weapons: [],
  shields: [],
}

/** One shared set of dataset references, like the hook holds between renders. */
const datasets = {
  fan,
  armoryWeapons: [],
  armoryBosses: [],
  weapons: [],
  recipes: [],
  secrets: [],
  acquisitions: [],
  guides: [],
  bossCombat: [],
  dialogue: [],
  index: [],
  guideItems: [],
} satisfies CatalogInput

function input(overrides: Partial<CatalogInput> = {}): CatalogInput {
  return { ...datasets, ...overrides }
}

describe('cachedBuildCatalog (Task 185 §1)', () => {
  it('reuses the built catalogue when only the input wrapper object changes', () => {
    const first = cachedBuildCatalog(input())
    const second = cachedBuildCatalog(input())
    expect(second).toBe(first)
  })

  it('rebuilds when a source dataset reference changes', () => {
    const first = cachedBuildCatalog(input())
    // A fresh array reference (as a real reload produces) must invalidate.
    const changed = cachedBuildCatalog(input({ recipes: [] }))
    expect(changed).not.toBe(first)
  })

  it('does not rebuild on the category the user is browsing', () => {
    // The builder has no category input; calling it again with the same
    // references is a no-op regardless of what the UI is showing.
    const first = cachedBuildCatalog(input())
    const again = cachedBuildCatalog(input())
    expect(again.entities).toBe(first.entities)
    expect(again.byCategory).toBe(first.byCategory)
    expect(again.weaponByName).toBe(first.weaponByName)
  })
})
