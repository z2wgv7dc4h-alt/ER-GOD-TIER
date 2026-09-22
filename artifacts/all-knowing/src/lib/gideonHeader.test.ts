import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from './infer'
import { gideonHeader } from './gideonHeader'

/**
 * Golden fixture from Tasks 53/68: Radahn dead, Ranni's service accepted,
 * Rogier's knifeprint handed in, Fingerslayer NOT yet given.
 */
const TRUE_FACTS = [
  'boss:margit',
  'boss:godrick',
  'boss:rennala',
  'boss:radahn',
  'quest:ranni:service',
  'item:black-knifeprint',
  'quest:rogier:knifeprint',
  'quest:varre:met',
  'quest:fia:met',
  'quest:fia:dagger',
  'invader:ensha',
  'quest:thops:met',
]

const withGoal: Character = {
  ...applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'gideon header fixture'),
  answers: { gideonGoal: 'ranni' },
}

describe('gideonHeader', () => {
  it('golden fixture: the goal + Ranni beat is the Fingerslayer hand-in', () => {
    const header = gideonHeader(withGoal)
    expect(header.goal).toBe('Ranni, the Witch')
    expect(header.beat).toMatch(/Fingerslayer/i)
    expect(header.factId).toBe('item:fingerslayer')
    // Reuses the router's standing offer, not a cloned chat bubble.
    expect(header.offer).toEqual({ label: 'Show it', prompt: 'yes show me on the map and give instructions' })
  })

  it('falls back to the first idle suggestion when no goal is set', () => {
    const header = gideonHeader(applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'no goal'))
    expect(header.goal).toBeUndefined()
    expect(header.beat).toBeTruthy()
    expect(header.factId).toBeTruthy()
    expect(header.offer).toBeUndefined()
  })

  it('is pure — never mutates the character', () => {
    const before = JSON.stringify(withGoal)
    gideonHeader(withGoal)
    expect(JSON.stringify(withGoal)).toBe(before)
  })
})
