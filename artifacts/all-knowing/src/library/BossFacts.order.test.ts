import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 165 §2 — the boss body has one fixed order (where → weaknesses →
 * strategy → drops) and keeps a single combat-profile source. This guards the
 * ordering at the source level because the body is lazy and data-driven.
 */
const src = readFileSync(new URL('./BossFacts.tsx', import.meta.url), 'utf8')

const order = ['>Where to reach it<', '>Weak to / Resists<', 'Strategy ·', '>Drops<']

describe('BossFacts order and dedupe (Task 165 §2)', () => {
  it('renders the blocks in the §3 order', () => {
    const positions = order.map((label) => src.indexOf(label))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('picks one combat profile source with a ternary, not two blocks', () => {
    expect(src).toContain('Combat profile · NpcParam')
    expect(src).toContain('Combat profile · enriched')
    expect(src).toMatch(/combat \? \(\s*<div className="lib-panel-block">/)
  })

  it('links resolvable drops to their entity page', () => {
    expect(src).toContain('resolveEntityId(d)')
    expect(src).toContain('<EntityLink key={d} id={id}')
  })
})
