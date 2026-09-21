import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyAnswers, applyFacts, closeWorld, prefixKind } from './infer'

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

  it('treats invader ids as boss-shaped, not items', () => {
    expect(prefixKind('invader:nerijus')).toBe('boss')
    expect(prefixKind('invader:juno-hoslow')).toBe('boss')
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

describe('applyAnswers — DLC / Tarnished Pack starts', () => {
  it('seeds the Shadow region and its access bosses when the run is in the DLC', () => {
    const c = applyAnswers({ ...emptyCharacter, answers: { dlc: 'sote' } })
    // region facts live on collectedItems (region is not a first-class Character list).
    expect(c.collectedItems).toContain('region:shadow')
    expect(c.defeatedBosses).toContain('boss:radahn')
    expect(c.defeatedBosses).toContain('boss:mohg')
  })

  it('honours the explicit “began with the DLC open” start', () => {
    const c = applyAnswers({ ...emptyCharacter, answers: { soteStart: 'yes' } })
    expect(c.collectedItems).toContain('region:shadow')
    expect(c.defeatedBosses).toContain('boss:radahn')
    expect(c.defeatedBosses).toContain('boss:mohg')
  })

  it('does not seed DLC access for a base-game start', () => {
    const c = applyAnswers({ ...emptyCharacter, answers: { dlc: 'limgrave', soteStart: 'no' } })
    expect(c.collectedItems).toContain('region:limgrave')
    expect(c.collectedItems).not.toContain('region:shadow')
    expect(c.defeatedBosses).not.toContain('boss:radahn')
    expect(c.defeatedBosses).not.toContain('boss:mohg')
  })

  it('seeds the Tarnished Pack origin weapon from the pack-start question', () => {
    const heavy = applyAnswers({ ...emptyCharacter, answers: { tarnished: 'heavy-knight' } })
    expect(heavy.collectedItems).toContain('item:hefty-scimitar')
    const idus = applyAnswers({ ...emptyCharacter, answers: { tarnished: 'idus-knight' } })
    expect(idus.collectedItems).toContain('item:idus-sword')
  })

  it('seeds the origin weapon from the class answer as well', () => {
    const heavy = applyAnswers({ ...emptyCharacter, answers: { class: 'heavy-knight' } })
    expect(heavy.startingClass).toBe('heavy-knight')
    expect(heavy.collectedItems).toContain('item:hefty-scimitar')
    const idus = applyAnswers({ ...emptyCharacter, answers: { class: 'idus-knight' } })
    expect(idus.startingClass).toBe('idus-knight')
    expect(idus.collectedItems).toContain('item:idus-sword')
  })

  it('records interview evidence for seeded DLC facts', () => {
    const c = applyAnswers({ ...emptyCharacter, answers: { dlc: 'sote' } })
    const direct = c.evidence.find((e) => e.fact === 'region:shadow')
    expect(direct?.source).toBe('answer')
    expect(direct?.detail).toBe('interview')
    expect(c.evidence.some((e) => e.fact === 'boss:radahn' && e.source === 'answer')).toBe(true)
  })
})
