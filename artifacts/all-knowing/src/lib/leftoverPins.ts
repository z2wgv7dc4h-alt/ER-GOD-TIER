import { loot, type Loot, type LootKind } from '../knowledge/loot'
import { warpGraces, type AtlasWorld } from '../knowledge/graces'
import type { CoordPin } from './coords'
import { leftovers, watchlistOf } from './leftovers'
import type { Character, MapMarker, MarkerKind } from '../types'

/**
 * Binds the leftovers/watchlist list onto the static plate.
 *
 * Positions come from the *existing* two frames only (ARCHITECTURE.md "Two map
 * frames (do not mix)"):
 *   - a loot row's `grace` points at a `warpGraces` pin (engine mosaic frame,
 *     percent), which is the same frame Atlas already draws; or
 *   - a name match against `coords.json` / `boss-pins.json` (already projected
 *     into that same plate frame by `useCoords`).
 * No third projection is introduced.
 */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()

const WORLDS: AtlasWorld[] = ['overworld', 'underground', 'ashen', 'shadow']

function worldOf(value: string): AtlasWorld {
  return (WORLDS as string[]).includes(value) ? (value as AtlasWorld) : 'overworld'
}

function markerKind(kind: LootKind): MarkerKind {
  return kind === 'spirit' ? 'spirit-ash' : 'item'
}

/** Mirrors `known()` in `leftovers.ts` without touching its computation. */
function isKnown(c: Character, id: string) {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

export type Resolved = { x: number; y: number; world: AtlasWorld }

export function resolveLeftover(entry: Loot, coords: CoordPin[]): Resolved | null {
  if (entry.grace) {
    const g = warpGraces.find((x) => x.id === entry.grace)
    if (g) return { x: g.x, y: g.y, world: g.world }
  }
  const n = norm(entry.name)
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

function toPin(entry: Loot, pos: Resolved): MapMarker {
  return {
    id: entry.id,
    name: entry.name,
    kind: markerKind(entry.kind),
    region: entry.region,
    campaign: pos.world === 'shadow' ? 'sote' : 'base',
    x: pos.x,
    y: pos.y,
    note: entry.how,
    leftover: true,
  }
}

export type LeftoverPinOptions = {
  /** Region for `leftovers()`; defaults to the character's current region. */
  region?: string | null
  /** Keep only pins on this Atlas plate. */
  world?: AtlasWorld
}

/**
 * The outstanding-items layer: current-region leftovers plus explicitly watched
 * loot, deduped, resolved to plate coordinates, and optionally limited to the
 * world being viewed. Unresolvable rows are dropped (no invented coordinates).
 */
export function leftoverPins(
  character: Character,
  coords: CoordPin[],
  opts: LeftoverPinOptions = {},
): MapMarker[] {
  const byId = new Map<string, Loot>()
  for (const e of leftovers(character, opts.region)) byId.set(e.id, e)

  for (const id of watchlistOf(character)) {
    if (byId.has(id) || isKnown(character, id)) continue
    const e = loot.find((x) => x.id === id)
    if (e) byId.set(e.id, e)
  }

  const pins: MapMarker[] = []
  for (const e of byId.values()) {
    const pos = resolveLeftover(e, coords)
    if (!pos) continue
    if (opts.world && pos.world !== opts.world) continue
    pins.push(toPin(e, pos))
  }
  return pins
}
