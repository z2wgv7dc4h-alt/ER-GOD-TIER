import { describe, expect, it } from 'vitest'
import type { EngineState } from '../lib/mapEngine'
import { focusViewBox, followFocus, graceFocus, liveFocus } from './follow'

describe('follow mode (Task 111 §3)', () => {
  it('centres on an authored grace', () => {
    expect(graceFocus('grace:first-step')).toMatchObject({ world: 'overworld', x: 35.05, y: 70.05 })
    expect(graceFocus(null)).toBeNull()
  })

  it('reads the live player pixel from the engine state', () => {
    const engine = {
      characters: [{ slot: 0, mapPixel: { px: 5248, py: 5248, master: 'M00' } }],
      activeSlot: 0,
    } as unknown as EngineState
    expect(liveFocus(engine)).toMatchObject({ x: 50, y: 50, world: 'overworld' })
    expect(liveFocus(null)).toBeNull()
  })

  it('prefers the live dot over the current area', () => {
    const engine = {
      characters: [{ slot: 0, mapPixel: { px: 1049.6, py: 2099.2, master: 'M10' } }],
      activeSlot: 0,
    } as unknown as EngineState
    const focus = followFocus({ currentArea: { region: 'Limgrave', factId: 'grace:first-step', source: 'grace', at: 1 }, engine })
    expect(focus?.world).toBe('shadow')
    expect(focus?.x).toBeCloseTo(10)
  })

  it('falls back to the current area grace', () => {
    const focus = followFocus({ currentArea: { region: 'Limgrave', factId: 'grace:first-step', source: 'grace', at: 1 } })
    expect(focus?.world).toBe('overworld')
  })

  it('builds a clamped, centred viewBox', () => {
    expect(focusViewBox({ x: 50, y: 50, world: 'overworld' }, 100, 80, 2)).toBe('25 20 50 40')
    expect(focusViewBox({ x: 0, y: 0, world: 'overworld' }, 100, 80, 2)).toBe('0 0 50 40')
  })
})
