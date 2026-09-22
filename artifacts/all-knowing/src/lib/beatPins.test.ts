import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { planRoute, type PlanStep } from '../knowledge/endings'
import { warpGraces } from '../knowledge/graces'
import { allLines } from '../knowledge/storylines'
import type { Character } from '../types'
import { beatPin } from './beatPins'
import { applyFacts } from './infer'

/** Task 53/68 mid-Ranni fixture: Fingerslayer not yet handed in. */
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

const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 78 fixture')

const factOf = (step: PlanStep) => step.factId ?? step.factIds?.[0] ?? null

/** Every line's current beat for the fixture, with its fact id. */
const currents = allLines.flatMap((line) => {
  const step = planRoute(fixture, line).current
  const factId = step ? factOf(step) : null
  return factId ? [{ line: line.id, step: step!.id, factId }] : []
})

describe('Task 78 beat pins', () => {
  it('records that the mid-Ranni Fingerslayer beat has no grounded pin', () => {
    const ranni = currents.find((c) => c.line === 'ranni')
    expect(ranni?.factId).toBe('item:fingerslayer')
    // No loot row, no grace coord, no leftover — text only.
    expect(beatPin(fixture, 'item:fingerslayer', [])).toBeNull()
  })

  it('resolves at least three other current beats to a real pin', () => {
    const pinned = currents.filter((c) => beatPin(fixture, c.factId, []))
    expect(pinned.length).toBeGreaterThanOrEqual(3)
    for (const c of pinned) {
      const pin = beatPin(fixture, c.factId, [])!
      expect(Number.isFinite(pin.x), c.factId).toBe(true)
      expect(Number.isFinite(pin.y), c.factId).toBe(true)
    }
  })

  it('reuses the authored grace coordinate rather than a new one', () => {
    const lake = warpGraces.find((g) => g.id === 'grace:lake-shore')!
    const pin = beatPin(fixture, 'grace:lake-shore', [])
    expect(pin).not.toBeNull()
    expect(pin!.x).toBe(lake.x)
    expect(pin!.y).toBe(lake.y)
  })

  it('never returns a pin for a bare fact id', () => {
    expect(beatPin(fixture, null, [])).toBeNull()
    expect(beatPin(fixture, 'quest:not-a-real-beat', [])).toBeNull()
  })
})
