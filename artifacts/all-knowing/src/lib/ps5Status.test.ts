import { describe, expect, it } from 'vitest'
import { parseTsvWords, type OcrWord } from './ps5Ocr'
import { extractStatus, interpretStatus, labelField, mergeStatusReads, type StatusRead } from './ps5Status'
import { matchStatBonus, statBoostGear, withoutBoost } from './statBoostGear'

function word(text: string, x0: number, y0: number, w = 80, h = 30, confidence = 0.95, line = 1): OcrWord {
  return { text, confidence, x0, y0, x1: x0 + w, y1: y0 + h, line }
}

describe('parseTsvWords', () => {
  it('keeps only confident word rows and reads their boxes', () => {
    const tsv = [
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
      '5\t1\t1\t1\t1\t1\t10\t20\t40\t12\t96\tVigor',
      '5\t1\t1\t1\t1\t2\t200\t20\t20\t12\t88\t55',
      '5\t1\t1\t1\t1\t3\t300\t20\t20\t12\t-1\t',
    ].join('\n')
    const words = parseTsvWords(tsv)
    expect(words.map((w) => w.text)).toEqual(['Vigor', '55'])
    expect(words[1].x0).toBe(200)
    expect(words[1].confidence).toBeCloseTo(0.88)
  })
})

describe('labelField', () => {
  it('matches labels with common OCR damage', () => {
    expect(labelField('Vigour')).toBe('vigor')
    expect(labelField('Enduranc')).toBe('endurance')
    expect(labelField('Held')).toBe('runesHeld')
    expect(labelField('Needed')).toBe('runesNeeded')
    expect(labelField('Dexterity')).toBe('dexterity')
    expect(labelField('base')).toBeUndefined()
  })
})

describe('extractStatus anchoring', () => {
  it('reads the number to the right of each label on its row', () => {
    const words = [
      word('Level', 50, 100),
      word('87', 400, 100),
      word('Vigor', 50, 140),
      word('64', 400, 141),
      word('Mind', 50, 180),
      word('14', 402, 181),
      // a number on a different row must not be borrowed
      word('999', 400, 300),
    ]
    const read = extractStatus(words)
    expect(read.fields.level?.value).toBe(87)
    expect(read.fields.vigor?.value).toBe(64)
    expect(read.fields.mind?.value).toBe(14)
    expect(read.fields.strength).toBeUndefined()
  })
})

describe('mergeStatusReads', () => {
  it('trusts a single clean read over several correlated short reads', () => {
    const good: StatusRead = { fields: { level: { value: 87, confidence: 0.89 } } }
    const short: StatusRead[] = [0.44, 0.28, 0.59, 0.46].map((c) => ({ fields: { level: { value: 7, confidence: c } } }))
    expect(mergeStatusReads([good, ...short]).fields.level?.value).toBe(87)
  })
})

describe('interpretStatus + stat-boost correction', () => {
  const base = { vigor: 59, mind: 14, endurance: 22, strength: 16, dexterity: 18, intelligence: 9, faith: 15, arcane: 13 }
  const displayed = { vigor: 64, mind: 14, endurance: 27, strength: 21, dexterity: 23, intelligence: 9, faith: 15, arcane: 13 }

  it('accepts a spread whose sum is level + 79', () => {
    const read: StatusRead = { fields: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, { value: v, confidence: 1 }])) }
    read.fields.level = { value: 87, confidence: 1 }
    const result = interpretStatus(read)
    expect(result.baseStats).toEqual(base)
    expect(result.bonus.gear).toBeUndefined()
  })

  it('removes Radagon’s Soreseal when the screen is 20 over level', () => {
    const read: StatusRead = { fields: Object.fromEntries(Object.entries(displayed).map(([k, v]) => [k, { value: v, confidence: 1 }])) }
    read.fields.level = { value: 87, confidence: 1 }
    const result = interpretStatus(read)
    expect(result.baseStats).toEqual(base)
    expect(result.bonus.gear?.map((g) => g.name)).toEqual(["Radagon's Soreseal"])
  })

  it('does not invent gear when the over-level total is unexplained', () => {
    const match = matchStatBonus(1, { vigor: 40, mind: 10, endurance: 10, strength: 10, dexterity: 10, intelligence: 10, faith: 10, arcane: 10 })
    expect(match.gear).toBeUndefined()
    expect(match.unexplained).toBe(true)
  })

  it('keeps every table entry’s stat direction plausible', () => {
    for (const gear of statBoostGear) {
      const clean = { vigor: 99, mind: 99, endurance: 99, strength: 99, dexterity: 99, intelligence: 99, faith: 99, arcane: 99 }
      const reduced = withoutBoost(clean, gear.deltas)
      expect(reduced).not.toEqual(clean)
    }
  })
})
