/**
 * Turn a parsed save slot's raw event-flag bitfield into All-Knowing fact ids.
 *
 * The save stores event flags as one packed bitfield. A flag id maps to a (byte, bit)
 * via the reverse-engineered block table (ER-Save-Lib `eventflag_bst`): `block = id / 1000`,
 * `index = id % 1000`, `byte = multiplier * 125 + index / 8`, `bit = 7 - (index % 8)`.
 * We only read flags we already have facts for (boss defeat flags, field-hunt flags, and
 * grace-discovery flags), then run them through `canonicalFactId` so the save's id dialect
 * becomes the seed catalog's `kind:slug` where a name match exists.
 */
import bstJson from '../../data/event-flag-bst.json'
import bossRowsJson from '../../data/hosted-bosses.json'
import graceFlagsJson from '../../data/grace-flags.json'
import huntFlagsJson from '../../data/hunt-flags.json'
import { canonicalFactId } from '../aliases'
import type { ParsedSlot } from './parse'

const BST = new Map<number, number>(bstJson as [number, number][])
const graceFlags = graceFlagsJson as Record<string, number>
const huntFlags = huntFlagsJson as { id: string; name: string; flag: number }[]
const bossKillFlags = (bossRowsJson as { name: string; kill: number }[])
  .filter((b) => typeof b.kill === 'number' && b.kill > 0)

/** (byte, bit) of an event flag inside the slot bitfield, or null for an unknown block. */
export function eventFlagOffset(id: number): [number, number] | null {
  const mult = BST.get(Math.floor(id / 1000))
  if (mult === undefined) return null
  const index = id % 1000
  return [mult * 125 + Math.floor(index / 8), 7 - (index % 8)]
}

function isFlagOn(flags: Uint8Array, id: number): boolean {
  const off = eventFlagOffset(id)
  if (!off) return false
  const byte = flags[off[0]]
  if (byte === undefined) return false
  return (byte & (1 << off[1])) !== 0
}

export type SaveFacts = {
  /** Canonical fact ids implied by the save (bosses, graces). */
  facts: string[]
  /** Human-readable counts for the evidence receipt. */
  detail: string
}

/** Read the flags we know how to name and return the corresponding facts. */
export function saveFacts(slot: ParsedSlot): SaveFacts {
  const flags = slot.eventFlags
  const found = new Set<string>()

  let bosses = 0
  for (const b of bossKillFlags) {
    if (isFlagOn(flags, b.kill)) {
      found.add(canonicalFactId(`bossflag:${b.kill}`))
      bosses++
    }
  }

  let hunts = 0
  for (const h of huntFlags) {
    if (isFlagOn(flags, h.flag)) {
      found.add(canonicalFactId(h.id))
      hunts++
    }
  }

  let graces = 0
  for (const [graceId, flag] of Object.entries(graceFlags)) {
    if (isFlagOn(flags, flag)) {
      found.add(canonicalFactId(graceId))
      graces++
    }
  }

  // The last rested grace is a BonfireWarpParam row id; map it like any other grace.
  if (slot.lastRestedGrace > 0) {
    found.add(canonicalFactId(`grace:${slot.lastRestedGrace}`))
  }

  return {
    facts: [...found],
    detail: `save slot ${slot.index + 1} · ${bosses} boss flags · ${hunts} hunt flags · ${graces} graces · ${slot.regions.length} regions`,
  }
}
