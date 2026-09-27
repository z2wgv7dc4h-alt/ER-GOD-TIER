import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { askGideonRouter } from './gideon'
import { buildGrounding, validateGideonAct } from './gideonLlm'
import {
  applyFollowUp,
  applyGideonActions,
  describeAction,
  inlineIds,
  parseSayMarkers,
} from './gideonAct'

const character: Character = { ...emptyCharacter }

const g = () => buildGrounding('godrick', character)

describe('Task 101 validation — links', () => {
  it('canonicalises real link ids and drops invented ones without rejecting the act', () => {
    const { act, rejected, dropped } = validateGideonAct(
      { say: 'Two things.', links: ['boss:godrick', 'boss:godrick-prime'] },
      g(),
    )
    expect(rejected).toEqual([])
    expect(act?.links).toContain('boss:godrick')
    expect(act?.links).not.toContain('boss:godrick-prime')
    expect(dropped).toContain('link:boss:godrick-prime')
  })
})

describe('Task 101 validation — sources', () => {
  it('keeps a url that came from a web_search result this turn and drops a hallucinated one', () => {
    const allowed = ['https://example.com/real']
    const { act, dropped } = validateGideonAct(
      {
        say: 'Sourced.',
        sources: [
          { title: 'Real', url: 'https://example.com/real' },
          { title: 'Invented', url: 'https://example.com/hallucinated' },
        ],
      },
      g(),
      allowed,
    )
    expect(act?.sources).toEqual([{ title: 'Real', url: 'https://example.com/real' }])
    expect(dropped).toContain('source:https://example.com/hallucinated')
  })

  it('drops every source when no web_search result was seen', () => {
    const { act } = validateGideonAct(
      { say: 'Sourced.', sources: [{ title: 'Real', url: 'https://example.com/real' }] },
      g(),
    )
    expect(act?.sources).toBeUndefined()
  })
})

describe('Task 101 validation — every action type', () => {
  it('keeps valid actions and drops the ones with unknown ids', () => {
    const { act, dropped } = validateGideonAct(
      {
        say: 'Here is a plan.',
        actions: [
          { type: 'markDone', ids: ['boss:godrick'] },
          { type: 'markNotDone', ids: ['boss:margit'] },
          { type: 'addOwned', ids: ['item:uchigatana'] },
          { type: 'removeOwned', ids: ['item:black-knifeprint'] },
          { type: 'setGoal', id: 'stars' },
          { type: 'equip', slot: 'right-1', id: 'item:uchigatana' },
          { type: 'setStats', stats: { vigor: 30, bogus: 5 }, level: 42 },
          { type: 'showOnMap', id: 'grace:first-step' },
          { type: 'open', id: 'boss:godrick' },
          { type: 'showOnMap', id: 'boss:godrick-prime' },
        ],
      },
      g(),
    )
    const types = (act?.actions ?? []).map((a) => a.type)
    expect(types).toEqual([
      'markDone',
      'markNotDone',
      'addOwned',
      'removeOwned',
      'setGoal',
      'equip',
      'setStats',
      'showOnMap',
      'open',
    ])
    expect(dropped).toContain('action:showOnMap:boss:godrick-prime')
    const setStats = act?.actions?.find((a) => a.type === 'setStats')
    expect(setStats).toMatchObject({ type: 'setStats', stats: { vigor: 30 }, level: 42 })
    // The bogus stat key never survives validation.
    expect((setStats as { stats: Record<string, unknown> }).stats).not.toHaveProperty('bogus')
  })
})

describe('Task 101 say markers', () => {
  it('renders known markers as link segments and unknown ones as plain text', () => {
    const segs = parseSayMarkers('Go to [[boss:godrick|the Grafted]] then [[boss:godrick-prime|the secret one]].')
    expect(segs[0]).toEqual({ type: 'text', text: 'Go to ' })
    expect(segs[1]).toEqual({ type: 'link', id: 'boss:godrick', label: 'the Grafted' })
    expect(segs[3]).toEqual({ type: 'text', text: 'the secret one' })
    expect(inlineIds('Go to [[boss:godrick]].')).toEqual(['boss:godrick'])
  })

  it('leaves a marker sentence in the act while stripping a bare unknown id', () => {
    const { act } = validateGideonAct(
      { say: 'Head to [[boss:godrick|the Grafted]]. Then follow boss:godrick-prime.' },
      g(),
    )
    expect(act?.say).toContain('[[boss:godrick|the Grafted]]')
    expect(act?.say).not.toContain('boss:godrick-prime')
  })

  it('logs an unknown marker id as dropped while keeping the rest of the act', () => {
    const { act, dropped } = validateGideonAct(
      { say: 'See [[boss:godrick-prime|the secret one]] later.' },
      g(),
    )
    expect(act?.say).toContain('the secret one')
    expect(dropped).toContain('say:marker:boss:godrick-prime')
  })
})

describe('Task 101 action labels', () => {
  it('describes every action type in words the player can read', () => {
    expect(describeAction({ type: 'markDone', ids: ['boss:godrick'] })).toMatch(/Godrick/i)
    expect(describeAction({ type: 'setGoal', id: 'stars' })).toMatch(/goal/i)
    expect(describeAction({ type: 'equip', slot: 'right-1', id: 'item:uchigatana' })).toMatch(/Equip/i)
    expect(describeAction({ type: 'setStats', stats: {}, level: 42 })).toBe('Apply stats · Lv 42')
    expect(describeAction({ type: 'showOnMap', id: 'boss:godrick' })).toMatch(/map/i)
    expect(describeAction({ type: 'open', id: 'boss:godrick' })).toMatch(/Open/i)
  })
})

describe('Task 101 location-aware "what now"', () => {
  const area = { region: 'Limgrave', source: 'grace' as const, at: 1 }
  it('answers from the current area when one is known', () => {
    const act = askGideonRouter('what now', character, {}, [], undefined, undefined, undefined, undefined, undefined, undefined, area)
    expect(act.say).toMatch(/You are in Limgrave/)
  })

  it('keeps the old global answer when no area is known', () => {
    const act = askGideonRouter('what now', character)
    expect(act.say).not.toMatch(/You are in/)
  })
})

describe('Task 101 apply', () => {
  it('applies markDone through inference and reports what unlocked / is next', () => {
    const result = applyGideonActions(character, [{ type: 'markDone', ids: ['boss:godrick'] }])
    expect(result.character.defeatedBosses).toContain('boss:godrick')
    expect(result.applied).toContain('boss:godrick')
    expect(applyFollowUp(result)).toMatch(/Applied/i)
  })

  it('applies setGoal, setStats, equip and removeOwned to the sheet', () => {
    const start: Character = { ...emptyCharacter, collectedItems: ['item:black-knifeprint'] }
    const result = applyGideonActions(start, [
      { type: 'setGoal', id: 'stars' },
      { type: 'setStats', stats: { vigor: 30 }, level: 42 },
      { type: 'equip', slot: 'right-1', id: 'item:uchigatana' },
      { type: 'removeOwned', ids: ['item:black-knifeprint'] },
    ])
    expect(result.character.answers.gideonGoal).toBe('stars')
    expect(result.character.stats.vigor).toBe(30)
    expect(result.character.level).toBe(42)
    expect(result.character.loadout.some((s) => s.slot === 'right-1' && s.id === 'item:uchigatana')).toBe(true)
    expect(result.character.collectedItems).not.toContain('item:black-knifeprint')
    expect(result.removed).toContain('item:black-knifeprint')
  })
})
