import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from '../lib/infer'
import { inferChains } from './inferChains'

/**
 * Task 94 — the Setup wizard's inference rules. Great Rune → shardbearer,
 * remembrance → boss, grace → region and key item → access already ride on the
 * catalog rows; the Dectus halves and the merchant Bell Bearings are the new
 * entries in the chain table. Each rule is exercised through the real closer.
 */

function known(c: Character, id: string): boolean {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

const bellBearingChains = inferChains.filter((c) => c.whenFact.startsWith('bell-bearing-'))
const dectusChains = inferChains.filter((c) => c.whenFact.startsWith('item:dectus-medallion-'))

describe('Setup wizard inference rules', () => {
  it('Great Rune → its shardbearer is dead', () => {
    const after = applyFacts(emptyCharacter, ['item:radahn-great-rune'], 'screenshot', 'setup:inventory')
    expect(after.defeatedBosses).toContain('boss:radahn')
  })

  it('remembrance → its boss is dead', () => {
    const after = applyFacts(emptyCharacter, ['item:remembrance-omen-king'], 'screenshot', 'setup:inventory')
    expect(after.defeatedBosses).toContain('boss:morgott')
  })

  it('a discovered grace → its region was reached', () => {
    const after = applyFacts(emptyCharacter, ['grace:lake-shore'], 'screenshot', 'setup:graces')
    expect(known(after, 'region:liurnia')).toBe(true)
  })

  it('a key item → the access it grants', () => {
    expect(known(applyFacts(emptyCharacter, ['item:academy-glintstone-key'], 'screenshot', 'setup:inventory'), 'region:liurnia')).toBe(true)
    expect(known(applyFacts(emptyCharacter, ['item:dusk-medallion'], 'screenshot', 'setup:inventory'), 'region:altus')).toBe(true)
  })

  it('has a bell-bearing rule for every named bearing and each one reaches a region', () => {
    expect(bellBearingChains.length).toBeGreaterThan(0)
    for (const chain of bellBearingChains) {
      const after = applyFacts(emptyCharacter, [chain.whenFact], 'screenshot', 'setup:inventory')
      for (const target of chain.implies) {
        expect(known(after, target), `${chain.whenFact} → ${target}`).toBe(true)
      }
    }
  })

  it('does not open the Dectus lift from one half, only from both', () => {
    expect(dectusChains.length).toBeGreaterThan(0)
    const left = applyFacts(emptyCharacter, ['item:dectus-medallion-left'], 'screenshot', 'setup:inventory')
    expect(known(left, 'item:dusk-medallion')).toBe(false)
    const both = applyFacts(left, ['item:dectus-medallion-right'], 'screenshot', 'setup:inventory')
    expect(known(both, 'item:dusk-medallion')).toBe(true)
    expect(known(both, 'region:altus')).toBe(true)
  })
})
