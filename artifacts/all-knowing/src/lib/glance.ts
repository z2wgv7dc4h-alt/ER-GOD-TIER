import type { AreaSignal } from './areaContext'
import type { CoordPin } from './coords'
import { leftoverPins } from './leftoverPins'
import type { Character } from '../types'

/**
 * Task 100 §2 — Glance mode (Usage model moment 15).
 *
 * The strip needs exactly two facts — where the current goal is and the nearest
 * thing still unfinished — so it reuses `leftoverPins` (the same Atlas layer)
 * rather than walking any graph of its own. The wake lock is guarded: browsers
 * without the API, or a rejected request, simply get no lock.
 */

export type GlanceNearest = { id: string; name: string }

/** The nearest unfinished row from the Atlas leftover layer, scoped to the current area. */
export function glanceNearest(
  character: Character,
  coords: CoordPin[],
  area?: AreaSignal | null,
): GlanceNearest | null {
  const pins = leftoverPins(character, coords, area ? { region: area.region } : {})
  const first = pins[0]
  return first ? { id: first.id, name: first.name } : null
}

export type WakeLockLike = { release: () => Promise<void> }

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> }
}

/** Acquire the screen wake lock, or null when unavailable/denied. Never throws. */
export async function acquireWakeLock(): Promise<WakeLockLike | null> {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as NavigatorWithWakeLock
  if (!nav.wakeLock?.request) return null
  try {
    return await nav.wakeLock.request('screen')
  } catch {
    return null
  }
}

/** Release a previously acquired lock, swallowing a release of an already-gone lock. */
export async function releaseWakeLock(lock: WakeLockLike | null): Promise<void> {
  if (!lock) return
  try {
    await lock.release()
  } catch {
    /* already released */
  }
}
