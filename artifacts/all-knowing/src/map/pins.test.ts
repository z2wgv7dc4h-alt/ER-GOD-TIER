import { describe, expect, it } from 'vitest'
import { resolveEntityPin } from './pins'

describe('resolveEntityPin (Task 111 §1)', () => {
  it('grounds an authored warp grace and keeps its world', () => {
    const pin = resolveEntityPin('grace:first-step')
    expect(pin?.world).toBe('overworld')
    expect(pin?.marker.id).toBe('grace:first-step')
    expect(pin?.marker.x).toBeCloseTo(35.05)
    expect(pin?.marker.y).toBeCloseTo(70.05)
  })

  it('grounds a loot row through its authored grace', () => {
    const pin = resolveEntityPin('loot:night-comet')
    expect(pin?.world).toBe('overworld')
    expect(pin?.marker.id).toBe('loot:night-comet')
    expect(pin?.marker.kind).toBe('item')
  })

  it('grounds an unknown id by a partial coords name match', () => {
    const pin = resolveEntityPin('loot:made-up', [
      { id: 'x', name: 'Made Up', kind: 'boss', world: 'shadow', x: 12, y: 34 },
    ])
    expect(pin?.world).toBe('shadow')
    expect(pin?.marker.x).toBe(12)
  })

  it('grounds a catalogue fact by its display name', () => {
    const pin = resolveEntityPin('boss:margit', [
      { id: 'boss:margit', name: 'Margit, the Fell Omen', kind: 'boss', world: 'overworld', x: 24, y: 58 },
    ])
    expect(pin?.world).toBe('overworld')
    expect(pin?.marker.kind).toBe('boss')
    expect(pin?.marker.x).toBe(24)
  })

  it('returns null for an empty or unknown id', () => {
    expect(resolveEntityPin('')).toBeNull()
    expect(resolveEntityPin('nonsense:thing')).toBeNull()
  })
})
