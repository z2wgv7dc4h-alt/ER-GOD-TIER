import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { interview } from '../knowledge/catalog'
import type { Character } from '../types'
import { COOP_LINE, isCoop } from './coop'
import { askGideonRouter } from './gideon'
import { applyFacts } from './infer'
import { fromPacket, packetJson } from './packet'
import { idleSuggestions } from './suggestions'

/** Task 53/68 mid-Ranni fixture. */
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
const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 81 fixture')

const solo: Character = { ...fixture, answers: { ...fixture.answers, coop: 'no' } }
const coop: Character = { ...fixture, answers: { ...fixture.answers, coop: 'yes' } }

describe('Task 81 co-op toggle', () => {
  it('defaults to solo: only an explicit yes is co-op', () => {
    expect(isCoop(emptyCharacter)).toBe(false)
    expect(isCoop({ ...emptyCharacter, answers: { coop: 'no' } })).toBe(false)
    expect(isCoop({ ...emptyCharacter, answers: { coop: 'yes' } })).toBe(true)
  })

  it('adds a co-op interview question', () => {
    const q = interview.find((x) => x.id === 'coop')
    expect(q).toBeTruthy()
    expect(q!.options.map((o) => o.value).sort()).toEqual(['no', 'yes'])
  })

  it('drops Mimic from suggestions in co-op, keeps them solo', () => {
    // Region comes from answers.lastRegion so the grace itself stays un-found,
    // which is what keeps the Nokron leftovers (the Mimic) outstanding.
    const inNokron: Character = { ...emptyCharacter, answers: { lastRegion: 'Nokron' } }
    expect(idleSuggestions({ ...inNokron, answers: { ...inNokron.answers, coop: 'no' } }, 12).some((s) => /mimic/i.test(s.label))).toBe(true)
    expect(idleSuggestions({ ...inNokron, answers: { ...inNokron.answers, coop: 'yes' } }, 12).some((s) => /mimic|torrent/i.test(s.label))).toBe(false)
  })

  it('does not recommend the Mimic Tear in co-op, and says the line instead', () => {
    expect(askGideonRouter('is mimic tear a good spirit ash', solo).say).toContain('Mimic Tear')
    const act = askGideonRouter('is mimic tear a good spirit ash', coop)
    expect(act.say).toBe(COOP_LINE)
    expect(act.say).not.toMatch(/mimic/i)
  })

  it('swaps the wall "summon" advice for the co-op line', () => {
    expect(askGideonRouter('i am stuck', solo).say).toContain('summon')
    expect(askGideonRouter('i am stuck', coop).say).toContain(COOP_LINE)
  })

  it('leaves the mid-Ranni Fingerslayer suggestion untouched when co-op is off', () => {
    expect(idleSuggestions(solo, 3).some((s) => s.factId === 'item:fingerslayer')).toBe(true)
  })

  it('persists on the packet like any other answer', () => {
    const back = fromPacket(JSON.parse(packetJson(coop)))
    expect(back.answers.coop).toBe('yes')
  })
})
