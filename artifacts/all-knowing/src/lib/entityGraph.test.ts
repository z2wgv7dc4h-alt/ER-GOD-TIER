import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Character } from '../types'
import {
  canonicalEntityId,
  edges,
  edgesByRel,
  entityName,
  getEntity,
  registerEntityGraphData,
  status,
  type AnyEdgeRel,
} from './entityGraph'

function combatRows() {
  return JSON.parse(readFileSync(new URL('../../public/sourced/npc-combat.json', import.meta.url), 'utf8'))
}

function recipeRows() {
  const doc = JSON.parse(readFileSync(new URL('../../public/sourced/open/recipes.json', import.meta.url), 'utf8'))
  return doc.recipes as { name: string; materials: { name: string; qty: number }[] }[]
}

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    source: 'empty',
    platform: 'pc',
    regulation: '1.17',
    name: 'Test',
    level: 1,
    startingClass: 'unknown',
    stats: { vigor: 10, mind: 10, endurance: 10, strength: 10, dexterity: 10, intelligence: 10, faith: 10, arcane: 10 },
    loadout: [],
    defeatedBosses: [],
    discoveredGraces: [],
    collectedItems: [],
    completedQuestSteps: [],
    deniedFacts: [],
    answers: {},
    evidence: [],
    shots: [],
    ...over,
  }
}

function rels(id: string, rel: AnyEdgeRel): string[] {
  return edgesByRel(id, rel).map((e) => e.to)
}

describe('entityGraph — resolution and id authority', () => {
  it('resolves an authored catalog fact', () => {
    const e = getEntity('boss:godrick')
    expect(e.kind).toBe('boss')
    expect(e.name).toBe('Godrick the Grafted')
  })

  it('canonicalises an engine row id to the authored slug', () => {
    expect(canonicalEntityId('bossflag:530100')).toBe('boss:tree-sentinel')
    expect(getEntity('bossflag:530100').name).toBe('Tree Sentinel')
  })

  it('aliases a loot row onto the canonical item id', () => {
    expect(canonicalEntityId('loot:uchigatana')).toBe('item:uchigatana')
    const e = getEntity('item:uchigatana')
    expect(e.name).toBe('Uchigatana')
    expect(e.kind).toBe('weapon')
  })

  it('resolves an id by name through the entity index', () => {
    expect(canonicalEntityId('weapons:uchigatana', 'Uchigatana')).toBe('item:uchigatana')
  })

  it('falls back to a stub for an unknown id', () => {
    const e = getEntity('item:not-a-real-thing')
    expect(e.id).toBe('item:not-a-real-thing')
    expect(e.kind).toBe('item')
  })
})

describe('entityGraph — every relationship type has a real example', () => {
  it('drops', () => {
    expect(rels('boss:godrick', 'drops')).toContain('item:remembrance-grafted')
  })

  it('soldBy', () => {
    const sold = edges('item:finger-seal').filter((e) => e.rel === 'soldBy')
    expect(sold.length).toBeGreaterThan(0)
  })

  it('foundIn (region)', () => {
    expect(rels('item:uchigatana', 'foundIn')).toContain('region:limgrave')
  })

  it('requires', () => {
    expect(rels('item:fingerslayer', 'requires')).toContain('boss:radahn')
  })

  it('unlocks (derived reverse of requires)', () => {
    expect(rels('boss:radahn', 'unlocks')).toContain('item:fingerslayer')
  })

  it('locks', () => {
    expect(rels('gate:forge', 'locks')).toContain('item:bolt-of-gransax')
  })

  it('partOfQuest', () => {
    expect(rels('quest:millicent:needle', 'partOfQuest')).toContain('line:millicent')
  })

  it('nextBeat', () => {
    expect(rels('quest:millicent:needle', 'nextBeat')).toContain('quest:millicent:cured')
  })

  it('goodForBuild', () => {
    expect(rels('build:rivers', 'goodForBuild')).toContain('item:rivers-of-blood')
  })

  it('tradedFor', () => {
    const traded = edges('item:remembrance-grafted').filter((e) => e.rel === 'tradedFor')
    expect(traded.length).toBeGreaterThan(0)
    expect(traded.map((e) => e.label)).toContain('Axe of Godrick')
  })

  it('upgradeMaterial', () => {
    const mats = rels('mechanic:upgrades', 'upgradeMaterial')
    expect(mats.length).toBeGreaterThan(0)
  })

  it('relatedLore', () => {
    expect(rels('build:rivers', 'relatedLore')).toContain('boss:malenia')
  })

  describe('once combat data is registered', () => {
    beforeAll(() => {
      registerEntityGraphData({ bossCombat: combatRows() })
    })

    it('weakTo', () => {
      expect(edges('boss:maliketh').some((e) => e.rel === 'weakTo' && e.to === 'damage:fire')).toBe(true)
    })

    it('resists', () => {
      expect(edges('boss:margit').some((e) => e.rel === 'resists' && e.to === 'damage:holy')).toBe(true)
    })
  })
})

describe('entityGraph — crafted from and reverse edges', () => {
  beforeAll(() => {
    registerEntityGraphData({ recipes: recipeRows() })
  })

  it('craftedFrom links a recipe to its materials', () => {
    const recipe = recipeRows()[0]
    const crafted = edgesByRel(recipe.name, 'craftedFrom')
    expect(crafted.length).toBeGreaterThan(0)
    expect(crafted.some((e) => e.label === recipe.materials[0].name)).toBe(true)
  })

  it('derives droppedBy from an authored drops edge', () => {
    expect(rels('item:remembrance-grafted', 'droppedBy')).toContain('boss:godrick')
  })

  it('keeps symmetric relationships on both endpoints', () => {
    expect(rels('boss:maliketh', 'weakTo')).toContain('damage:fire')
    expect(rels('damage:fire', 'weakTo')).toContain('boss:maliketh')
  })

  it('derives previousBeat from an authored nextBeat edge', () => {
    expect(rels('quest:millicent:cured', 'previousBeat')).toContain('quest:millicent:needle')
  })
})

describe('entityGraph — status', () => {
  it('reports owned for a collected item', () => {
    const c = baseCharacter({ collectedItems: ['item:fingerslayer'] })
    expect(status('item:fingerslayer', c).state).toBe('owned')
  })

  it('reports done for a defeated boss', () => {
    const c = baseCharacter({ defeatedBosses: ['boss:godrick'] })
    expect(status('boss:godrick', c).state).toBe('done')
  })

  it('reports available when nothing blocks it', () => {
    expect(status('boss:rykard', baseCharacter()).state).toBe('available')
  })

  it('reports locked when a gate is one beat away', () => {
    const c = baseCharacter({ defeatedBosses: ['boss:fire-giant'] })
    const s = status('item:bolt-of-gransax', c)
    expect(s.state).toBe('locked')
    expect(s.why).toMatch(/Forge/)
  })

  it('reports missed once the gate has fired', () => {
    const c = baseCharacter({ completedQuestSteps: ['quest:erdtree-burned'] })
    const s = status('item:bolt-of-gransax', c)
    expect(s.state).toBe('missed')
    expect(s.why).toMatch(/passed/)
  })

  it('reports ahead when prerequisites are not yet reached', () => {
    const s = status('item:fingerslayer', baseCharacter())
    expect(s.state).toBe('ahead')
    expect(s.why).toMatch(/reach/)
    expect(s.why).toMatch(/Radahn/)
  })

  it('gives entityName without throwing for unknown ids', () => {
    expect(entityName('item:mystery')).toBe('mystery')
  })
})
