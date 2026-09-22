import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyFacts } from '../lib/infer'
import { byId } from './catalog'
import { planRoute } from './endings'
import { allLines, storylines } from './storylines'

/**
 * Task 74: the remaining companion lines. Quests already renders `allLines()`
 * (Task 68), so listing these needs no extra wiring — this pins their shape,
 * their catalog grounding and the Alexander golden fixture.
 */
const REQUESTED = ['alexander', 'patches', 'nepheli', 'roderika-hewg', 'boc', 'hyetta', 'irina', 'diallos', 'igon']

/** Lines whose real arc is genuinely short; every other requested line is six+. */
const SHORT_WITH_REASON = new Set(['roderika-hewg', 'igon'])

/** The catalog facts this task authored. Existing shared facts are not listed. */
const NEW_FACTS = [
  'quest:alexander:met', 'quest:alexander:gael', 'quest:alexander:festival', 'quest:alexander:complete',
  'quest:alexander:missed-limgrave', 'item:alexanders-innards', 'quest:jarbairn:concluded',
  'quest:nepheli:met', 'quest:nepheli:roundtable', 'quest:nepheli:despair', 'quest:nepheli:refused-potion',
  'quest:nepheli:stormhawk', 'quest:nepheli:ruler', 'quest:nepheli:potioned',
  'quest:boc:freed', 'quest:boc:cave', 'quest:boc:doubt', 'quest:boc:beautiful', 'quest:boc:rebirth',
  'quest:hyetta:met', 'quest:hyetta:grapes', 'quest:hyetta:purified', 'quest:hyetta:gatetown', 'quest:hyetta:bellum',
  'quest:hyetta:maiden', 'quest:hyetta:killed',
  'quest:irina:met', 'quest:edgar:letter', 'quest:irina:castle', 'quest:irina:dead', 'quest:edgar:revenger',
  'quest:irina:killed', 'item:shabriri-grape',
  'quest:patches:ambush', 'quest:patches:forgiven', 'quest:patches:volcano', 'quest:patches:contracts',
  'quest:patches:shaded', 'quest:patches:castanets',
  'quest:roderika:met', 'quest:roderika:memento', 'quest:roderika:given', 'quest:hewg:roderika', 'quest:roderika:tuner',
  'item:chrysalids-memento',
  'quest:diallos:met', 'quest:diallos:lanya', 'quest:diallos:village', 'quest:diallos:jarburg', 'quest:diallos:poachers',
  'quest:diallos:concluded', 'item:diallos-mask',
  'quest:igon:met', 'quest:igon:peak', 'quest:igon:summon', 'quest:igon:concluded', 'item:igons-harpoon',
]

const lineOf = (id: string) => {
  const line = allLines.find((l) => l.id === id)
  if (!line) throw new Error(`no line ${id}`)
  return line
}

describe('Task 74 remaining companion lines', () => {
  it('lists every requested line through allLines(), no extra wiring', () => {
    const ids = allLines.map((l) => l.id)
    for (const id of REQUESTED) expect(ids, id).toContain(id)
    expect(new Set(storylines.map((l) => l.id)).size).toBe(storylines.length)
  })

  it('gives the longer lines six beats, and documents the genuinely short ones', () => {
    for (const id of REQUESTED) {
      const { steps } = lineOf(id)
      if (SHORT_WITH_REASON.has(id)) {
        expect(steps.length, id).toBeGreaterThanOrEqual(5)
      } else {
        expect(steps.length, id).toBeGreaterThanOrEqual(6)
      }
    }
  })

  it('grounds every step factId in the catalog', () => {
    for (const id of REQUESTED) {
      for (const step of lineOf(id).steps) {
        expect(step.factId, `${id}/${step.id}`).toBeTruthy()
        expect(byId.has(step.factId!), `${id}/${step.id} ${step.factId}`).toBe(true)
        expect(step.do.length, `${id}/${step.id} do`).toBeGreaterThan(0)
        expect(step.detail.length, `${id}/${step.id} detail`).toBeGreaterThan(0)
        expect(step.module, `${id}/${step.id} module`).toBeTruthy()
      }
    }
  })

  it('every new fact carries implies: []', () => {
    for (const factId of NEW_FACTS) {
      expect(byId.get(factId), `${factId} missing`).toBeTruthy()
      expect(byId.get(factId)?.implies, factId).toEqual([])
    }
  })

  it('golden fixture: Alexander not freed stays on the Limgrave hole, not the endgame', () => {
    // Radahn dead and the early shardbearers down — the exact state that used to
    // let a "finish the game" beat jump the queue.
    const fixture = applyFacts(
      emptyCharacter,
      ['boss:godrick', 'boss:rennala', 'boss:radahn', 'quest:ranni:service'],
      'answer',
      'Task 74 fixture',
    )
    const plan = planRoute(fixture, lineOf('alexander'))
    expect(plan.current?.id).toBe('a1')
    expect(plan.current?.do).toMatch(/hole/i)
    expect(plan.current?.do).toMatch(/Limgrave/i)
    expect(plan.current?.do).not.toMatch(/Farum|Elden Beast|finish/i)
    // The next beat is still gated behind actually freeing him.
    expect(plan.blocked.map((s) => s.id)).toContain('a2')
  })
})
