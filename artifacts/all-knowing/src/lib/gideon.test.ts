import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../types'
import { callDeepSeekJson, hasDeepSeekKey } from './deepseek'
import type { BossCombat } from './enemy'
import { askGideon, askGideonRouter, isFastLookup } from './gideon'
import { buildGrounding, validateGideonAct } from './gideonLlm'
import { REGULATION_STAMP } from './regulation'

/** The real Task 17 extract, read straight off disk — not a hand-rolled fixture. */
const combat = JSON.parse(
  readFileSync(new URL('../../public/sourced/npc-combat.json', import.meta.url), 'utf8'),
) as BossCombat[]

vi.mock('./deepseek', () => ({
  hasDeepSeekKey: vi.fn(),
  callDeepSeekJson: vi.fn(),
}))

const character: Character = {
  source: 'reckon',
  platform: 'ps5',
  regulation: REGULATION_STAMP,
  name: 'Tarnished',
  level: 40,
  startingClass: 'vagabond',
  stats: { vigor: 20, mind: 10, endurance: 15, strength: 20, dexterity: 12, intelligence: 9, faith: 9, arcane: 7 },
  loadout: [],
  defeatedBosses: [],
  discoveredGraces: [],
  collectedItems: [],
  completedQuestSteps: [],
  deniedFacts: [],
  answers: {},
  evidence: [],
  shots: [],
}

/** A question with no single-entity lookup and several reasoning markers. */
const OPEN_QUESTION = 'Which ending should I chase if I want faith and I killed Seluvis?'

describe('validateGideonAct', () => {
  it('keeps a fact id that is present in the grounding pack', () => {
    const g = buildGrounding('godrick', character)
    expect(g.factIds.has('boss:godrick')).toBe(true)
    const { act, rejected } = validateGideonAct({ say: 'Godrick.', module: 'map', factId: 'boss:godrick' }, g)
    expect(rejected).toEqual([])
    expect(act?.factId).toBe('boss:godrick')
  })

  it('rejects an invented fact id and refuses the whole act', () => {
    const g = buildGrounding('godrick', character)
    const { act, rejected } = validateGideonAct(
      { say: 'Seek boss:godrick-prime, the secret second Godrick.', module: 'map', factId: 'boss:godrick-prime' },
      g,
    )
    expect(act).toBeNull()
    expect(rejected).toContain('factId:boss:godrick-prime')
  })

  it('rejects invented build and goal ids', () => {
    const g = buildGrounding(OPEN_QUESTION, character)
    const { act, rejected } = validateGideonAct(
      { say: 'Wear it.', buildId: 'build:infinite-comet', goal: 'ending:secret-moon' },
      g,
    )
    expect(act).toBeNull()
    expect(rejected).toContain('buildId:build:infinite-comet')
    expect(rejected).toContain('goal:ending:secret-moon')
  })

  it('drops an invalid module without rejecting the act', () => {
    const g = buildGrounding('godrick', character)
    const { act, rejected } = validateGideonAct({ say: 'Godrick.', module: 'holodeck', factId: 'boss:godrick' }, g)
    expect(rejected).toEqual([])
    expect(act?.module).toBeUndefined()
    expect(act?.factId).toBe('boss:godrick')
  })
})

describe('stuck handler uses real boss resists', () => {
  it('advises from the actual NpcParam row for a named boss', () => {
    const act = askGideonRouter('help with malenia', character, {}, combat)
    expect(act.say).toContain('Real NpcParam absorb')
    expect(act.say).toContain('bleed soft')
    expect(act.offer?.label).toBe('Bleed sheet')
  })

  it('gives different advice for a bleed-resistant boss', () => {
    const malenia = askGideonRouter('help with malenia', character, {}, combat)
    const agheel = askGideonRouter('help with agheel', character, {}, combat)
    expect(agheel.say).toContain('bleed hard')
    expect(agheel.say).not.toBe(malenia.say)
    expect(agheel.offer?.label).not.toBe('Bleed sheet')
  })

  it('falls back to generic advice when combat data is not loaded', () => {
    const act = askGideonRouter('help with malenia', character, {}, [])
    expect(act.say).toContain('If this is a wall')
  })
})

