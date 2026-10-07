import { describe, expect, it } from 'vitest'
import type { Character } from '../types'
import { getEntity, status } from '../lib/entityGraph'
import { kindStatus, overlayEntity, trackActionLabel } from './pageModel'

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    source: 'empty',
    platform: 'ps5',
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

describe('pageModel — reference kinds (Task 166 §11)', () => {
  it('types guide/secret/recipe/wiki entities as reference, never owned', () => {
    for (const id of ['guide:some-guide', 'secret:some-secret', 'wiki:some-page', 'recipe:fire-pot']) {
      const kind = getEntity(id).kind
      expect(kind, id).toBe('mechanic')
      // The footer's owned toggle is gone for these.
      expect(trackActionLabel(kind, false), id).toBeNull()
    }
  })

  it('still types a real item as ownable', () => {
    expect(trackActionLabel('item', false)).toBe('Mark owned')
  })
})

describe('pageModel — region "Visited" uses structured equality (Task 166 §20)', () => {
  it('resolves region labels through the structured map, not the display name', () => {
    // The Realm of Shadow ("region:shadow") carries the region "Gravesite Plain".
    // The old substring test compared "realm of shadow" to "Gravesite Plain" and
    // missed; equality through `regionFactFor` catches it.
    const c = baseCharacter({ discoveredGraces: ['grace:gravesite'] })
    const entity = overlayEntity('region:shadow')
    const line = kindStatus('region', status('region:shadow', c), entity, undefined, c)
    expect(line.label).toBe('Visited')
  })

  it('marks a region visited from knowledge in the same structured region', () => {
    const c = baseCharacter({ discoveredGraces: ['grace:first-step'] })
    const entity = overlayEntity('region:limgrave')
    const line = kindStatus('region', status('region:limgrave', c), entity, undefined, c)
    expect(line.label).toBe('Visited')
    expect(line.why).toMatch(/First Step/i)
  })

  it('keeps a region unvisited when the known fact sits in another region', () => {
    const c = baseCharacter({ discoveredGraces: ['grace:lake-shore'] })
    const entity = overlayEntity('region:limgrave')
    const line = kindStatus('region', status('region:limgrave', c), entity, undefined, c)
    expect(line.label).not.toBe('Visited')
  })
})
