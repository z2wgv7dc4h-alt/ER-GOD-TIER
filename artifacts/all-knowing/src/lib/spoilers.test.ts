import { afterEach, describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import {
  hideLore,
  isSpoiled,
  reachedRegionsOf,
  regionOf,
  resetRevealed,
  revealSpoiler,
  spoilerKindOf,
} from './spoilers'

const base: Character = { ...emptyCharacter }

describe('spoilers (Task 112 §2)', () => {
  afterEach(() => resetRevealed())

  it('classifies spoiler kinds', () => {
    expect(spoilerKindOf('boss:margit')).toBe('boss')
    expect(spoilerKindOf('quest:ranni:blaidd-fate')).toBe('npc-fate')
    expect(spoilerKindOf('item:uchigatana')).toBe('lore')
    expect(spoilerKindOf('mechanic:poise')).toBeNull()
  })

  it('finds a region for a located fact', () => {
    expect(regionOf('boss:margit')).toBe('Stormveil')
  })

  it('tracks the regions a character has reached', () => {
    const c: Character = { ...base, answers: { lastRegion: 'Liurnia' } }
    expect(reachedRegionsOf(c)).toContain('Liurnia')
  })

  it('full never hides', () => {
    expect(isSpoiled('boss:margit', base, 'full')).toBe(false)
  })

  it('light hides an unreached boss but not an item name', () => {
    expect(isSpoiled('boss:margit', base, 'light')).toBe(true)
    expect(isSpoiled('item:uchigatana', base, 'light')).toBe(false)
  })

  it('a reached region un-hides its boss', () => {
    const c: Character = { ...base, answers: { lastRegion: 'Stormveil' } }
    expect(isSpoiled('boss:margit', c, 'light')).toBe(false)
  })

  it('never hides a fact the character already knows', () => {
    const c: Character = { ...base, defeatedBosses: ['boss:margit'] }
    expect(isSpoiled('boss:margit', c, 'light')).toBe(false)
  })

  it('a tap reveals for the session', () => {
    expect(isSpoiled('boss:margit', base, 'light')).toBe(true)
    revealSpoiler('boss:margit')
    expect(isSpoiled('boss:margit', base, 'light')).toBe(false)
  })

  it('only level none hides lore for unreached content', () => {
    expect(hideLore('boss:margit', base, 'light')).toBe(false)
    expect(hideLore('boss:margit', base, 'none')).toBe(true)
    const reached: Character = { ...base, answers: { lastRegion: 'Stormveil' } }
    expect(hideLore('boss:margit', reached, 'none')).toBe(false)
  })
})
