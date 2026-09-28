import { describe, expect, it } from 'vitest'
import {
  buildWeaponCatalogue,
  extractEquipmentHeader,
  headerToLoadout,
  parseSlotLabel,
  parseWeaponLine,
  weaponTypeFromName,
} from './ps5Equipment'
import type { OcrWord } from './ps5Ocr'

const catalogue = buildWeaponCatalogue(['Reed Great Katana', 'Uchigatana', 'Rivers of Blood'], ["Lion's Claw"])

function word(text: string, x0: number, y0: number, w = 90, h = 34, line = 1): OcrWord {
  return { text, confidence: 0.95, x0, y0, x1: x0 + w, y1: y0 + h, line }
}

describe('parseSlotLabel', () => {
  it('reads every slot form the game uses', () => {
    expect(parseSlotLabel('Right Hand Armament 1')).toBe('Right Hand Armament 1')
    expect(parseSlotLabel('Left Hand Armament 2')).toBe('Left Hand Armament 2')
    expect(parseSlotLabel('Talisman 3')).toBe('Talisman 3')
    expect(parseSlotLabel('Chest Armor')).toBe('Chest Armor')
  })
})

describe('weaponTypeFromName', () => {
  it('takes the longest known category suffix', () => {
    expect(weaponTypeFromName('Reed Great Katana')).toBe('Great Katana')
    expect(weaponTypeFromName('Dragon-Hunter’s Great Katana')).toBe('Great Katana')
    expect(weaponTypeFromName('Iron Greatsword')).toBe('Greatsword')
  })
})

describe('parseWeaponLine', () => {
  it('splits affinity, base and upgrade and matches the catalogue', () => {
    const parsed = parseWeaponLine('Blood Reed Great Katana+14', catalogue)
    expect(parsed).toMatchObject({ affinity: 'Blood', base: 'Reed Great Katana', upgrade: 14, weaponType: 'Great Katana', matchScore: 1 })
  })

  it('tolerates an OCR slip in the base name', () => {
    const parsed = parseWeaponLine('Blood Reed Great Katana +14', catalogue)
    expect(parsed?.base).toBe('Reed Great Katana')
    expect(parsed?.upgrade).toBe(14)
  })

  it('matches a plain weapon with no affinity or upgrade', () => {
    const parsed = parseWeaponLine('Uchigatana', catalogue)
    expect(parsed?.base).toBe('Uchigatana')
    expect(parsed?.upgrade).toBeUndefined()
  })
})

describe('extractEquipmentHeader', () => {
  it('finds the slot and item line from positioned words', () => {
    const words = [
      word('Right', 200, 100, 60, 34, 1), word('Hand', 265, 100, 60, 34, 1), word('Armament', 330, 100, 110, 34, 1), word('1', 445, 100, 20, 34, 1),
      word('Blood', 200, 150, 70, 34, 2), word('Reed', 275, 150, 60, 34, 2), word('Great', 340, 150, 70, 34, 2), word('Katana+14', 415, 150, 110, 34, 2),
      // right panel noise on the same photo
      word('Blood', 1300, 150, 70, 34, 2), word('Reed', 1380, 150, 60, 34, 2), word('Great', 1450, 150, 70, 34, 2),
    ]
    const header = extractEquipmentHeader(words, catalogue)
    expect(header.slot).toBe('Right Hand Armament 1')
    expect(header.item).toMatchObject({ base: 'Reed Great Katana', affinity: 'Blood', upgrade: 14 })
    expect(headerToLoadout(header)?.name).toBe('Reed Great Katana')
  })
})
