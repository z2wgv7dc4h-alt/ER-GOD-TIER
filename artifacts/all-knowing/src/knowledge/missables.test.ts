import { describe, expect, it } from 'vitest'
import { missables } from './missables'

/**
 * Task 140 §2 — the missables list is player-facing (Gideon answers and search
 * hits read it directly), so every entry needs a real lock and a real note, and
 * the well-known DLC/base locks the review added must stay present.
 */
describe('missables table', () => {
  it('gives every entry a non-empty lock and note', () => {
    for (const entry of missables) {
      expect(entry.lockedBy.length, entry.id).toBeGreaterThan(0)
      expect(entry.note.length, entry.id).toBeGreaterThan(0)
    }
  })

  it('has unique ids', () => {
    const ids = missables.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers the lockouts the Task 140 review added', () => {
    const ids = missables.map((entry) => entry.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'talisman-magic-scorpion-charm',
        'spirit-ancient-dragon-florissax',
        'item-black-syrup',
      ]),
    )
  })

  it('keeps the Royal Capital / Millicent locks the gate overlay depends on', () => {
    const ids = missables.map((entry) => entry.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'weapon-bolt-of-gransax',
        'whetblade-sanctified-whetblade',
        'key-item-golden-order-principia',
        'key-item-miquella-s-needle',
        'talisman-millicent-s-prosthesis',
      ]),
    )
  })
})
