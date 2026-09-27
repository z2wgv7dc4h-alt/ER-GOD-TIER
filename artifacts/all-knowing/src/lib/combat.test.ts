import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AttackPowerType, decodeRegulationData, type Weapon } from './ar'
import { bestDamageTypeFor, bossPrep, damageVs, resistDamageTypes, statusRows, weakDamageTypes } from './combat'
import type { BossCombat } from './enemy'
import { emptyCharacter } from '../data/seed'
import type { Character, Stats } from '../types'

/** The real extracts, read off disk — not hand-rolled fixtures. */
const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)
const bosses = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/npc-combat.json', import.meta.url), 'utf8'),
) as BossCombat[]

const margit = bosses.find((b) => b.factId === 'boss:margit')!
const malenia = bosses.find((b) => b.factId === 'boss:malenia')!

const areas = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/region-levels.json', import.meta.url), 'utf8'),
).areas

const stats = (over: Partial<Stats> = {}): Stats => ({ ...emptyCharacter.stats, ...over })

function char(over: Partial<Character> = {}): Character {
  return { ...emptyCharacter, ...over, stats: stats(over.stats) }
}

const uchi = (upgrade: number, affinity = 'Keen') =>
  char({
    level: 40,
    stats: stats({ vigor: 40, endurance: 25, strength: 14, dexterity: 50, arcane: 10 }),
    loadout: [{ id: 'uchi', name: 'Uchigatana', kind: 'armament', affinity, upgrade }],
  })

describe('combat weakness classification', () => {
  it('reads resistances as positive negation and weaknesses as negative', () => {
    expect(resistDamageTypes(margit)).toContain('holy')
    expect(resistDamageTypes(malenia)).toContain('holy')
    expect(weakDamageTypes(margit)).toEqual([])
  })

  it('picks the least-negated damage type', () => {
    // Margit is neutral to physical (0) and resists holy (40).
    expect(bestDamageTypeFor(margit)).toBe('physical')
    // Malenia is neutral to fire (0) and resists holy (40).
    expect(bestDamageTypeFor(malenia)).toBe('fire')
  })
})

describe('bossPrep with real Margit / Malenia / Radahn rows', () => {
  it('reports Margit HP, poise and the Stormveil level band', () => {
    const prep = bossPrep('boss:margit', uchi(25), { weapons, bosses, areas })!
    expect(prep).toBeTruthy()
    expect(prep.name).toBe('Margit, the Fell Omen')
    expect(prep.hp).toBe(2521)
    expect(prep.poise).toBe(80)
    expect(prep.region).toBe('Stormveil')
    expect(prep.level).toMatchObject({ area: 'Stormveil Castle', levelMin: 30, levelMax: 40, status: 'in' })
  })

  it('ranks the owned weapons by AR after negation', () => {
    const prep = bossPrep('boss:margit', uchi(25), { weapons, bosses })!
    expect(prep.weapons.length).toBeGreaterThan(0)
    for (let i = 0; i + 1 < prep.weapons.length; i++) {
      expect(prep.weapons[i].effectiveDamage).toBeGreaterThanOrEqual(prep.weapons[i + 1].effectiveDamage)
    }
    expect(prep.bestWeapon?.weaponName).toBe('Uchigatana')
    // `ar` is the floored display number; effective damage keeps the fraction.
    expect(prep.bestWeapon!.effectiveDamage).toBeLessThanOrEqual(prep.bestWeapon!.ar + 1)
    expect(prep.bestWeapon!.equipped).toBe(true)
  })

  it('counts first-proc hits from the best weapon against Malenia', () => {
    const prep = bossPrep('boss:malenia', { ...uchi(25), completedQuestSteps: [] }, { weapons, bosses })!
    const bleed = prep.status.find((s) => s.key === 'bleed')!
    expect(bleed.resist).toBe(154)
    expect(bleed.buildup).toBeGreaterThan(0)
    expect(bleed.hitsToProc).toBe(Math.ceil(154 / bleed.buildup))

    const frost = prep.status.find((s) => s.key === 'frost')!
    expect(frost.resist).toBeNull()
    expect(frost.hitsToProc).toBeNull()

    const madness = prep.status.find((s) => s.key === 'madness')!
    expect(madness.immune).toBe(true)
    expect(madness.hitsToProc).toBeNull()
  })

  it('finds Radahn and his weak point', () => {
    const prep = bossPrep('boss:radahn', uchi(25), { weapons, bosses })!
    expect(prep.hp).toBe(2585)
    expect(prep.poise).toBe(200)
    expect(prep.bestType).toBe('physical')
  })

  it('resolves owned spirit ashes by tier, highest first', () => {
    const c = char({
      collectedItems: ['loot:tiche'],
      loadout: [{ id: 'mimic', name: 'Mimic Tear Ashes', kind: 'ash' }],
    })
    const prep = bossPrep('boss:margit', c, { weapons, bosses })!
    const tiers = prep.spirits.map((s) => s.tier)
    expect(prep.spirits.map((s) => s.name)).toContain('Black Knife Tiche')
    expect(prep.spirits.map((s) => s.name)).toContain('Mimic Tear Ashes')
    expect(tiers).toEqual([...tiers].sort())
  })

  it('surfaces owned helpers and not unowned ones', () => {
    const owned = bossPrep('boss:margit', char({ collectedItems: ['loot:lord-blood-exul'] }), { weapons, bosses })!
    expect(owned.helpers.map((h) => h.name)).toContain('Lord of Blood’s Exultation')

    const none = bossPrep('boss:margit', char(), { weapons, bosses })!
    expect(none.helpers.map((h) => h.name)).not.toContain('Lord of Blood’s Exultation')
  })

  it('reports NPC summon availability from quest facts, and drops it in co-op', () => {
    const c = char({ completedQuestSteps: ['quest:alexander:festival'] })
    const prep = bossPrep('boss:radahn', c, { weapons, bosses })!
    expect(prep.summon).toMatchObject({ name: 'Alexander, Iron Fist', available: true })
    expect(prep.coop).toBe(false)

    const coop = bossPrep('boss:radahn', char({ ...c, answers: { coop: 'yes' } }), { weapons, bosses })!
    expect(coop.summon!.available).toBe(false)
    expect(coop.summon!.note).toMatch(/co-op/i)
  })

  it('returns null for a boss with no combat row', () => {
    expect(bossPrep('boss:does-not-exist', uchi(25), { weapons, bosses })).toBeNull()
  })
})

