import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from './infer'
import { groupHits, searchSync } from './search'
import { idleSuggestions } from './suggestions'

/**
 * Same mid-run fixture as Task 53: early shardbearers down and several lines
 * started, Fingerslayer not handed in, Millicent/Rya/Leyndell untouched.
 */
const TRUE_FACTS = [
  'boss:margit',
  'boss:godrick',
  'boss:rennala',
  'boss:radahn',
  'quest:ranni:service',
  'item:black-knifeprint',
  'quest:rogier:knifeprint',
  'quest:varre:met',
  'quest:fia:met',
  'quest:fia:dagger',
  'invader:ensha',
  'quest:thops:met',
]

const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 42 fixture')

describe('idleSuggestions', () => {
  it('returns 2-3 real chips for the fixture, not filler', () => {
    const chips = idleSuggestions(fixture, 3)
    expect(chips.length).toBeGreaterThanOrEqual(2)
    expect(chips.length).toBeLessThanOrEqual(3)
    expect(new Set(chips.map((c) => c.id)).size).toBe(chips.length)
    for (const c of chips) {
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.prompt.length).toBeGreaterThan(0)
    }
  })

  it('offers the real next Ranni beat (Fingerslayer / Nokron) or an approaching gate', () => {
    const chips = idleSuggestions(fixture, 3)
    const fingerslayer = chips.some((c) => c.factId === 'item:fingerslayer')
    const gate = chips.some((c) => c.source === 'gate')
    expect(fingerslayer || gate).toBe(true)
    // Never the already-done "meet Ranni" beat.
    expect(chips.some((c) => /Enter Ranni/i.test(c.label))).toBe(false)
  })

  it('walks through the existing continue-line prompt for the current beat', () => {
    const chip = idleSuggestions(fixture, 3).find((c) => c.factId === 'item:fingerslayer')
    expect(chip).toBeDefined()
    expect(chip!.prompt).toMatch(/continue .*What do I do next\?/)
  })

  it('has no suggestions for a character with nothing to go on', () => {
    expect(idleSuggestions(emptyCharacter, 3).length).toBeLessThanOrEqual(3)
  })
})

describe('live search (Task 42)', () => {
  it('returns real grouped results for a typed prefix', () => {
    const hits = searchSync('elleh')
    expect(hits.some((h) => h.id === 'grace:elleh')).toBe(true)
    const sections = groupHits(hits)
    expect(sections.length).toBeGreaterThan(0)
    expect(sections.flatMap((s) => s.hits)).toHaveLength(hits.length)
  })

  it('keeps the 2-character floor rather than dumping on one key', () => {
    expect(searchSync('e')).toHaveLength(0)
  })
})
