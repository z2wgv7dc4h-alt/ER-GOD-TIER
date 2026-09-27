import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { askGideonRouter, isFastLookup } from './gideon'
import { decodeRegulationData, type Weapon } from './ar'
import type { Character } from '../types'
import { emptyCharacter } from '../data/seed'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

const character: Character = {
  ...emptyCharacter,
  level: 80,
  stats: { ...emptyCharacter.stats, vigor: 40, dexterity: 40, arcane: 45 },
  loadout: [{ id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 }],
  discoveredGraces: ['grace:gatefront'],
}

const ask = (q: string) =>
  askGideonRouter(q, character, {}, [], undefined, undefined, undefined, undefined, weapons)

describe('Gideon advisor intents (Task 96)', () => {
  it('routes "what should i upgrade" to the advisor', () => {
    const act = ask('what should i upgrade')
    expect(act.module).toBe('build')
    expect(act.say).toMatch(/Top upgrades|AR/)
    expect(isFastLookup('what should i upgrade', {}, [], undefined, undefined, undefined, weapons)).toBe(true)
  })

  it('routes "recommend a weapon" to the advisor', () => {
    const act = ask('recommend a weapon')
    expect(act.module).toBe('build')
    expect(act.say).toMatch(/weapon pick|AR/)
    expect(isFastLookup('recommend a weapon', {}, [], undefined, undefined, undefined, weapons)).toBe(true)
  })

  it('routes "help me switch to a bleed build" through planRespec', () => {
    const act = ask('help me switch to a bleed build')
    expect(act.module).toBe('build')
    expect(act.buildId).toBe('build:rivers')
    expect(act.say).toMatch(/Switching to Rivers of Blood/)
    expect(act.say).toMatch(/Larval Tear/)
    expect(isFastLookup('help me switch to a bleed build', {}, [], undefined, undefined, undefined, weapons)).toBe(true)
  })

  it('still sends a named-weapon upgrade question down the AR path', () => {
    const act = ask('should i upgrade rivers of blood')
    expect(act.say).toMatch(/Rivers of Blood/)
    expect(act.say).toContain('AR')
  })
})
