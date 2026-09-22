import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './data/seed'
import { applyFacts } from './lib/infer'
import type { Character } from './types'
import { currentStepId, stepFact } from './Quests'
import { allLines } from './knowledge/storylines'

/**
 * Golden fixture from the Task 53/68 brief: Radahn dead, Ranni's service accepted,
 * Rogier's knifeprint handed in, and the rest of the early run done — Fingerslayer
 * NOT handed in, Study Hall NOT inverted.
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

const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Quests test fixture')
const ranni = allLines.find((l) => l.id === 'ranni')!

const known = (c: Character) => [
  ...c.defeatedBosses,
  ...c.discoveredGraces,
  ...c.collectedItems,
  ...c.completedQuestSteps,
]

describe('QuestWorkspace reads the one graph', () => {
  it('golden fixture: Ranni current beat is the Fingerslayer, not the seed Elleh step', () => {
    const id = currentStepId(fixture, ranni)
    const step = ranni.steps.find((s) => s.id === id)
    expect(step, 'a current beat must exist').toBeTruthy()
    expect(stepFact(step!)).toBe('item:fingerslayer')
    expect(step!.do).toMatch(/Fingerslayer/i)
    // The deleted seed quest's first step id must never be the current beat.
    expect(stepFact(step!)).not.toBe('quest:ranni:elleh')
  })

  it('ticking the current beat writes the catalog fact, never alexander-1', () => {
    const step = ranni.steps.find((s) => s.id === currentStepId(fixture, ranni))!
    const fact = stepFact(step)!
    const after = applyFacts(fixture, [fact], 'answer', 'Quests test tick')
    expect(after.collectedItems).toContain('item:fingerslayer')
    expect(known(after)).not.toContain('alexander-1')
    expect(known(after)).not.toContain('quest:ranni:elleh')
  })

  it('every line step carries a catalog fact or factIds marker for its checkbox', () => {
    for (const line of allLines) {
      for (const step of line.steps) {
        expect(stepFact(step), `${line.id}/${step.id}`).toBeTruthy()
      }
    }
  })
})
