import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyFacts, closeWorld, prefixKind } from './infer'

describe('prefixKind', () => {
  it('maps grace dialects to grace', () => {
    expect(prefixKind('grace:elleh')).toBe('grace')
    expect(prefixKind('point:100008')).toBe('grace')
  })

  it('maps boss dialects to boss', () => {
    expect(prefixKind('boss:godrick')).toBe('boss')
    expect(prefixKind('hunt:agheel')).toBe('boss')
    expect(prefixKind('bossflag:530100')).toBe('boss')
    expect(prefixKind('area:130')).toBe('boss')
  })

  it('maps quest dialects to quest', () => {
    expect(prefixKind('quest:ranni:nokron')).toBe('quest')
    expect(prefixKind('line:blitz-lord')).toBe('quest')
  })

  it('defaults everything else to item', () => {
    expect(prefixKind('item:fingerslayer')).toBe('item')
    expect(prefixKind('loot:rivers')).toBe('item')
    expect(prefixKind('shop:100056')).toBe('item')
    expect(prefixKind('frag:scadutree')).toBe('item')
  })
})

describe('closeWorld', () => {
  it('resolves a multi-hop implication chain', () => {
    const closed = closeWorld(['item:malenia-great-rune'])
    expect(closed).toContain('item:malenia-great-rune')
    expect(closed).toContain('boss:malenia')
    expect(closed).toContain('grace:drainage')
    expect(closed).toContain('region:haligtree')
    expect(closed).toContain('item:haligtree-secret-medallion')
  })
})

describe('applyFacts', () => {
  it('records inference-sourced evidence for implied facts', () => {
    const next = applyFacts(emptyCharacter, ['item:malenia-great-rune'], 'answer', 'test seed')
    const direct = next.evidence.find((e) => e.fact === 'item:malenia-great-rune')
    const implied = next.evidence.find((e) => e.fact === 'boss:malenia')

    expect(direct?.source).toBe('answer')
    expect(direct?.confidence).toBe(0.94)
    expect(implied?.source).toBe('inference')
    expect(implied?.confidence).toBe(0.72)
    expect(implied?.detail).toBe('implied by test seed')
    expect(typeof implied?.at).toBe('number')
  })

  it('stores implied facts on the list for their kind', () => {
    const next = applyFacts(emptyCharacter, ['item:malenia-great-rune'], 'answer', 'test seed')
    expect(next.defeatedBosses).toContain('boss:malenia')
    expect(next.discoveredGraces).toContain('grace:drainage')
    expect(next.collectedItems).toContain('item:haligtree-secret-medallion')
  })
})
