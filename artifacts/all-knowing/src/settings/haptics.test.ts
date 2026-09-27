import { describe, expect, it, vi } from 'vitest'
import { haptic } from './haptics'

describe('haptics (Task 112 §5)', () => {
  it('does nothing when disabled', () => {
    const vibrate = vi.fn(() => true)
    expect(haptic(15, { settings: { haptics: false }, nav: { vibrate } })).toBe(false)
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('does nothing when the device has no vibrate', () => {
    expect(haptic(15, { settings: { haptics: true }, nav: {} })).toBe(false)
  })

  it('ticks when enabled and supported', () => {
    const vibrate = vi.fn(() => true)
    expect(haptic(15, { settings: { haptics: true }, nav: { vibrate } })).toBe(true)
    expect(vibrate).toHaveBeenCalledWith(15)
  })

  it('swallows a throwing implementation', () => {
    const vibrate = vi.fn(() => { throw new Error('nope') })
    expect(haptic(15, { settings: { haptics: true }, nav: { vibrate } })).toBe(false)
  })
})
