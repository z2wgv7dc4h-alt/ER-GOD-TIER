import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { goodsLineId, ingestGoodsList } from './goods'

describe('Task 89 goods paste', () => {
  it('marks "Fingerslayer Blade" as item:fingerslayer', () => {
    const res = ingestGoodsList(emptyCharacter, 'Fingerslayer Blade')
    expect(res.marked.map((m) => m.id)).toEqual(['item:fingerslayer'])
    expect(res.unknown).toEqual([])
    expect(res.character.collectedItems).toContain('item:fingerslayer')
  })

  it('leaves "asdf" unknown and the character untouched', () => {
    const res = ingestGoodsList(emptyCharacter, 'asdf')
    expect(goodsLineId('asdf')).toBeNull()
    expect(res.marked).toEqual([])
    expect(res.unknown.map((u) => u.line)).toEqual(['asdf'])
    expect(res.character).toBe(emptyCharacter)
  })

  it('marks the confident lines in a mixed list and never invents ids', () => {
    const res = ingestGoodsList(emptyCharacter, 'Fingerslayer Blade\nasdf\nRivers of Blood')
    expect(res.marked.map((m) => m.id)).toEqual(['item:fingerslayer', 'loot:rivers'])
    expect(res.unknown.map((u) => u.line)).toEqual(['asdf'])
    // The direct writes are exactly the two matches; anything else is grounded
    // inference through applyFacts, never an id we invented here.
    expect(res.character.collectedItems).toContain('item:fingerslayer')
    expect(res.character.collectedItems).toContain('loot:rivers')
  })
})