describe('damageVs', () => {
  it('breaks a weapon down per type and applies Margit’s negation', () => {
    const result = damageVs('Uchigatana', 25, 'Keen', stats({ dexterity: 50 }), 'boss:margit', { weapons, bosses })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.weaponName).toBe('Keen Uchigatana')
    expect(result.ar[AttackPowerType.PHYSICAL]).toBeGreaterThan(0)
    // Margit has 0% physical negation, so the type carries straight through.
    expect(result.afterNegation[AttackPowerType.PHYSICAL]).toBeCloseTo(result.ar[AttackPowerType.PHYSICAL]!, 5)
    expect(result.defenseModelled).toBe(false)
    expect(result.defenseTotal).toBeCloseTo(result.negationTotal, 5)
  })

  it('applies a caller-supplied flat defence only when one exists', () => {
    const armored = { ...margit, defense: { physical: 50 } } as BossCombat
    const base = damageVs('Uchigatana', 25, 'Keen', stats({ dexterity: 50 }), 'boss:margit', { weapons, bosses })
    const reduced = damageVs('Uchigatana', 25, 'Keen', stats({ dexterity: 50 }), 'boss:margit', {
      weapons,
      bosses: [armored, ...bosses.filter((b) => b.factId !== 'boss:margit')],
    })
    expect(base.status).toBe('ok')
    expect(reduced.status).toBe('ok')
    if (base.status !== 'ok' || reduced.status !== 'ok') return
    expect(reduced.defenseModelled).toBe(true)
    const raw = reduced.afterNegation[AttackPowerType.PHYSICAL]!
    expect(reduced.afterDefense[AttackPowerType.PHYSICAL]).toBeCloseTo(Math.max(0, raw - 50), 5)
  })

  it('returns an explicit unknown for an unmatched weapon or target', () => {
    expect(damageVs('Not A Weapon', 0, undefined, stats(), 'boss:margit', { weapons, bosses }).status).toBe('unknown')
    expect(damageVs('Uchigatana', 0, undefined, stats(), 'boss:nope', { weapons, bosses }).status).toBe('unknown')
  })
})

describe('statusRows', () => {
  it('derives the proc count from the same buildup the AR engine reports', () => {
    const uchigatana = weapons.find((w) => w.name === 'Uchigatana')!
    const rows = statusRows(uchigatana, malenia)
    const bleed = rows.find((r) => r.key === 'bleed')!
    expect(bleed.buildup).toBeGreaterThan(0)
    // NpcParam resist is the meter; ar.ts status attack is the per-hit fill.
    expect(bleed.hitsToProc).toBe(Math.ceil(malenia.resist.bleed / bleed.buildup))
  })

  it('reads buildup at the upgrade it is given', () => {
    const uchigatana = weapons.find((w) => w.name === 'Uchigatana')!
    const base = statusRows(uchigatana, malenia, 0).find((r) => r.key === 'bleed')!
    const max = statusRows(uchigatana, malenia, 25).find((r) => r.key === 'bleed')!
    expect(max.buildup).toBeGreaterThanOrEqual(base.buildup)
    expect(max.hitsToProc).toBe(Math.ceil(malenia.resist.bleed / max.buildup))
  })

  it('says so when there is no weapon', () => {
    const rows = statusRows(undefined, margit)
    expect(rows.every((r) => r.hitsToProc === null)).toBe(true)
    expect(rows.find((r) => r.key === 'bleed')!.note).toMatch(/no buildup/i)
  })

  it('reads frost and the immune statuses honestly', () => {
    const rows = statusRows(undefined, margit)
    expect(rows.find((r) => r.key === 'frost')!.note).toMatch(/not in the NpcParam extract/i)
    expect(rows.find((r) => r.key === 'madness')!.immune).toBe(true)
    expect(rows.find((r) => r.key === 'poison')!.resist).toBe(margit.resist.poison)
  })
})
