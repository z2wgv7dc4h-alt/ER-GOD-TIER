import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { askGideonRouter, isFastLookup } from './gideon'
import { decodeRegulationData, type Weapon } from './ar'
import { emptyCharacter } from '../data/seed'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

describe('Gideon weapon advice', () => {
  it('answers a named upgrade question from the AR engine', () => {
    const act = askGideonRouter('should i upgrade rivers of blood', emptyCharacter, {}, [], undefined, undefined, undefined, undefined, weapons)
    expect(act.module).toBe('build')
    expect(act.say).toContain('AR')
    expect(act.say).toMatch(/Rivers of Blood/i)
  })

  it('lists strong weapons for the kit when no name is given', () => {
    const act = askGideonRouter('what are good early weapons', emptyCharacter, {}, [], undefined, undefined, undefined, undefined, weapons)
    expect(act.module).toBe('build')
    expect(act.say.toLowerCase()).toContain('best weapons')
  })

  it('stays on-archetype with the active kit', () => {
    const kitChar = {
      ...emptyCharacter,
      stats: { ...emptyCharacter.stats, dexterity: 40, arcane: 45 },
      answers: { ...emptyCharacter.answers, buildKit: 'build:rivers' },
    }
    const act = askGideonRouter('what are good early weapons', kitChar, {}, [], undefined, undefined, undefined, undefined, weapons)
    expect(act.say).toContain('Rivers of Blood')
    expect(act.say).toMatch(/\((Arc\/Dex|Dex\/Arc)\)/)
  })

  it('stays deterministic', () => {
    expect(isFastLookup('should i upgrade rivers of blood', {}, [], undefined, undefined, undefined, weapons)).toBe(true)
  })
})
