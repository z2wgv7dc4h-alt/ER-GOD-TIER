import { describe, expect, it } from 'vitest'
import { parseEquipmentText } from './equipmentOcr'

describe('parseEquipmentText', () => {
  it('reads the eight attributes and level', () => {
    const r = parseEquipmentText('Level 55\nVigour 40\nMind 20\nEndurance 25\nStrength 30\nDexterity 20\nIntelligence 10\nFaith 10\nArcane 12')
    expect(r.level).toBe(55)
    expect(r.stats.vigor).toBe(40)
    expect(r.stats.arcane).toBe(12)
  })

  it('picks out gear names', () => {
    const r = parseEquipmentText('Uchigatana\nRivers of Blood\nLord of Blood’s Exultation')
    expect(r.gear).toContain('Uchigatana')
    expect(r.gear.some((g) => g.includes('Rivers of Blood'))).toBe(true)
  })

  it('returns nothing rather than guess on gibberish', () => {
    const r = parseEquipmentText('qzxw vbnm plok 9999')
    expect(r.level).toBeUndefined()
    expect(Object.keys(r.stats)).toHaveLength(0)
  })
})
