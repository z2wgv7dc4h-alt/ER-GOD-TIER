import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Evidence, EvidenceClaim, EvidenceSource } from '../types'
import { claimOf, resolveClaim, resolveConflict, sourceRank } from './conflict'
import { applyFacts, denyFacts } from './infer'

function mk(fact: string, source: EvidenceSource, at: number, claim: EvidenceClaim = 'true'): Evidence {
  return { id: `${source}:${fact}:${at}`, fact, source, confidence: 0.9, claim, at }
}

describe('sourceRank', () => {
  it('orders save > screenshot > answer > inference', () => {
    expect(sourceRank('save')).toBeGreaterThan(sourceRank('screenshot'))
    expect(sourceRank('screenshot')).toBeGreaterThan(sourceRank('answer'))
    expect(sourceRank('answer')).toBeGreaterThan(sourceRank('inference'))
  })

  it('gives an untrusted save no authority', () => {
    expect(sourceRank('save', false)).toBe(0)
    expect(sourceRank('save', true)).toBeGreaterThan(sourceRank('inference'))
  })
})

// Winner table, SCOPE item #5. Each row builds two conflicting Evidence entries
// for its scenario and asserts both the winner and the preserved loser.
describe('conflict winner table', () => {
  it('row 1 — save flag wins when the PC parser is trusted', () => {
    const inference = mk('boss:margit', 'inference', 5_000)
    const save = mk('boss:margit', 'save', 1_000)
    const { winner, loser } = resolveConflict(inference, save, { trustedSave: true })
    expect(winner.source).toBe('save')
    expect(loser.source).toBe('inference')
    expect(claimOf(winner)).toBe('true')
  })

  it('row 1 — an untrusted save does not win', () => {
    const save = mk('boss:margit', 'save', 5_000)
    const answer = mk('boss:margit', 'answer', 1_000)
    const { winner } = resolveConflict(save, answer, { trustedSave: false })
    expect(winner.source).toBe('answer')
  })

  it('row 2 — a later screenshot wins when there is no save (PS5)', () => {
    const earlier = mk('grace:elleh', 'screenshot', 1_000)
    const later = mk('grace:elleh', 'screenshot', 2_000)
    const { winner, loser } = resolveConflict(earlier, later)
    expect(winner).toBe(later)
    expect(loser).toBe(earlier)

    // …and a screenshot outranks a typed answer on the same matching name.
    const answer = mk('grace:elleh', 'answer', 9_000)
    expect(resolveConflict(answer, earlier).winner.source).toBe('screenshot')
  })

  it('row 3 — an explicit answer overrides inference', () => {
    const inference = mk('boss:malenia', 'inference', 9_000)
    const answer = mk('boss:malenia', 'answer', 1_000)
    const { winner, loser } = resolveConflict(inference, answer)
    expect(winner.source).toBe('answer')
    expect(loser.source).toBe('inference')
  })

  it('row 4 — inference never beats a direct source', () => {
    const inference = mk('boss:godrick', 'inference', 9_000)
    for (const source of ['save', 'screenshot', 'answer'] as EvidenceSource[]) {
      const direct = mk('boss:godrick', source, 1_000)
      expect(resolveConflict(inference, direct).winner.source).toBe(source)
    }
  })
})

describe('resolveClaim', () => {
  it('is unknown with no evidence', () => {
    expect(resolveClaim([], 'boss:margit').state).toBe('unknown')
  })

  it('reads a false claim as false, keeping the winner and losers', () => {
    const yes = mk('boss:margit', 'inference', 5_000)
    const no = mk('boss:margit', 'answer', 1_000, 'false')
    const { state, winner, losers } = resolveClaim([yes, no], 'boss:margit')
    expect(state).toBe('false')
    expect(winner).toBe(no)
    expect(losers).toContain(yes)
  })

  it('treats an untrusted save as unknown', () => {
    const save = mk('boss:margit', 'save', 1_000)
    expect(resolveClaim([save], 'boss:margit', { trustedSave: false }).state).toBe('unknown')
  })
})

// Integration: the real apply/deny code path must keep the losing entry.
describe('applyFacts / denyFacts preserve the loser', () => {
  it('save flag overrides an explicit answer, both entries kept (row 1)', () => {
    let c = denyFacts(emptyCharacter, ['boss:margit'], 'player said no')
    expect(c.deniedFacts).toContain('boss:margit')

    c = applyFacts(c, ['boss:margit'], 'save', 'ER0000.sl2', { trustedSave: true })
    expect(c.defeatedBosses).toContain('boss:margit')
    expect(c.deniedFacts).not.toContain('boss:margit')
    expect(c.evidence.some((e) => e.fact === 'boss:margit' && e.claim === 'false')).toBe(true)
    expect(c.evidence.some((e) => e.fact === 'boss:margit' && e.source === 'save')).toBe(true)
  })

  it('a screenshot beats an earlier typed “no”, both entries kept (row 2)', () => {
    let c = denyFacts(emptyCharacter, ['grace:elleh'], 'typed no')
    c = applyFacts(c, ['grace:elleh'], 'screenshot', 'warp-list shot')
    expect(c.discoveredGraces).toContain('grace:elleh')
    expect(c.deniedFacts).not.toContain('grace:elleh')
    expect(c.evidence.some((e) => e.fact === 'grace:elleh' && e.source === 'screenshot')).toBe(true)
    expect(c.evidence.some((e) => e.fact === 'grace:elleh' && e.claim === 'false')).toBe(true)
  })

  it('an explicit answer overrides inference, both entries kept (row 3)', () => {
    let c = applyFacts(emptyCharacter, ['item:malenia-great-rune'], 'answer', 'interview')
    expect(c.evidence.some((e) => e.fact === 'boss:malenia' && e.source === 'inference')).toBe(true)

    c = denyFacts(c, ['boss:malenia'], 'photographed absence')
    expect(c.deniedFacts).toContain('boss:malenia')
    expect(c.defeatedBosses).not.toContain('boss:malenia')
    expect(c.evidence.some((e) => e.fact === 'boss:malenia' && e.source === 'inference')).toBe(true)
    expect(c.evidence.some((e) => e.fact === 'boss:malenia' && e.claim === 'false')).toBe(true)
  })

  it('inference does not resurrect a directly denied fact (row 4)', () => {
    let c = denyFacts(emptyCharacter, ['boss:malenia'], 'photographed absence')
    c = applyFacts(c, ['item:malenia-great-rune'], 'answer', 'interview')
    expect(c.deniedFacts).toContain('boss:malenia')
    expect(c.defeatedBosses).not.toContain('boss:malenia')
    // The inference still landed on evidence[] — recorded, not winning.
    expect(c.evidence.some((e) => e.fact === 'boss:malenia' && e.source === 'inference')).toBe(true)
  })

  it('an untrusted save leaves a denied fact denied', () => {
    let c = denyFacts(emptyCharacter, ['boss:margit'], 'player said no')
    c = applyFacts(c, ['boss:margit'], 'save', 'corrupt.sl2', { trustedSave: false })
    expect(c.deniedFacts).toContain('boss:margit')
    expect(c.defeatedBosses).not.toContain('boss:margit')
    expect(c.evidence.some((e) => e.fact === 'boss:margit' && e.source === 'save')).toBe(true)
  })
})
