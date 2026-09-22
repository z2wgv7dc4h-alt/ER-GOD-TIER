import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyFacts } from '../lib/infer'
import { askGideonRouter } from '../lib/gideon'
import type { Character } from '../types'
import { byId } from './catalog'
import { planRoute } from './endings'
import { allLines, storylines } from './storylines'

/**
 * Golden fixture from the Task 53 brief: Radahn dead, Ranni's service accepted,
 * Rogier's knifeprint handed in, Varré started, Fia advanced (D dead), Ensha
 * dead, Thops talked. Fingerslayer NOT handed in, Study Hall NOT inverted,
 * Deeproot coffin NOT ridden, Leyndell/Morgott untouched, Millicent/Gowry and
 * Rya/Volcano not started, Mohg not done.
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

const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 53 fixture')

const EIGHT = ['ranni', 'millicent', 'fia', 'dung-eater', 'tanith', 'leda', 'sellen', 'ymir']

function lineOf(id: string) {
  const line = allLines.find((l) => l.id === id)
  if (!line) throw new Error(`no line ${id}`)
  return line
}

describe('the eight lockable lines exist and are wiki-grade', () => {
  it('has all eight lines in the traversable set', () => {
    for (const id of EIGHT) expect(allLines.map((l) => l.id)).toContain(id)
  })

  it('gives every one of the eight at least six steps', () => {
    // No line in this task needed the "actually complete in-game despite being
    // shorter" exemption: every one is authored to six or more beats.
    for (const id of EIGHT) {
      expect(lineOf(id).steps.length, id).toBeGreaterThanOrEqual(6)
    }
  })

  it('has no mid-line beat with empty requires or grants', () => {
    for (const id of EIGHT) {
      lineOf(id).steps.forEach((step, i) => {
        if (i === 0) return
        expect(step.requires.length, `${id}/${step.id} requires`).toBeGreaterThan(0)
        expect(step.grants.length, `${id}/${step.id} grants`).toBeGreaterThan(0)
      })
    }
  })

  it('uses catalog facts for every step factId', () => {
    for (const id of EIGHT) {
      for (const step of lineOf(id).steps) {
        expect(step.factId, `${id}/${step.id} factId`).toBeTruthy()
        expect(byId.has(step.factId!), `${id}/${step.id} ${step.factId}`).toBe(true)
        expect(step.module, `${id}/${step.id} module`).toBeTruthy()
        expect(step.do.length).toBeGreaterThan(0)
        expect(step.detail.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps Ranni a shared route, not a copied one', () => {
    const ending = allLines.find((l) => l.id === 'stars')!
    expect(lineOf('ranni').steps).toBe(ending.steps)
  })

  it('makes the Millicent Elphael aid/betray steps terminal and mutually exclusive', () => {
    const millicent = lineOf('millicent')
    const aid = millicent.steps.find((s) => s.id === 'm6')!
    const betray = millicent.steps.find((s) => s.id === 'm7')!
    expect(aid.factId).toBe('quest:millicent:aid')
    expect(betray.factId).toBe('quest:millicent:betrayed')
    expect(aid.grants).toContain('item:rotten-winged-sword-insignia')
    expect(betray.grants).toContain('item:millicent-prosthesis')
    expect(aid.lockouts).toContain('quest:millicent:betrayed')
    expect(betray.lockouts).toContain('quest:millicent:aid')
  })

  it('models Leda as one beat per invitation window', () => {
    const leda = lineOf('leda')
    const ids = leda.steps.map((s) => s.id)
    // Gravesite, Highroad, Shadow Keep invitations, Sealing Tree, Enir-Ilim.
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(leda.steps.filter((s) => s.factId === 'quest:leda:invitations')).toHaveLength(1)
    expect(leda.steps.some((s) => s.factId === 'quest:leda:invitations-locked')).toBe(true)
  })
})

describe('golden fixture next beats', () => {
  it('puts Ranni on the Fingerslayer hand-in, not "meet Ranni"', () => {
    const plan = planRoute(fixture, lineOf('ranni'))
    expect(plan.current).toBeTruthy()
    expect(plan.current!.id).not.toBe('s1')
    expect(plan.current!.factId).toBe('item:fingerslayer')
    expect(plan.current!.do).toMatch(/Fingerslayer/i)
  })

  it('puts Millicent on Gowry / the Unalloyed needle, not the Haligtree', () => {
    const plan = planRoute(fixture, lineOf('millicent'))
    expect(plan.current).toBeTruthy()
    expect(plan.current!.factId).toBe('quest:millicent:needle')
    expect(plan.current!.do).toMatch(/needle/i)
    expect(plan.current!.do).not.toMatch(/Haligtree/i)
  })

  it('does not have the fixture satisfy the later Ranni beats', () => {
    const plan = planRoute(fixture, lineOf('ranni'))
    expect(plan.done.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(plan.todo.map((s) => s.id)).toEqual(['s3', 's4', 's5', 's6', 's7', 's8'])
  })
})

describe('Gideon goal routing on the fixture', () => {
  it('names the Fingerslayer hand-in and offers Show it for goal ranni', () => {
    const act = askGideonRouter('what next', fixture, { goalId: 'ranni' })
    expect(act.say).toMatch(/Fingerslayer/i)
    expect(act.factId).toBe('item:fingerslayer')
    expect(act.offer?.label).toBe('Show it')
    expect(act.module).toBe('quests')
  })

  it('answers "what does Ranni want next" from the fixture, not beat one', () => {
    const act = askGideonRouter('what does ranni want next', fixture)
    expect(act.say).toMatch(/Fingerslayer/i)
    expect(act.say).not.toMatch(/Next: Enter Ranni/i)
  })
})

describe('storyline hygiene', () => {
  it('has no duplicate step id inside a line', () => {
    for (const line of storylines) {
      const ids = line.steps.map((s) => s.id)
      expect(new Set(ids).size, line.id).toBe(ids.length)
    }
  })

  it('does not reuse a stub and a parallel line for the same companion', () => {
    // One line per companion id; Task 53 expanded in place.
    const ids = storylines.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
