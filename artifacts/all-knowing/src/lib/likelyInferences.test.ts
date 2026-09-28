import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyFacts, knownFactIds } from './infer'
import { confirmLikelyInference, likelyInferences, rejectLikelyInference } from './likelyInferences'
import { scenarioCharacter } from './__fixtures__/scenarios/urmummytoilet'
import { status } from './entityGraph'

/**
 * Task 138 §2/§4 — the likely-confirm layer and the entity status reason.
 */

describe('likely inferences', () => {
  it('suggests a major boss whose region is reached and level band passed', () => {
    const c = applyFacts({ ...emptyCharacter, level: 87 }, ['region:liurnia'], 'screenshot', 'test')
    const likely = likelyInferences(c)
    expect(likely.some((l) => l.factId === 'boss:rennala')).toBe(true)
    // Liurnia no longer proves Godrick (Stormveil can be bypassed), so he is only suggested.
    expect(c.defeatedBosses).not.toContain('boss:godrick')
    expect(likely.some((l) => l.factId === 'boss:godrick')).toBe(true)
  })

  it('never suggests below the level band', () => {
    const c = applyFacts({ ...emptyCharacter, level: 20 }, ['region:liurnia'], 'screenshot', 'test')
    expect(likelyInferences(c).some((l) => l.factId === 'boss:rennala')).toBe(false)
  })

  it('confirming applies it as an answer fact; rejecting stops the suggestion', () => {
    const c = applyFacts({ ...emptyCharacter, level: 87 }, ['region:liurnia'], 'screenshot', 'test')
    const yes = confirmLikelyInference(c, 'boss:rennala')
    expect(yes.defeatedBosses).toContain('boss:rennala')
    expect(yes.evidence.some((e) => e.fact === 'boss:rennala' && e.source === 'answer')).toBe(true)

    const no = rejectLikelyInference(c, 'boss:rennala')
    expect(no.deniedFacts).toContain('boss:rennala')
    expect(likelyInferences(no).some((l) => l.factId === 'boss:rennala')).toBe(false)
  })
})

describe('entity status strip inference reason', () => {
  it('explains a boss inferred from a held remembrance', () => {
    const c = scenarioCharacter()
    const s = status('boss:radahn', c)
    expect(s.state).toBe('done')
    expect(s.why).toMatch(/Remembrance of the Starscourge/)
  })

  it('keeps the plain reason for a directly logged fact', () => {
    const c = applyFacts(emptyCharacter, ['boss:margit'], 'answer', 'I logged it')
    expect(status('boss:margit', c).why).toBe('Logged on this character.')
  })

  it('scenario names are a stable set', () => {
    expect(knownFactIds(scenarioCharacter()).has('boss:radahn')).toBe(true)
  })
})
