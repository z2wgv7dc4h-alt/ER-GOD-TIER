import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  armorByName,
  matchArmors,
  matchAshes,
  matchBosses,
  matchEquipment,
  matchItems,
  matchLocations,
  matchNpcs,
  matchSpells,
  matchTalismans,
  talismanEffect,
  type ArmorRow,
  type AshRow,
  type BossRow,
  type ItemRow,
  type NpcRow,
  type SpellRow,
  type TalismanRow,
} from './fanapiData'

const read = <T,>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../public/sourced/open/fanapi/${file}`, import.meta.url), 'utf8')) as T

const armors = read<ArmorRow[]>('armors.json')
const talismans = read<TalismanRow[]>('talismans.json')
const spells = read<SpellRow[]>('spells.json')
const ashes = read<AshRow[]>('ashes.json')
const items = read<ItemRow[]>('items.json')
const locations = read<{ name: string; region: string }[]>('locations.json')
const bosses = read<BossRow[]>('bosses.json')
const npcs = read<NpcRow[]>('npcs.json')
const weapons = read<{ name: string; category: string; weight: number }[]>('weapons.json')
const shields = read<{ name: string; category: string; weight: number }[]>('shields.json')

describe('FanAPI reference data (Task 67/68)', () => {
  it('has the expected snapshot counts', () => {
    expect(armors.length).toBe(568)
    expect(talismans.length).toBe(87)
    expect(spells.length).toBe(169) // 71 sorceries + 98 incantations
    expect(ashes.length).toBe(90)
    expect(items.length).toBe(462)
    expect(locations.length).toBe(177)
    expect(bosses.length).toBe(106)
    expect(npcs.length).toBe(55)
    expect(weapons.length).toBe(307)
    expect(shields.length).toBe(69)
  })

  it('keeps only structured fields (no article bodies or images)', () => {
    expect(Object.keys(armors[0])).toEqual(['name', 'category', 'weight', 'poise', 'dmgNegation', 'resistance'])
    expect(Object.keys(talismans[0])).toEqual(['name', 'effect'])
    expect(Object.keys(spells[0])).toEqual(['name', 'type', 'cost', 'slots', 'requires', 'effect'])
    expect(Object.keys(ashes[0])).toEqual(['name', 'affinity', 'skill'])
    expect(Object.keys(items[0])).toEqual(['name', 'type', 'effect'])
    // Weapons/shields carry no attack/defence numbers — AR stays on regulation.
    expect(Object.keys(weapons[0])).toEqual(['name', 'category', 'weight'])
    expect(Object.keys(bosses[0])).toEqual(['name', 'region', 'location', 'hp', 'drops'])
  })

  it('exposes real armor poise / negation by name', () => {
    const vet = armorByName(armors, "Veteran's Armor")
    expect(vet?.poise).toBeGreaterThan(0)
    expect(typeof vet?.dmgNegation.Phy).toBe('number')
  })

  it('exposes talisman effects and matches by name', () => {
    expect(talismanEffect(talismans, "Lord of Blood's Exultation")).toBeTruthy()
    expect(matchTalismans('canvas', talismans).length).toBeGreaterThanOrEqual(2)
  })

  it('matches spells and Ashes of War by name', () => {
    expect(matchSpells('comet', spells).some((s) => s.name.includes('Comet'))).toBe(true)
    expect(matchAshes('lions claw', ashes).some((a) => a.name === "Lion's Claw")).toBe(true)
  })

  it('matches the rest of the reference sets', () => {
    expect(matchArmors('bull-goat', armors).length).toBeGreaterThanOrEqual(1)
    expect(matchItems('cipher', items).length).toBeGreaterThanOrEqual(1)
    expect(matchLocations('sacrifice', locations).length).toBeGreaterThanOrEqual(1)
    expect(matchBosses('godrick', bosses).length).toBeGreaterThanOrEqual(1)
    expect(matchNpcs('merchant', npcs).length).toBeGreaterThanOrEqual(1)
    expect(matchEquipment('buckler', shields).length).toBeGreaterThanOrEqual(1)
    expect(matchEquipment('hand axe', weapons).length).toBeGreaterThanOrEqual(1)
  })
})
