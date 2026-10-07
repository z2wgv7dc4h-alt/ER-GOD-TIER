import { describe, expect, it } from 'vitest'
import { bossGlance } from './BossFacts'

/**
 * Task 165 §3 — the boss glance line is one data-only sentence: what the boss is
 * weak to and what the equipped armament deals after negation. With no data it is
 * null, never a template sentence.
 */
describe('boss glance line (Task 165 §3)', () => {
  it('joins the weakness and the best weapon', () => {
    expect(bossGlance(['Fire', 'Holy'], { name: 'Uchigatana', effective: 421 })).toBe(
      'Weak to Fire / Holy · Uchigatana does 421',
    )
  })

  it('keeps only the parts the data holds', () => {
    expect(bossGlance([], { name: 'Claymore', effective: 300 })).toBe('Claymore does 300')
    expect(bossGlance(['Bleed'], null)).toBe('Weak to Bleed')
  })

  it('is null with no data', () => {
    expect(bossGlance([], null)).toBeNull()
  })
})
