import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AttackPowerType } from './ar'
import {
  BASE_HP_LABEL,
  BASE_HP_NOTE,
  bestDamageType,
  weaknessLine,
  bossTarget,
  combatTargetFor,
  effectiveDamage,
  enemyTarget,
  enemyTargetNames,
  hpVariants,
  negationText,
} from './enemy'
import type { BossCombat, EnemyCombat } from './enemy'

/** The real Task 22 extract, read straight off disk — not a hand-rolled fixture. */
const regularEnemies = JSON.parse(
  readFileSync(new URL('../../public/sourced/enemy-combat.json', import.meta.url), 'utf8'),
) as EnemyCombat[]

const bosses = JSON.parse(
  readFileSync(new URL('../../public/sourced/npc-combat.json', import.meta.url), 'utf8'),
) as BossCombat[]

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
  it('picks the damage type with the lowest negation (the real weakness)', () => {
    // Malenia negates 40% holy and 0% fire: she is weak to fire, resists holy.
    expect(bestDamageType(malenia)).toBe('fire')
    expect(weaknessLine(malenia)).toBe('weak to Fire · resists Holy (40% resist)')
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

describe('regular enemy combat table (Task 22 extract)', () => {
  /** The common variant of a name (most MSB placements), matching the UI picker. */
  const pick = (name: string) =>
    regularEnemies.filter((e) => e.name === name).sort((a, b) => b.placements - a.placements)[0]
  const runebear = pick('Runebear')
  const soldier = pick('Godrick Soldier')

  it('has real placed non-boss enemies', () => {
    expect(regularEnemies.length).toBeGreaterThan(500)
    expect(runebear).toBeDefined()
    expect(soldier).toBeDefined()
  })

  it('reads Runebear straight from NpcParam', () => {
    expect(runebear).toMatchObject({
      factId: 'enemy:46300010',
      npcRow: 46300010,
      model: 'c4630',
      baseHp: 2585,
      poise: 80,
    })
    expect(runebear!.negation).toEqual({ physical: 0, magic: 0, fire: -20, lightning: 0, holy: 0 })
    expect(runebear!.resist).toEqual({ poison: 154, scarletRot: 154, bleed: 252, sleep: 84, madness: 999, curse: 999 })
  })

  it('reads a common soldier and its lightning weakness', () => {
    expect(soldier).toMatchObject({ factId: 'enemy:43111310', baseHp: 192, poise: 30 })
    expect(soldier!.negation.lightning).toBe(-20)
    expect(negationText(soldier!.negation.lightning)).toBe('20% weak')
  })

  it('applies negation to a weapon breakdown for a field enemy', () => {
    const result = effectiveDamage({ [AttackPowerType.PHYSICAL]: 200, [AttackPowerType.LIGHTNING]: 100 }, soldier!)
    expect(result.total).toBeCloseTo(200 + 120, 5)
  })

  it('does not collide with the boss table (the two partition the roster)', () => {
    const bossIds = new Set(bosses.map((b) => b.factId))
    expect(regularEnemies.some((e) => bossIds.has(e.factId))).toBe(false)
    expect(regularEnemies.every((e) => e.factId === `enemy:${e.npcRow}`)).toBe(true)
  })

  it('exposes both rows through one tagged interface', () => {
    const targets = [bossTarget(bosses[0]), enemyTarget(runebear!)]
    expect(targets.map((t) => t.kind)).toEqual(['boss', 'enemy'])
    expect(combatTargetFor(targets, runebear!.factId)?.name).toBe('Runebear')
    expect(combatTargetFor(targets, bosses[0].factId)?.kind).toBe('boss')
  })

  it('dedupes field-enemy names and drops (Boss) variants for the picker', () => {
    const names = enemyTargetNames(regularEnemies)
    expect(names).toContain('Runebear')
    expect(names).toContain('Giant Crab')
    expect(names.every((n) => !n.includes('(Boss)'))).toBe(true)
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeLessThan(regularEnemies.length)
  })
})

describe('base HP labelling (Task 137 §3)', () => {
  it('always names the NpcParam value "Base HP"', () => {
    expect(BASE_HP_LABEL).toBe('Base HP')
    expect(BASE_HP_NOTE).toMatch(/base HP/i)
    expect(hpVariants(4174)).toEqual([{ label: 'Base HP', value: 4174 }])
  })

  it('appends NG / NG+ rows only when an area scaling value is known', () => {
    expect(hpVariants(4174, { ng: 4382, ngPlus: 5010 })).toEqual([
      { label: 'Base HP', value: 4174 },
      { label: 'NG', value: 4382 },
      { label: 'NG+', value: 5010 },
    ])
    expect(hpVariants(4174, {})).toHaveLength(1)
  })
})
