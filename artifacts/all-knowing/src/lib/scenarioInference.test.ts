import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { byId } from '../knowledge/catalog'
import { inferChains } from '../knowledge/inferChains'
import { canonicalFactId } from './aliases'
import {
  scenarioCharacter,
  scenarioDirectFacts,
  scenarioUncertainReads,
} from './__fixtures__/scenarios/urmummytoilet'
import { applyFacts, knownFactIds } from './infer'

/**
 * Task 138 §2 guard — run the real-player scenario through the full pipeline and
 * assert the inferred closure covers the conclusions a knowledgeable player would
 * draw. This is the "missing certain rules" contract: if a rule regresses, the
 * scenario stops proving one of these and the test names it.
 */
const EXPECTED_CERTAIN = [
  // remembrance held -> its boss is dead
  'boss:radahn',
  // Radahn dead -> the Radahn festival opened the way to Nokron
  'quest:ranni:festival',
  'quest:ranni:service',
  // map fragments / graces -> the region was reached
  'region:limgrave',
  'region:weeping',
  'region:liurnia',
  'region:caelid',
  'region:altus',
  'region:leyndell',
  'region:mountaintops',
  'region:siofra-river',
  'region:ainsel-river',
  // Mountaintops entered -> Morgott defeated + Rold Medallion held
  'boss:morgott',
  'item:rold-medallion',
  // stat-boost talisman owned -> its single fixed source was reached
  // (covered by region:caelid / region:limgrave above)
]

function inferredIds(): Set<string> {
  const c = scenarioCharacter()
  return new Set(
    c.evidence.filter((e) => e.source === 'inference').map((e) => canonicalFactId(e.fact)),
  )
}

describe('Task 138 scenario inference guard', () => {
  it('infers every expected certain fact', () => {
    const inferred = inferredIds()
    const missing = EXPECTED_CERTAIN.filter((id) => !inferred.has(canonicalFactId(id)))
    expect(missing, `missing inferred: ${missing.join(', ')}`).toEqual([])
  })

  it('records the reason chain for Mountaintops -> Rold Medallion', () => {
    const c = scenarioCharacter()
    const rold = c.evidence.find((e) => e.fact === 'item:rold-medallion' && e.source === 'inference')
    expect(rold).toBeTruthy()
    expect(rold?.detail).toMatch(/implied by scenario:urmummytoilet/)
  })

  it('never applies an uncertain read', () => {
    const c = scenarioCharacter()
    const known = knownFactIds(c)
    expect(scenarioUncertainReads.length).toBeGreaterThan(0)
    for (const read of scenarioUncertainReads) {
      expect(known.has(canonicalFactId(read.id)), `${read.id} must not be applied`).toBe(false)
    }
  })

  it('every direct read is a real applied fact', () => {
    const c = scenarioCharacter()
    const known = knownFactIds(c)
    for (const id of scenarioDirectFacts) {
      expect(known.has(canonicalFactId(id)), `${id} should be known`).toBe(true)
    }
  })

  it('the new certain rules each fire in isolation', () => {
    for (const [whenFact, expected] of [
      ['region:mountaintops', 'item:rold-medallion'],
      ['grace:forge-giants', 'item:rold-medallion'],
      ['grace:siofra', 'region:siofra-river'],
      ['grace:ainsel', 'region:ainsel-river'],
      ['item:radagon-s-soreseal', 'region:caelid'],
      ['item:green-turtle-talisman', 'region:limgrave'],
      ['mapfrag:mountaintops-w', 'region:mountaintops'],
      ['mapfrag:leyndell', 'region:leyndell'],
    ] as const) {
      const c = applyFacts(emptyCharacter, [whenFact], 'screenshot', 'unit')
      expect(knownFactIds(c).has(canonicalFactId(expected)), `${whenFact} -> ${expected}`).toBe(true)
    }
  })

  it('marks the new rule targets as certain, never likely', () => {
    for (const chain of inferChains) {
      if (chain.whenFact.startsWith('mapfrag:')) expect(chain.certainty).toBe('certain')
    }
    for (const id of ['region:mountaintops', 'grace:forge-giants', 'grace:siofra', 'grace:ainsel', 'item:radagon-s-soreseal', 'item:green-turtle-talisman']) {
      const chain = inferChains.find((c) => c.whenFact === id)
      expect(chain?.certainty, `${id} certainty`).toBe('certain')
    }
  })

  it('every Task 138 map-fragment rule points at a catalog region', () => {
    for (const chain of inferChains) {
      if (chain.addedBy !== 138 || !chain.whenFact.startsWith('mapfrag:')) continue
      // The fragment itself is a collectible, but its conclusion must resolve.
      expect(byId.has(chain.implies[0]), chain.implies[0]).toBe(true)
    }
  })
})
