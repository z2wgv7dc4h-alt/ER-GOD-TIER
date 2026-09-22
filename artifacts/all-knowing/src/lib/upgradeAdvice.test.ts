import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData } from './ar'
import { earlyWeaponRanking, weaponAdvice } from './upgradeAdvice'
import { emptyStats } from '../data/seed'
import type { Stats } from '../types'

const weapons = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)
const stats: Stats = { ...emptyStats, vigor: 40, endurance: 25, strength: 30, dexterity: 20, intelligence: 10, faith: 10, arcane: 10 }

describe('weaponAdvice', () => {
  it('reports AR now and at max upgrade for a named weapon', () => {
    const adv = weaponAdvice(weapons, 'rivers of blood', stats)
    expect(adv).toBeTruthy()
    expect(adv!.name).toMatch(/Rivers of Blood/i)
    expect(adv!.arNow).toBeGreaterThan(0)
    expect(adv!.arMax).toBeGreaterThanOrEqual(adv!.arNow)
    expect(adv!.upgradeMax).toBeGreaterThan(0)
    expect(adv!.scaling.length).toBeGreaterThan(0)
  })

  it('returns null for an unknown weapon', () => {
    expect(weaponAdvice(weapons, 'zzzznotaweapon', stats)).toBeNull()
  })
})

describe('earlyWeaponRanking', () => {
  it('returns strongest wieldable weapons by base AR', () => {
    const top = earlyWeaponRanking(weapons, stats, 5)
    expect(top.length).toBe(5)
    expect(top[0].ar).toBeGreaterThanOrEqual(top[4].ar)
    // every ranked weapon must be wieldable at these stats
    for (const r of top) {
      const w = weapons.find((x) => x.name === r.name && x.affinityId === 0)!
      for (const [k, v] of Object.entries(w.requirements)) {
        const attr = { str: 'strength', dex: 'dexterity', int: 'intelligence', fai: 'faith', arc: 'arcane' }[k] as keyof Stats
        expect(stats[attr]).toBeGreaterThanOrEqual(v ?? 0)
      }
    }
  })
})
