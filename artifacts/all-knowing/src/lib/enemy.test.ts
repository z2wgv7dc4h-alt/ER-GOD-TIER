import { describe, expect, it } from 'vitest'
import { AttackPowerType } from './ar'
import { bestDamageType, effectiveDamage, negationText } from './enemy'
import type { BossCombat } from './enemy'

const malenia: BossCombat = {
  factId: 'boss:malenia',
  name: 'Malenia, Blade of Miquella',
  npcRow: 21200000,
  paramName: 'Malenia, Blade of Miquella',
  baseHp: 2489,
  poise: 80,
  negation: { physical: 10, magic: 20, fire: 0, lightning: 20, holy: 40 },
  resist: { poison: 542, scarletRot: 542, bleed: 154, sleep: 252, madness: 999, curse: 999 },
}

describe('enemy combat stats', () => {
  it('picks the damage type with the highest negation', () => {
    expect(bestDamageType(malenia)).toBe('holy')
  })

  it('applies per-type negation to an attack-rating breakdown', () => {
    const result = effectiveDamage(
      { [AttackPowerType.PHYSICAL]: 100, [AttackPowerType.HOLY]: 100 },
      malenia,
    )
    expect(result.total).toBeCloseTo(90 + 60, 5)
    expect(result.byType[AttackPowerType.HOLY]).toBeCloseTo(60, 5)
  })

  it('reports weaknesses as negative negation', () => {
    expect(negationText(40)).toBe('40% resist')
    expect(negationText(-40)).toBe('40% weak')
    expect(negationText(0)).toBe('neutral')
  })
})
