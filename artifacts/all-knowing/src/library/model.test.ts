import { describe, expect, it } from 'vitest'
import type { Character } from '../types'
import {
  CATEGORIES,
  COMPARE_CAP,
  addToCompare,
  applyFilters,
  buildDeepLink,
  defaultFilter,
  isOwned,
  meetsRequirements,
  parseDeepLink,
  removeFromCompare,
  sortEntities,
  toggleCompare,
  type LibraryEntity,
} from './model'

function character(overrides: Partial<Character> = {}): Character {
  return {
    source: 'empty',
    platform: 'pc',
    regulation: 'test',
    name: 'Tester',
    level: 1,
    startingClass: 'unknown',
    stats: {
      vigor: 10,
      mind: 10,
      endurance: 10,
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      faith: 10,
      arcane: 10,
    },
    loadout: [],
    defeatedBosses: [],
    discoveredGraces: [],
    collectedItems: [],
    completedQuestSteps: [],
    deniedFacts: [],
    answers: {},
    evidence: [],
    shots: [],
    ...overrides,
  }
}

function entity(overrides: Partial<LibraryEntity> = {}): LibraryEntity {
  return {
    id: 'weapons:test',
    factId: 'item:test',
    name: 'Test Blade',
    category: 'weapons',
    ...overrides,
  }
}

describe('Library model — filtering', () => {
  it('reports whether the character meets an entity’s requirements', () => {
    const blade = entity({ requirements: { str: 20, dex: 12 } })
    expect(meetsRequirements(blade, character({ stats: { ...character().stats, strength: 18, dexterity: 12 } }))).toBe(false)
    expect(meetsRequirements(blade, character({ stats: { ...character().stats, strength: 20, dexterity: 12 } }))).toBe(true)
    expect(meetsRequirements(entity(), character())).toBeNull()
  })

  it('filters out entries whose requirements the character does not meet', () => {
    const met = entity({ id: 'a', name: 'Met', requirements: { str: 12 } })
    const unmet = entity({ id: 'b', name: 'Unmet', requirements: { str: 40 } })
    const noReq = entity({ id: 'c', name: 'Free' })
    const c = character({ stats: { ...character().stats, strength: 20 } })
    const filter = { ...defaultFilter(), meets: true }
    const ids = applyFilters([met, unmet, noReq], filter, c).map((e) => e.id)
    expect(ids).toContain('a')
    expect(ids).toContain('c')
    expect(ids).not.toContain('b')
  })

  it('filters by owned / not owned', () => {
    const owned = entity({ id: 'weapons:owned', factId: 'item:owned', name: 'Owned' })
    const other = entity({ id: 'weapons:other', factId: 'item:other', name: 'Other' })
    const c = character({ collectedItems: ['item:owned'] })
    expect(isOwned(owned, c)).toBe(true)
    expect(isOwned(other, c)).toBe(false)
    expect(applyFilters([owned, other], { ...defaultFilter(), owned: 'owned' }, c).map((e) => e.id)).toEqual(['weapons:owned'])
    expect(applyFilters([owned, other], { ...defaultFilter(), owned: 'not' }, c).map((e) => e.id)).toEqual(['weapons:other'])
  })
})

describe('Library model — sorting', () => {
  const a = entity({ id: 'a', name: 'Alpha' })
  const b = entity({ id: 'b', name: 'Bravo' })
  const arFor = (e: LibraryEntity) => (e.id === 'a' ? 100 : 350)

  it('sorts by AR at the character’s stats', () => {
    expect(sortEntities([a, b], 'ar', 'desc', { arFor }).map((e) => e.id)).toEqual(['b', 'a'])
    expect(sortEntities([a, b], 'ar', 'asc', { arFor }).map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('sinks entities with no AR to the bottom regardless of direction', () => {
    const unknown = entity({ id: 'c', name: 'Unknown' })
    const arOnly = (e: LibraryEntity) => (e.id === 'c' ? undefined : 10)
    expect(sortEntities([a, unknown, b], 'ar', 'desc', { arFor: arOnly }).map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('Library model — deep links', () => {
  it('parses `#/library/search?cat=weapons&id=<factId>`', () => {
    expect(parseDeepLink('#/library/search?cat=weapons&id=item%3Auchigatana')).toEqual({
      cat: 'weapons',
      id: 'item:uchigatana',
      q: null,
    })
  })

  it('treats a bare library hash as a valid but unspecified link', () => {
    expect(parseDeepLink('#/library/search')).toEqual({ cat: null, id: null, q: null })
  })

  it('rejects non-library and unknown-category links', () => {
    expect(parseDeepLink('#/journey/map')).toBeNull()
    expect(parseDeepLink('#/library/builds?cat=weapons')).toBeNull()
    expect(parseDeepLink('#/library/search?cat=nope')).toEqual({ cat: null, id: null, q: null })
  })

  it('round-trips through buildDeepLink', () => {
    const hash = buildDeepLink('bosses', 'boss:margit')
    expect(hash).toBe('#/library/search?cat=bosses&id=boss%3Amargit')
    expect(parseDeepLink(hash)).toEqual({ cat: 'bosses', id: 'boss:margit', q: null })
  })

  it('round-trips a deep link for every category (Task 130 §4)', () => {
    for (const category of CATEGORIES) {
      const hash = buildDeepLink(category.id)
      expect(hash).toBe(`#/library/search?cat=${category.id}`)
      expect(parseDeepLink(hash), category.id).toEqual({ cat: category.id, id: null, q: null })
    }
  })
})

describe('Library model — compare tray', () => {
  it('caps the tray at four entries', () => {
    let ids: string[] = []
    for (const id of ['a', 'b', 'c', 'd', 'e']) ids = addToCompare(ids, id)
    expect(ids).toEqual(['a', 'b', 'c', 'd'])
    expect(ids.length).toBe(COMPARE_CAP)
  })

  it('does not duplicate and can toggle / remove', () => {
    const ids = addToCompare(addToCompare([], 'a'), 'a')
    expect(ids).toEqual(['a'])
    expect(toggleCompare(ids, 'a')).toEqual([])
    expect(removeFromCompare(['a', 'b'], 'a')).toEqual(['b'])
  })
})
