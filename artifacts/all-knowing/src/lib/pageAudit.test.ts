import { afterEach, describe, expect, it } from 'vitest'
import { canonicalName, hasBadCasing } from './canonicalNames'
import { clearEntityIndex, setEntityIndex, type EntityRecord } from './entityIndex'
import { isNavigationalWikiPage } from './wikiSearch'
import { auditPages } from './pageAudit'

function record(over: Partial<EntityRecord> & { id: string; kind: string; name: string }): EntityRecord {
  return { sources: [], ...over }
}

afterEach(() => clearEntityIndex())

describe('canonical names (Task 144 §1)', () => {
  it('restores the in-game spelling for title-cased dump names', () => {
    expect(canonicalName('Axe Of Godfrey')).toBe('Axe of Godfrey')
    expect(canonicalName('Ranni The Witch')).toBe('Ranni the Witch')
  })

  it('reports names whose spelling is not canonical', () => {
    expect(hasBadCasing('Axe Of Godfrey')).toBe(true)
    expect(hasBadCasing('Axe of Godfrey')).toBe(false)
  })
})

describe('wiki navigation filter (Task 144 §1)', () => {
  it('flags disambiguation and list/index pages', () => {
    expect(isNavigationalWikiPage({ title: 'Margit, the Fell Omen (disambiguation)', entityId: 'wiki:margit-the-fell-omen-disambiguation' })).toBe(true)
    expect(isNavigationalWikiPage({ title: 'List of Bosses', entityId: 'wiki:list-of-bosses' })).toBe(true)
    expect(isNavigationalWikiPage({ title: 'Bosses index', entityId: 'wiki:bosses-index' })).toBe(true)
    expect(isNavigationalWikiPage({ title: 'Margit, the Fell Omen', entityId: 'boss:margit' })).toBe(false)
  })
})

describe('page audit (Task 144 §4)', () => {
  it('counts the page faults before the fixes and clears them after', () => {
    setEntityIndex(
      new Map([
        ['bosses:test', record({ id: 'bosses:test', kind: 'boss', name: 'Axe Of Godfrey', description: 'Found at item:foo and AEG099_821.' })],
        ['region:test', record({ id: 'region:test', kind: 'region', name: 'Stormveil Castle', location: 'Stormveil' })],
      ]),
    )
    const before = auditPages({ fixed: false })
    const boss = before.byKind.find((k) => k.kind === 'boss')
    expect(boss?.badCasing).toBe(1)
    expect(boss?.rawId).toBe(1)
    const region = before.byKind.find((k) => k.kind === 'region')
    expect(region?.wrongActions).toBe(1)

    const after = auditPages({ fixed: true })
    expect(after.byKind.find((k) => k.kind === 'boss')?.flagged).toBe(0)
    expect(after.byKind.find((k) => k.kind === 'region')?.flagged).toBe(0)
  })
})
