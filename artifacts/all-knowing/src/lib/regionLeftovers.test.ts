import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { askGideonRouter } from './gideon'
import { applyFacts } from './infer'
import { regionLeftovers } from './regionLeftovers'
import { idleSuggestions } from './suggestions'

/** Task 53/68 mid-run fixture: Radahn dead, Ranni in service, Fingerslayer not given. */
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

const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 75 fixture')

const ids = (c: Character, q: string) => regionLeftovers(c, q).items.map((m) => m.id)

describe('Task 75 region leftovers', () => {
  it('shows the Fingerslayer beat for a Nokron selection', () => {
    expect(ids(fixture, 'missed in Nokron')).toContain('item:fingerslayer')
  })

  it('shows it for the combined Nokron/Siofra selection too', () => {
    expect(ids(fixture, 'what did I miss in Nokron/Siofra')).toContain('item:fingerslayer')
  })

  it('does not show it for a Limgrave-only selection', () => {
    expect(ids(fixture, 'missed in Limgrave')).not.toContain('item:fingerslayer')
  })

  it('never claims a region when none is named', () => {
    const res = regionLeftovers(fixture, 'what did I miss')
    expect(res.scoped).toBe(false)
    expect(res.region).toBeNull()
  })

  it('caps at 8 and reports the rest as more', () => {
    const res = regionLeftovers(emptyCharacter, 'Limgrave', 8)
    expect(res.scoped).toBe(true)
    expect(res.region).toMatch(/Limgrave/i)
    expect(res.items).toHaveLength(8)
    expect(res.more).toBeGreaterThan(0)
    expect(res.total).toBe(res.items.length + res.more)
  })

  it('resolves "here" from the character\'s current region, not a guess', () => {
    // No discovered grace / lastRegion → nothing is "here".
    const noRegion = regionLeftovers(emptyCharacter, 'what did I miss here')
    expect(noRegion.scoped).toBe(false)
    expect(noRegion.region).toBeNull()

    const inLimgrave: Character = { ...emptyCharacter, discoveredGraces: ['grace:elleh'] }
    const here = regionLeftovers(inLimgrave, 'what did I miss here')
    expect(here.scoped).toBe(true)
    expect(here.region).toMatch(/Limgrave/i)
  })
})

describe('Task 75 call sites', () => {
  it('Gideon answers "missed in Limgrave" and "what did I miss here"', () => {
    const limgrave = askGideonRouter('what did I miss in Limgrave', fixture)
    expect(limgrave.module).toBe('map')
    expect(limgrave.say).toMatch(/Missed in Limgrave/i)
    expect(limgrave.factId).toBeTruthy()

    const here = askGideonRouter('what did I miss here', fixture)
    expect(here.say.length).toBeGreaterThan(0)
    expect(here.factId).toBeTruthy()
  })

  it('leaves the present-tense gate ask on the gate answer', () => {
    const act = askGideonRouter('what do I miss before the forge', fixture)
    expect(act.module).toBe('quests')
    expect(act.say).toContain('Forge of the Giants')
  })

  it('idle chips surface the region chip when the current region is known', () => {
    const inNokron: Character = { ...fixture, discoveredGraces: ['grace:nokron'] }
    const chips = idleSuggestions(inNokron, 8)
    expect(chips.some((c) => /Missed in Nokron/i.test(c.label))).toBe(true)
  })
})
