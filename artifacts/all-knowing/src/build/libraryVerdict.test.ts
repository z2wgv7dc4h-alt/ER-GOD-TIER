import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData, type Weapon } from '../lib/ar'
import { weaponVerdict } from '../lib/weaponVerdict'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

const uchi = weapons.find((w) => w.weaponName === 'Uchigatana' && w.affinityId === 0)!

const capable: Character = {
  ...emptyCharacter,
  stats: { ...emptyCharacter.stats, strength: 20, dexterity: 40, arcane: 20 },
}

describe('library verdict with no weapon equipped (Task 110 §5)', () => {
  it('says Usable rather than Upgrade when nothing is equipped', () => {
    const v = weaponVerdict(capable, weapons, uchi)
    expect(v.kind).toBe('usable')
    expect(v.meets).toBe(true)
  })

  it('still says Needs when the requirements are unmet', () => {
    const v = weaponVerdict(emptyCharacter, weapons, uchi)
    expect(v.kind).toBe('not-for-you')
    expect(v.meets).toBe(false)
  })

  it('only compares against a real equipped weapon once one is worn', () => {
    const equipped: Character = { ...capable, loadout: [{ id: 'u', name: 'Uchigatana', kind: 'armament', upgrade: 0 }] }
    const v = weaponVerdict(equipped, weapons, uchi)
    expect(v.kind).not.toBe('usable')
  })
})
