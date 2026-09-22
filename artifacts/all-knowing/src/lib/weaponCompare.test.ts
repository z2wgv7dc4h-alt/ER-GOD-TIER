import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { AttackRating, EncodedRegulationDataJson, Weapon } from './ar'
import { attackRatingForSlot, decodeRegulationData } from './ar'
import type { CombatStats } from './enemy'
import { effectiveDamage } from './enemy'
import { compareWeaponAr } from './weaponCompare'
import type { LoadoutSlot, Stats } from '../types'

// Real vendored regulation data (the same file the app loads at runtime).
const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ) as EncodedRegulationDataJson,
)

const stats: Stats = {
  vigor: 50,
  mind: 20,
  endurance: 25,
  strength: 12,
  dexterity: 40,
  intelligence: 9,
  faith: 8,
  arcane: 45,
}

const standard: LoadoutSlot = { id: 'a', name: 'Uchigatana', kind: 'armament', affinity: 'Standard', upgrade: 0 }
const blood: LoadoutSlot = { id: 'b', name: 'Uchigatana', kind: 'armament', affinity: 'Blood', upgrade: 0 }

const dummyTarget: CombatStats = {
  factId: 'test',
  name: 'Dummy',
  npcRow: 0,
  paramName: 'test',
  baseHp: 1,
  poise: 0,
  negation: { physical: 20, magic: 0, fire: 0, lightning: 0, holy: 0 },
  resist: { poison: 0, scarletRot: 0, bleed: 0, sleep: 0, madness: 0, curse: 0 },
}

function total(r: AttackRating): number {
  return r.status === 'ok' ? r.total : -1
}

describe('weapon comparison (Task 48)', () => {
  it('per-side AR is exactly the single-weapon engine output', () => {
    const outcome = compareWeaponAr(
      weapons,
      stats,
      { slot: standard, twoHanding: false },
      { slot: blood, twoHanding: false },
    )
    expect(outcome.a.rating).toEqual(attackRatingForSlot(weapons, standard, stats, false))
    expect(outcome.b.rating).toEqual(attackRatingForSlot(weapons, blood, stats, false))
    expect(total(outcome.a.rating)).toBeGreaterThan(0)
    expect(total(outcome.b.rating)).toBeGreaterThan(0)
  })

  it('gives a clear winner when the two configs differ, and tie when identical', () => {
    const differing = compareWeaponAr(
      weapons,
      stats,
      { slot: standard, twoHanding: false },
      { slot: blood, twoHanding: false },
    )
    const ta = total(differing.a.rating)
    const tb = total(differing.b.rating)
    expect(ta).not.toBe(tb)
    expect(differing.winner).toBe(ta > tb ? 'a' : 'b')

    const same = compareWeaponAr(
      weapons,
      stats,
      { slot: standard, twoHanding: false },
      { slot: { ...standard, id: 'c' }, twoHanding: false },
    )
    expect(same.winner).toBe('tie')
  })

  it('two-handing is per side and never leaks across', () => {
    const base = compareWeaponAr(
      weapons,
      stats,
      { slot: standard, twoHanding: false },
      { slot: blood, twoHanding: false },
    )
    const aTwo = compareWeaponAr(
      weapons,
      stats,
      { slot: standard, twoHanding: true },
      { slot: blood, twoHanding: false },
    )
    // Side B is untouched by side A's toggle...
    expect(aTwo.b.rating).toEqual(base.b.rating)
    // ...and side A reflects it whenever two-handing actually changes the weapon.
    expect(aTwo.a.rating).toEqual(attackRatingForSlot(weapons, standard, stats, true))
  })

  it('adds real effective damage vs a target without changing AR', () => {
    const outcome = compareWeaponAr(
      weapons,
      stats,
      { slot: standard, twoHanding: false },
      { slot: blood, twoHanding: false },
      dummyTarget,
    )
    const direct = attackRatingForSlot(weapons, standard, stats, false)
    expect(outcome.a.rating).toEqual(direct)
    if (direct.status !== 'ok') throw new Error('expected AR for Uchigatana')
    expect(outcome.a.effective?.total).toBeCloseTo(effectiveDamage(direct.breakdown, dummyTarget).total, 5)
    expect(outcome.b.effective?.total).toBeGreaterThan(0)
  })
})
