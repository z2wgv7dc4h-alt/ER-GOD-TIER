import { approachingGates, type Gate, type GateLock } from '../knowledge/gates'
import { loot, type Loot, type LootKind } from '../knowledge/loot'
import type { AtlasWorld } from '../knowledge/graces'
import { canonicalFactId } from './aliases'
import { resolveLeftover } from './leftoverPins'
import type { CoordPin } from './coords'
import type { Character, MapMarker, MarkerKind } from '../types'

/**
 * Binds approaching world-state gates (Task 52) onto the static plate.
 *
 * Positions come from the existing two frames only — a loot row's grace pin, or
 * a name match against `coords.json` (already projected into the plate frame by
 * `useCoords`). No third projection is introduced; a lock with no pin is left
 * for the Atlas side panel instead of being given an invented lat/lng.
 */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
const WORLDS: AtlasWorld[] = ['overworld', 'underground', 'ashen', 'shadow']

function worldOf(value: string): AtlasWorld {
  return (WORLDS as string[]).includes(value) ? (value as AtlasWorld) : 'overworld'
}

function markerKind(kind?: LootKind): MarkerKind {
  return kind === 'spirit' ? 'spirit-ash' : 'item'
}

function lootFor(lock: GateLock): Loot | undefined {
  const id = canonicalFactId(lock.factId)
  return loot.find((l) => l.id === lock.factId || l.id === id || norm(l.name) === norm(lock.name))
}

export type GateResolved = { x: number; y: number; world: AtlasWorld; loot?: Loot }

export function resolveGateLock(lock: GateLock, coords: CoordPin[]): GateResolved | null {
  const l = lootFor(lock)
  if (l) {
    const pos = resolveLeftover(l, coords)
    if (pos) return { ...pos, loot: l }
  }
  const n = norm(lock.name)
  if (n.length < 3) return null
  const exact = coords.find((c) => norm(c.name) === n)
  if (exact) return { x: exact.x, y: exact.y, world: worldOf(exact.world) }
  const partial = coords.find((c) => {
    const cn = norm(c.name)
    if (Math.min(n.length, cn.length) < 5) return false
    return cn.includes(n) || n.includes(cn)
  })
  if (partial) return { x: partial.x, y: partial.y, world: worldOf(partial.world) }
  return null
}

export type GatePinOptions = {
  /** Keep only pins on this Atlas plate. */
  world?: AtlasWorld
}

/** The "locks if you continue" layer: locks of gates one beat away. */
export function gatePins(
  character: Character,
  coords: CoordPin[],
  opts: GatePinOptions = {},
): MapMarker[] {
  const out: MapMarker[] = []
  const seen = new Set<string>()
  for (const gate of approachingGates(character)) {
    for (const lock of gate.locks) {
      if (seen.has(lock.factId)) continue
      const pos = resolveGateLock(lock, coords)
      if (!pos) continue
      if (opts.world && pos.world !== opts.world) continue
      seen.add(lock.factId)
      out.push({
        id: lock.factId,
        name: lock.name,
        kind: markerKind(pos.loot?.kind),
        region: pos.loot?.region || gate.name,
        campaign: pos.world === 'shadow' ? 'sote' : 'base',
        x: pos.x,
        y: pos.y,
        note: lock.why,
        gate: true,
      })
    }
  }
  return out
}

/** Approaching locks with no existing pin, for the Atlas side panel. */
export function unresolvedGateLocks(
  character: Character,
  coords: CoordPin[],
): { gate: Gate; lock: GateLock }[] {
  const out: { gate: Gate; lock: GateLock }[] = []
  for (const gate of approachingGates(character)) {
    for (const lock of gate.locks) {
      if (!resolveGateLock(lock, coords)) out.push({ gate, lock })
    }
  }
  return out
}

/** Gates one beat away, for the side-panel summary. */
export function approachingGateList(character: Character): Gate[] {
  return approachingGates(character)
}
