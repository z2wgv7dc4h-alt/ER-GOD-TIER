import { describe, expect, it } from 'vitest'
import { ENGINE_MASTER, engineFocusMessage } from './engineFocus'

const MOSAIC = 10496

describe('engineFocusMessage (Task 158)', () => {
  it('sends an overworld target in the engine frame (master pixels)', () => {
    expect(
      engineFocusMessage({
        at: 7,
        id: 'grace:first-step',
        name: 'The First Step',
        kind: 'grace',
        layer: 'overworld',
        center: { x: 35.05, y: 70.05 },
      }),
    ).toEqual({
      at: 7,
      id: 'grace:first-step',
      name: 'The First Step',
      kind: 'grace',
      master: 'M00',
      px: (35.05 / 100) * MOSAIC,
      py: (70.05 / 100) * MOSAIC,
    })
  })

  it('maps the underground to M01 and keeps the engine frame', () => {
    const msg = engineFocusMessage({
      at: 1,
      id: 'grace:siofra',
      name: 'Siofra River Bank',
      kind: 'grace',
      layer: 'underground',
      center: { x: 40, y: 60 },
    })
    expect(msg.master).toBe('M01')
    expect(msg.px).toBeCloseTo((40 / 100) * MOSAIC)
  })

  it('sends a DLC/boss shadow target by name, not the stand-in plate frame', () => {
    const msg = engineFocusMessage({
      at: 2,
      id: 'boss:margit',
      name: 'Margit, the Fell Omen',
      kind: 'boss',
      layer: 'shadow',
      center: { x: 72, y: 48 },
    })
    expect(msg.master).toBe('M10')
    // Shadow pins come from a 1168x784 stand-in; percent is not the engine frame.
    expect(msg.px).toBeUndefined()
    expect(msg.py).toBeUndefined()
  })

  it('has no engine master for the Ashen stand-in plate', () => {
    expect(ENGINE_MASTER.ashen).toBeUndefined()
    const msg = engineFocusMessage({
      at: 3,
      id: 'grace:ashen-east',
      name: 'Leyndell, Capital of Ash',
      layer: 'ashen',
      center: { x: 50, y: 50 },
    })
    expect(msg.master).toBeUndefined()
    expect(msg.px).toBeUndefined()
  })
})
