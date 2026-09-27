import { describe, expect, it } from 'vitest'
import { autolink, glossaryIndex, type GlossaryIndex } from './glossary'

function links(text: string) {
  return autolink(text).filter((s) => s.id)
}

describe('glossary autolink (Task 106)', () => {
  it('links a known entity name case-insensitively', () => {
    const segs = links('margit waits on the bridge')
    expect(segs).toHaveLength(1)
    expect(segs[0].id).toBe('boss:margit')
  })

  it('links the longest phrase, not the short alias', () => {
    const segs = links('Margit, the Fell Omen strikes')
    expect(segs).toHaveLength(1)
    expect(segs[0].id).toBe('boss:margit')
    expect(segs[0].text).toBe('Margit, the Fell Omen')
  })

  it('keeps the per-term link to one per paragraph', () => {
    expect(links('Margit falls. Then Margit rises.')).toHaveLength(1)
    expect(links('Margit falls.\n\nMargit rises.')).toHaveLength(2)
  })

  it('links authored mechanic terms to their card', () => {
    const segs = links('Poise decides whether you get staggered')
    expect(segs).toHaveLength(1)
    expect(segs[0].id).toBe('mechanic:poise')
    expect(segs[0].kind).toBe('mechanic')
  })

  it('does not match a term inside a longer word (word boundary)', () => {
    const index: GlossaryIndex = new Map([
      ['rune', { key: 'rune', id: 'mechanic:great-runes', label: 'Rune', kind: 'mechanic' }],
    ])
    expect(autolink('runes of the fallen', { index }).some((s) => s.id)).toBe(false)
    expect(autolink('a rune of power', { index }).some((s) => s.id)).toBe(true)
  })

  it('handles overlap without double-linking the same words', () => {
    const index: GlossaryIndex = new Map([
      ['rune arc', { key: 'rune arc', id: 'mechanic:rune-arc', label: 'Rune Arc', kind: 'mechanic' }],
      ['rune', { key: 'rune', id: 'mechanic:great-runes', label: 'Rune', kind: 'mechanic' }],
    ])
    const segs = autolink('Use a rune arc', { index }).filter((s) => s.id)
    expect(segs).toHaveLength(1)
    expect(segs[0].id).toBe('mechanic:rune-arc')
    expect(segs[0].text).toBe('rune arc')
  })

  it('returns plain text unchanged when nothing matches', () => {
    const text = 'The weather is pleasant today.'
    const segs = autolink(text)
    expect(segs.some((s) => s.id)).toBe(false)
    expect(segs.map((s) => s.text).join('')).toBe(text)
  })

  it('reassembles the original text exactly', () => {
    const text = 'Margit, the Fell Omen guards Stormveil.\n\nPoise is not parry.\n\nRune Arc time.'
    const segs = autolink(text)
    expect(segs.map((s) => s.text).join('')).toBe(text)
    expect(segs.some((s) => s.id === 'boss:margit')).toBe(true)
    expect(segs.some((s) => s.id === 'mechanic:poise')).toBe(true)
  })

  it('exposes a non-empty shared index', () => {
    const index = glossaryIndex()
    expect(index.size).toBeGreaterThan(100)
    expect(index.get('margit')?.id).toBe('boss:margit')
    expect(index.get('poise')?.id).toBe('mechanic:poise')
  })
})
