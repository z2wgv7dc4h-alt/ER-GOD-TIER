import { describe, expect, it } from 'vitest'
import { relatedFor, relatedIds, targetModule } from './related'

function group(id: string, key: string) {
  return relatedFor(id).groups.find((g) => g.key === key)
}

function linkedIds(id: string, key: string) {
  return (group(id, key)?.links ?? []).map((l) => l.factId)
}

function labels(id: string, key: string) {
  return (group(id, key)?.links ?? []).map((l) => l.label)
}

// Three real entities with known, game-accurate connections. Every assertion
// below is an edge that already exists in catalog.ts / endings.ts / loot.ts —
// nothing here is authored by this task.
describe('relatedFor — item: item:fingerslayer (Fingerslayer Blade)', () => {
  it('requires the boss whose festival opens Nokron', () => {
    expect(linkedIds('item:fingerslayer', 'requires')).toContain('boss:radahn')
  })

  it('is used in the Ranni quest step that recovers it', () => {
    expect(linkedIds('item:fingerslayer', 'usedIn')).toContain('quest:ranni:nokron')
  })

  it('leads to Astel, the boss it gates in the catalog graph', () => {
    expect(linkedIds('item:fingerslayer', 'leadsTo')).toContain('boss:astel')
  })

  it('is a beat of the Age of Stars route', () => {
    expect(labels('item:fingerslayer', 'lines').some((l) => l.includes('Age of Stars'))).toBe(true)
  })
})

describe('relatedFor — boss: boss:godrick (Godrick the Grafted)', () => {
  it('requires Margit', () => {
    expect(linkedIds('boss:godrick', 'requires')).toContain('boss:margit')
  })

  it('grants both his Great Rune and remembrance', () => {
    const drops = linkedIds('boss:godrick', 'grants')
    expect(drops).toContain('item:godrick-great-rune')
    expect(drops).toContain('item:remembrance-grafted')
  })

  it('is a real Atlas pin, so the link opens the map', () => {
    expect(linkedIds('boss:godrick', 'atlas')).toContain('boss:godrick')
    expect(targetModule('boss:godrick')).toBe('map')
  })

  it('is a beat of the default Elden Lord route', () => {
    expect(labels('boss:godrick', 'lines').some((l) => l.includes('Elden Lord'))).toBe(true)
  })
})

describe('relatedFor — quest step: quest:ranni:service', () => {
  it('requires Liurnia Lake Shore and opens it on the Atlas', () => {
    expect(linkedIds('quest:ranni:service', 'requires')).toContain('grace:lake-shore')
    expect(targetModule('grace:lake-shore')).toBe('map')
  })

  it('consumes the Black Knifeprint from the catalog graph', () => {
    expect(linkedIds('quest:ranni:service', 'consumes')).toContain('item:black-knifeprint')
  })

  it('is a beat of the Age of Stars route', () => {
    expect(labels('quest:ranni:service', 'lines').some((l) => l.includes('Age of Stars'))).toBe(true)
  })

  it('links back to its region entity', () => {
    expect(linkedIds('quest:ranni:service', 'region')).toContain('region:liurnia')
  })
})

describe('relatedFor — honesty and routing', () => {
  it('says so when an id has no real edges', () => {
    const r = relatedFor('quest:ranni:elleh')
    expect(r.hasAny).toBe(false)
    expect(r.groups).toHaveLength(0)
  })

  it('routes quests, pinned entities and items to the right rooms', () => {
    expect(targetModule('quest:ranni:nokron')).toBe('quests')
    expect(targetModule('boss:radahn')).toBe('map')
    expect(targetModule('item:fingerslayer')).toBe('codex')
    expect(targetModule('region:caelid')).toBe('codex')
  })

  it('surfaces the Task 23 engine row for a game-backed fact', () => {
    // Task 54/55: the engine row is the Left half; the bare "… Medallion" whole is
    // the authored both-halves fact and has no engine row of its own.
    const r = relatedFor('item:haligtree-medallion-left')
    expect(r.engineRow?.engineId).toBe('goods:8175')
  })

  it('canonicalises an engine id and links it to the authored fact', () => {
    const r = relatedFor('bossflag:530100')
    expect(r.canonical).toBe('boss:tree-sentinel')
    expect(linkedIds('bossflag:530100', 'alias')).toContain('boss:tree-sentinel')
    expect(r.node?.name).toBe('Tree Sentinel')
  })

  it('links a loot row to its nearest grace on the map', () => {
    const r = relatedFor('loot:rivers')
    const lootGroup = r.groups.find((g) => g.key === 'loot')
    expect(lootGroup?.links.some((l) => l.factId === 'grace:zamor' && l.module === 'map')).toBe(true)
  })

  it('exposes a flat id list for membership checks', () => {
    expect(relatedIds('item:fingerslayer')).toContain('boss:radahn')
  })
})

describe('navigation chain — item → boss → quest → map pin', () => {
  it('walks the real graph from an item back to an Atlas grace', () => {
    // item card → the boss it gates
    const boss = relatedFor('item:fingerslayer').groups
      .flatMap((g) => g.links)
      .find((l) => l.factId === 'boss:radahn')
    expect(boss?.module).toBe('map')

    // boss card → the quest festival that unlocks it
    const quest = relatedFor('boss:radahn').groups
      .flatMap((g) => g.links)
      .find((l) => l.factId === 'quest:ranni:festival')
    expect(quest?.module).toBe('quests')

    // quest step → the earlier beat it depends on
    const earlier = relatedFor('quest:ranni:festival').groups
      .flatMap((g) => g.links)
      .find((l) => l.factId === 'quest:ranni:service')
    expect(earlier?.module).toBe('quests')

    // that step → a real Atlas grace pin
    const grace = relatedFor('quest:ranni:service').groups
      .flatMap((g) => g.links)
      .find((l) => l.factId === 'grace:lake-shore')
    expect(grace?.module).toBe('map')
  })
})
