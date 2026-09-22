import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import {
  OCR_CONFIDENCE_FLOOR,
  applyOcrRead,
  factsFromText,
  matchBulkLines,
  readImageText,
} from './ocr'

describe('factsFromText', () => {
  it('resolves warp-list names to canonical grace ids', () => {
    const matches = factsFromText('Church of Elleh')
    expect(matches.some((m) => m.id === 'grace:elleh')).toBe(true)
  })

  it('resolves Great Rune names to their item facts', () => {
    const matches = factsFromText("Godrick's Great Rune")
    expect(matches.some((m) => m.id === 'item:godrick-great-rune')).toBe(true)
  })

  it('handles a multi-line menu capture', () => {
    const matches = factsFromText('The First Step\nChurch of Elleh\nGodrick’s Great Rune')
    const ids = matches.map((m) => m.id)
    expect(ids).toContain('grace:first-step')
    expect(ids).toContain('grace:elleh')
    expect(ids).toContain('item:godrick-great-rune')
  })

  it('returns nothing for text that matches no catalog entry', () => {
    expect(factsFromText('qzxw vbnm plok')).toHaveLength(0)
  })

  it('matches general inventory items from the open name index', () => {
    // Names that live in names.json (not the small authored catalog) must still
    // resolve, so an inventory screenshot marks real items the player holds.
    const matches = factsFromText('Larval Tear\nFurlcalling Finger Remedy')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})

describe('matchBulkLines', () => {
  const list = [
    'The First Step',
    'Church of Elleh',
    'Gatefront',
    'Liurnia Lake Shore',
    'East Capital Rampart',
    'Foot of the Forge',
    'Gravesite Plain',
    'Main Gate Plaza',
    'Erdtree-Gazing Hill',
    'Capital Rampart',
    'Totally Made Up Place',
    'qzxw vbnm',
  ].join('\n')

  it('returns one verdict per non-blank line, in menu order', () => {
    const lines = matchBulkLines(list)
    expect(lines).toHaveLength(12)
    expect(lines[0].line).toBe('The First Step')
    expect(lines[11].line).toBe('qzxw vbnm')
  })

  it('matches each line independently and flags misses instead of guessing', () => {
    const lines = matchBulkLines(list)
    expect(lines.filter((l) => l.matches.length).length).toBe(10)
    expect(lines.find((l) => l.line === 'Church of Elleh')?.matches.some((m) => m.id === 'grace:elleh')).toBe(true)
    expect(lines.find((l) => l.line === 'Main Gate Plaza')?.matches.some((m) => m.id === 'grace:shadow-keep')).toBe(true)
    expect(lines.find((l) => l.line === 'Totally Made Up Place')?.matches).toHaveLength(0)
  })

  it('ignores blank lines', () => {
    expect(matchBulkLines('Church of Elleh\n\n   \nGatefront')).toHaveLength(2)
  })

  it('applies a 10+ line paste as one bulk read with per-line results', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: list, confidence: 0.92 }, 'screenshot:warp-list')
    expect(outcome.status).toBe('applied')
    expect(outcome.lines).toHaveLength(12)
    expect(outcome.lines.filter((l) => l.matches.length === 0)).toHaveLength(2)
    expect(outcome.character.discoveredGraces).toContain('grace:first-step')
    expect(outcome.character.discoveredGraces).toContain('grace:elleh')
    expect(outcome.character.discoveredGraces).toContain('grace:shadow-keep')
    expect(outcome.character.discoveredGraces).toContain('grace:gravesite')
    expect(outcome.character.evidence.every((e) => e.source === 'screenshot' || e.source === 'inference')).toBe(true)
  })
})

describe('applyOcrRead', () => {
  it('applies real screenshot evidence and the inferred boss for a Great Rune read', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: "Godrick's Great Rune", confidence: 0.8 }, 'screenshot:inventory')

    expect(outcome.status).toBe('applied')
    expect(outcome.character.collectedItems).toContain('item:godrick-great-rune')
    expect(outcome.character.defeatedBosses).toContain('boss:godrick')

    const direct = outcome.character.evidence.find((e) => e.fact === 'item:godrick-great-rune')
    expect(direct?.source).toBe('screenshot')
    expect(direct?.confidence).toBe(0.8)
    // boss:godrick is implied by the Great Rune (and also name-matched here); margit is
    // further down the chain, so it must be recorded as inference, not screenshot.
    const implied = outcome.character.evidence.find((e) => e.fact === 'boss:margit')
    expect(implied?.source).toBe('inference')
    expect(implied!.confidence).toBeLessThan(0.8)
    expect(implied!.confidence).toBeGreaterThan(0)
  })

  it('records discovered graces from a warp-list read', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: 'Church of Elleh', confidence: 0.9 }, 'screenshot:warp-list')
    expect(outcome.status).toBe('applied')
    expect(outcome.character.discoveredGraces).toContain('grace:elleh')
    expect(outcome.character.evidence.every((e) => e.source === 'screenshot' || e.source === 'inference')).toBe(true)
  })

  it('does not fabricate facts from a low-confidence read, even with real names', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: "Godrick's Great Rune", confidence: OCR_CONFIDENCE_FLOOR - 0.01 })
    expect(outcome.status).toBe('low-confidence')
    expect(outcome.matches).toHaveLength(0)
    expect(outcome.character).toBe(emptyCharacter)
    expect(outcome.character.evidence).toHaveLength(0)
    expect(outcome.character.collectedItems).toHaveLength(0)
  })

  it('trusts a read exactly at the confidence floor', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: 'Church of Elleh', confidence: OCR_CONFIDENCE_FLOOR })
    expect(outcome.status).toBe('applied')
    expect(outcome.character.discoveredGraces).toContain('grace:elleh')
  })

  it('reports a confident read with no known names without inventing facts', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: 'qzxw vbnm plok', confidence: 0.95 })
    expect(outcome.status).toBe('no-match')
    expect(outcome.matches).toHaveLength(0)
    expect(outcome.character.evidence).toHaveLength(0)
    expect(outcome.character.collectedItems).toHaveLength(0)
  })

  it('treats blank OCR output as empty', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: '   \n  ', confidence: 0.9 })
    expect(outcome.status).toBe('empty')
    expect(outcome.character).toBe(emptyCharacter)
  })

  it('clamps out-of-range confidence', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: 'Church of Elleh', confidence: 5 })
    expect(outcome.confidence).toBe(1)
    expect(outcome.status).toBe('applied')
  })
})

describe('readImageText', () => {
  it('keeps the original string-returning signature for back-compat', () => {
    expect(typeof readImageText).toBe('function')
  })
})
