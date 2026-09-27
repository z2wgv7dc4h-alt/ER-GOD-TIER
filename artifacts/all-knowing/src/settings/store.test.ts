import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings,
  sanitizeSettings,
  setSettings,
  subscribeSettings,
} from './store'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) },
    removeItem: (key: string) => { map.delete(key) },
    clear: () => map.clear(),
  }
}

describe('settings store (Task 112 §1)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage())
    resetSettings()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('serves the defaults on a cold load', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('sanitises junk rather than throwing', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    const fixed = sanitizeSettings({
      textSize: 'Z',
      spoiler: 'wat',
      landing: 'nope',
      reduceMotion: 'yes',
      haptics: 3,
    })
    expect(fixed).toEqual(DEFAULT_SETTINGS)
  })

  it('accepts valid values', () => {
    expect(
      sanitizeSettings({ textSize: 'L', spoiler: 'full', landing: 'me', reduceMotion: true, haptics: false }),
    ).toEqual({ textSize: 'L', spoiler: 'full', landing: 'me', reduceMotion: true, haptics: false })
  })

  it('persists a patch and notifies subscribers', () => {
    const cb = vi.fn()
    const unsubscribe = subscribeSettings(cb)
    setSettings({ textSize: 'L', haptics: false })
    expect(getSettings().textSize).toBe('L')
    expect(getSettings().haptics).toBe(false)
    expect(cb).toHaveBeenCalledTimes(1)
    unsubscribe()
    setSettings({ textSize: 'S' })
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('reloads what it persisted', () => {
    setSettings({ spoiler: 'none' })
    resetSettings()
    expect(getSettings().spoiler).toBe('none')
  })
})
