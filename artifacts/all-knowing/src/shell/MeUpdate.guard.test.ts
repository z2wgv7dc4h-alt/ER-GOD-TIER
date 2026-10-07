import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hashToLocation } from '../lib/sections'

/**
 * Task 165 §1 — the orphaned `MeUpdate` page is gone; `#/me/update` is only an
 * alias that resolves to the real Setup wizard, and `SaveDrop` survives with it.
 */
describe('MeUpdate retirement (Task 165 §1)', () => {
  it('no longer ships a MeUpdate page or references one', () => {
    expect(existsSync(new URL('./MeUpdate.tsx', import.meta.url))).toBe(false)
    expect(readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')).not.toContain('MeUpdate')
  })

  it('keeps the SaveDrop component in its own module', () => {
    expect(existsSync(new URL('./SaveDrop.tsx', import.meta.url))).toBe(true)
    expect(existsSync(new URL('./MeUpdate.tsx', import.meta.url))).toBe(false)
  })

  it('resolves #/me/update to the Setup wizard', () => {
    expect(hashToLocation('#/me/update')).toEqual({ section: 'me', sub: 'setup' })
  })
})