describe('100% handler reflects tracked completion', () => {
  it('counts actual facts and surfaces a next actionable', () => {
    const progressed: Character = {
      ...character,
      defeatedBosses: ['boss:margit'],
      discoveredGraces: ['grace:first-step'],
    }
    const act = askGideonRouter('100%', progressed)
    expect(act.say).toContain('Bosses 1/')
    expect(act.say).toContain('Next actionable')
    expect(act.say).toContain('Spine chapter')
    expect(act.factId).toBeTruthy()
  })

  it('changes the response as facts are toggled', () => {
    const empty = askGideonRouter('100%', character)
    const progressed = askGideonRouter('100%', { ...character, defeatedBosses: ['boss:margit'] })
    expect(progressed.say).not.toBe(empty.say)
    expect(empty.say).toContain('Start with')
  })
})

describe('isFastLookup', () => {
  it('routes exact single-entity lookups and fixed commands without the LLM', () => {
    expect(isFastLookup('godrick')).toBe(true)
    expect(isFastLookup('What is still available on this run?')).toBe(true)
    expect(isFastLookup('Blitz: Age of Stars. What do I do next?')).toBe(true)
    expect(isFastLookup('I want the Age of Stars ending. What do I do next?')).toBe(true)
  })

  it('sends multi-concept questions to the LLM', () => {
    expect(isFastLookup(OPEN_QUESTION)).toBe(false)
    expect(isFastLookup('I am level 35 and stuck on Radahn, what should I do?')).toBe(false)
  })
})

describe('askGideon front', () => {
  beforeEach(() => {
    vi.mocked(hasDeepSeekKey).mockReset()
    vi.mocked(callDeepSeekJson).mockReset()
  })

  it('falls back to the deterministic router when no key is configured', async () => {
    vi.mocked(hasDeepSeekKey).mockReturnValue(false)
    const act = await askGideon(OPEN_QUESTION, character)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
    expect(callDeepSeekJson).not.toHaveBeenCalled()
  })

  it('does not call the LLM for a fast lookup even with a key', async () => {
    vi.mocked(hasDeepSeekKey).mockReturnValue(true)
    const act = await askGideon('godrick', character)
    expect(act).toEqual(askGideonRouter('godrick', character))
    expect(callDeepSeekJson).not.toHaveBeenCalled()
  })

  it('passes a grounded response through', async () => {
    vi.mocked(hasDeepSeekKey).mockReturnValue(true)
    const g = buildGrounding(OPEN_QUESTION, character)
    const factId = [...g.factIds][0]
    vi.mocked(callDeepSeekJson).mockResolvedValue({ say: 'Grounded answer.', module: 'map', factId })
    const act = await askGideon(OPEN_QUESTION, character)
    expect(callDeepSeekJson).toHaveBeenCalledTimes(1)
    expect(act.say).toBe('Grounded answer.')
    expect(act.factId).toBe(factId)
  })

  it('falls back to the router when the model hallucinates an id', async () => {
    vi.mocked(hasDeepSeekKey).mockReturnValue(true)
    vi.mocked(callDeepSeekJson).mockResolvedValue({
      say: 'Follow boss:godrick-prime, the secret second Godrick.',
      module: 'map',
      factId: 'boss:godrick-prime',
    })
    const act = await askGideon(OPEN_QUESTION, character)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
  })

  it('falls back to the router when the API call fails', async () => {
    vi.mocked(hasDeepSeekKey).mockReturnValue(true)
    vi.mocked(callDeepSeekJson).mockRejectedValue(new Error('network down'))
    const act = await askGideon(OPEN_QUESTION, character)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
  })
})
