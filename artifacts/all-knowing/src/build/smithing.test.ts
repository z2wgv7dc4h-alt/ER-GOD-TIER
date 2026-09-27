import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData, type Weapon } from '../lib/ar'
import { emptyCharacter } from '../data/seed'
import { maxUpgrade, smithingTracker, stonesForUpgrade, upgradeKind } from './smithing'
import type { Character } from '../types'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

const fake = (name: string, length: number): Weapon => ({ name, weaponName: name, attack: Array.from({ length }) } as unknown as Weapon)

describe('smithing tracker (Task 110 §4)', () => {
  it('reads the upgrade track from the weapon cap', () => {
    expect(upgradeKind(fake('Standard', 26))).toBe('smithing')
    expect(upgradeKind(fake('Somber', 11))).toBe('somber')
    expect(maxUpgrade(fake('Somber', 11))).toBe(10)
  })

  it('counts regular stones in 2/4/6 tiers and caps with the Ancient stone', () => {
    const toThree = stonesForUpgrade('smithing', 0, 3)
    expect(toThree).toEqual([{ name: 'Smithing Stone [1]', count: 12 }])
    const toFour = stonesForUpgrade('smithing', 3, 4)
    expect(toFour).toEqual([{ name: 'Smithing Stone [2]', count: 2 }])
    const toMax = stonesForUpgrade('smithing', 24, 25)
    expect(toMax).toEqual([{ name: 'Ancient Dragon Smithing Stone', count: 1 }])
  })

  it('counts one somber stone per level, Ancient somber at +10', () => {
    expect(stonesForUpgrade('somber', 0, 2)).toEqual([
      { name: 'Somber Smithing Stone [1]', count: 1 },
      { name: 'Somber Smithing Stone [2]', count: 1 },
    ])
    expect(stonesForUpgrade('somber', 9, 10)).toEqual([{ name: 'Somber Ancient Dragon Smithing Stone', count: 1 }])
  })

  it('plans each equipped armament using the real regulation data', () => {
    const character: Character = {
      ...emptyCharacter,
      loadout: [
        { id: 'u', name: 'Uchigatana', kind: 'armament', upgrade: 0 },
        { id: 'r', name: 'Rivers of Blood', kind: 'armament', upgrade: 0 },
      ],
    }
    const rows = smithingTracker(character, weapons)
    expect(rows).toHaveLength(2)

    const uchi = rows.find((r) => r.name === 'Uchigatana')!
    expect(uchi.kind).toBe('smithing')
    expect(uchi.max).toBe(25)
    expect(uchi.needs.find((n) => n.name === 'Smithing Stone [1]')?.count).toBe(12)

    const rob = rows.find((r) => r.name === 'Rivers of Blood')!
    expect(rob.kind).toBe('somber')
    expect(rob.max).toBe(10)
    expect(rob.needs.map((n) => n.name)).toContain('Somber Smithing Stone [1]')
  })

  it('honours a +N target and known owned counts', () => {
    const character: Character = {
      ...emptyCharacter,
      loadout: [{ id: 'u', name: 'Uchigatana', kind: 'armament', upgrade: 0 }],
    }
    const rows = smithingTracker(character, weapons, { target: 2, owned: { 'Smithing Stone [1]': 3 } })
    const uchi = rows[0]
    expect(uchi.target).toBe(2)
    expect(uchi.needs).toHaveLength(1)
    expect(uchi.needs[0].have).toBe(3)
  })

  it('returns nothing before the regulation data loads', () => {
    expect(smithingTracker(emptyCharacter, null)).toEqual([])
  })
})
