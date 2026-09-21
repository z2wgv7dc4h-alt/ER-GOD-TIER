/**
 * Parse a PC `.sl2` buffer and reduce it to the lean result the app needs.
 * Runs in the save worker (or directly, as a fallback).
 */
import type { StartingClass, Stats } from '../../types'
import { parseSave } from './parse'
import { saveFacts } from './facts'

export type SaveResult = {
  /** Zero-based slot index that was read (the UI shows slot + 1). */
  slot: number
  slotCount: number
  characterName: string
  level: number
  stats: Stats
  startingClass: StartingClass
  secondsPlayed: number
  runes: number
  deaths: number
  /** True when the Shadow of the Erdtree DLC entry flag is set. */
  dlc: boolean
  /** Canonical fact ids read from the event-flag bitfield. */
  facts: string[]
  /** Evidence receipt text. */
  detail: string
}

/** Starting class ids, matching the game's archetype byte. */
const CLASS_BY_ARCHETYPE: Record<number, StartingClass> = {
  0: 'vagabond',
  1: 'warrior',
  2: 'hero',
  3: 'bandit',
  4: 'astrologer',
  5: 'prophet',
  6: 'confessor',
  7: 'samurai',
  8: 'prisoner',
  9: 'wretch',
}

/**
 * Slot choice mirrors the live engine path (`shownEngineCharacter`): a requested slot
 * wins, otherwise the first populated slot is used. `.sl2` files hold up to 10 slots;
 * v1 does not build a slot picker, it reads the first populated one by default.
 */
export function analyzeSave(buffer: ArrayBuffer, slotIndex?: number): SaveResult {
  const parsed = parseSave(buffer)
  if (parsed.slots.length === 0) {
    throw new Error('That save has no characters in it.')
  }
  const slot =
    (slotIndex === undefined ? undefined : parsed.slots.find((s) => s.index === slotIndex)) ??
    parsed.slots[0]

  const { facts, detail } = saveFacts(slot)
  return {
    slot: slot.index,
    slotCount: parsed.slots.length,
    characterName: slot.characterName,
    level: slot.level,
    stats: slot.stats,
    startingClass: CLASS_BY_ARCHETYPE[slot.archetype] ?? 'unknown',
    secondsPlayed: slot.secondsPlayed,
    runes: slot.runes,
    deaths: slot.deaths,
    dlc: slot.dlc.shadowOfErdtree,
    facts,
    detail,
  }
}
