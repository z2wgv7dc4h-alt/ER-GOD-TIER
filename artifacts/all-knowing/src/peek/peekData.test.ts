import { beforeEach, describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { registerEntityGraphData } from '../lib/entityGraph'
import { autolinkMechanics, mechanicTermIds } from '../lib/glossary'
import type { Weapon } from '../lib/ar'
import { clearPeekData, peekInfo, registerPeekRow } from './peekData'

/**
 * Task 115 §3 — peek content per kind and glossary term detection. These are
 * pure checks: `peekInfo` is synchronous and every fact is either derived from
 * the entity graph, an authored mechanic card, or a registered catalogue row.
 */

function fakeWeapon(): Weapon {
  const graph = Array.from({ length: 150 }, (_, i) => (i > 0 ? 1 : 0))
  return {
    name: 'Test Blade',
    weaponName: 'Test Blade',
    url: null,
    affinityId: 0,
    weaponType: 0,
    requirements: { str: 10 },
    attributeScaling: [{ str: 0.5 }],
    attack: [{ 0: 100 }],
    attackElementCorrect: { 0: { str: true } },
    calcCorrectGraphs: { 0: graph } as Weapon['calcCorrectGraphs'],
    scalingTiers: [
      [1.75, 'S'],
      [1.4, 'A'],
      [0.9, 'B'],
      [0.6, 'C'],
      [0.25, 'D'],
      [0.01, 'E'],
    ],
    dlc: false,
  }
}

function factValue(info: ReturnType<typeof peekInfo>, label: string): string | undefined {
  return info.facts.find((f) => f.label === label)?.value
}

beforeEach(() => {
  clearPeekData()
})

describe('peekInfo weapon facts (Task 115 §1)', () => {
  it('shows AR at my stats, scaling, requirements ✓ and weight', () => {
    registerPeekRow({
      factId: 'item:test-blade',
      name: 'Test Blade',
      category: 'weapons',
      weight: 6.5,
      requirements: { str: 10 },
      scaling: { str: 'B' },
      weapon: fakeWeapon(),
    })
    const info = peekInfo('item:test-blade', emptyCharacter)
    expect(info.kind).toBe('weapon')
    expect(factValue(info, 'Attack at my stats')).toBe('150')
    expect(factValue(info, 'Scaling')).toBe('Str B')
    const req = info.facts.find((f) => f.label === 'Requirements')
    expect(req?.value).toContain('Str 10')
    expect(req?.ok).toBe(true)
    expect(factValue(info, 'Weight')).toBe('6.5')
  })

  it('flags an unmet requirement with ✗ semantics', () => {
    registerPeekRow({
      factId: 'item:test-blade',
      category: 'weapons',
      requirements: { str: 40 },
    })
    const req = peekInfo('item:test-blade', emptyCharacter).facts.find((f) => f.label === 'Requirements')
    expect(req?.ok).toBe(false)
    expect(req?.value).toContain('not met')
  })
})

describe('peekInfo armor / talisman facts', () => {
  it('shows poise, negation and weight for armor', () => {
    registerPeekRow({
      factId: 'item:test-armor',
      category: 'armor',
      weight: 9.2,
      stats: [
        { label: 'Poise', value: '22' },
        { label: 'Negation', value: 'strike 12 · fire 8' },
      ],
    })
    const info = peekInfo('item:test-armor')
    expect(info.kind).toBe('armor')
    expect(factValue(info, 'Poise')).toBe('22')
    expect(factValue(info, 'Negation')).toBe('strike 12 · fire 8')
    expect(factValue(info, 'Weight')).toBe('9.2')
  })

  it('shows a talisman effect', () => {
    registerPeekRow({
      factId: 'item:test-talisman',
      category: 'talismans',
      stats: [{ label: 'Effect', value: 'Raises maximum HP by 4%' }],
    })
    const info = peekInfo('item:test-talisman')
    expect(info.kind).toBe('talisman')
    expect(factValue(info, 'Effect')).toContain('maximum HP')
  })
})

describe('peekInfo boss facts', () => {
  it('reads weak to / resists from the entity graph', () => {
    registerEntityGraphData({
      bossCombat: [
        {
          factId: 'boss:margit',
          name: 'Margit, the Fell Omen',
          negation: { fire: -20, holy: 15 },
        },
      ],
    })
    registerPeekRow({
      factId: 'boss:margit',
      category: 'bosses',
      stats: [{ label: 'Base HP', value: '4174' }],
    })
    const info = peekInfo('boss:margit', emptyCharacter)
    expect(factValue(info, 'Weak to')).toContain('Fire')
    expect(factValue(info, 'Resists')).toContain('Holy')
    expect(factValue(info, 'Base HP')).toBe('4174')
  })
})

describe('peekInfo npc / grace facts', () => {
  it('reports where an NPC is now', () => {
    const info = peekInfo('npc:blaidd', emptyCharacter)
    expect(factValue(info, 'Where now')).toBeTruthy()
  })

  it('reports the next quest step for an NPC with a storyline', () => {
    const info = peekInfo('npc:millicent', emptyCharacter)
    expect(factValue(info, 'Quest step')).toContain('Unalloyed Gold Needle')
  })

  it('reports a grace region and discovery status', () => {
    const info = peekInfo('grace:mistwood', emptyCharacter)
    expect(info.kind).toBe('grace')
    expect(factValue(info, 'Discovered')).toBe('Not yet')
  })
})

describe('peekInfo mechanic facts', () => {
  it('uses the authored card numbers and a short definition', () => {
    const info = peekInfo('mechanic:poise')
    expect(info.kind).toBe('mechanic')
    expect(info.facts.length).toBeGreaterThan(0)
    expect(info.summary).toBeTruthy()
    expect(info.summary!.length).toBeLessThanOrEqual(241)
  })
})

describe('glossary term detection (Task 115 §2)', () => {
  it('detects mechanic terms and only mechanic terms', () => {
    const ids = mechanicTermIds('Poise decides whether you get staggered')
    expect(ids).toContain('mechanic:poise')
  })

  it('returns link segments tagged as mechanic', () => {
    const segs = autolinkMechanics('Poise and stamina both matter')
    expect(segs.length).toBeGreaterThan(0)
    expect(segs.every((s) => s.kind === 'mechanic' && Boolean(s.id))).toBe(true)
  })

  it('exposes AR and scaling-letter cards as real terms', () => {
    const ids = mechanicTermIds('Attack rating grows with the scaling grade')
    expect(ids).toContain('mechanic:attack-rating')
    expect(ids).toContain('mechanic:scaling-letters')
  })
})
