import { byId } from '../knowledge/catalog'
import { warpGraces, type AtlasWorld } from '../knowledge/graces'
import { loot, type Loot } from '../knowledge/loot'
import { canonicalFactId } from '../lib/aliases'
import type { CoordPin } from '../lib/coords'
import { resolveLeftover } from '../lib/leftoverPins'
import type { MapMarker } from '../types'

/**
 * Task 111 §1 — resolve an entity/fact id to a position on a saved map plate.
 *
 * Follows the same two-frame rule as `beatPins.ts` (ARCHITECTURE.md "Two map
 * frames (do not mix)"): a warp grace carries authored x/y, and everything else
 * is grounded by a `coords.json` name match or a loot row's grace. No third
 * projection and no invented coordinates. Unlike `beatPin` it keeps the world,
 * so a result pin can be filtered to the plate the player is actually viewing.
 */
const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

const WORLDS: AtlasWorld[] = ['overworld', 'underground', 'ashen', 'shadow']
const asWorld = (value: string): AtlasWorld => (WORLDS as string[]).includes(value) ? (value as AtlasWorld) : 'overworld'

const lootById = new Map<string, Loot>(loot.map((l) => [l.id, l]))
const lootByName = new Map<string, Loot>()
for (const l of loot) {
  const n = norm(l.name)
  if (n && !lootByName.has(n)) lootByName.set(n, l)
}

const KINDS: MapMarker['kind'][] = ['grace', 'boss', 'item', 'npc', 'fragment', 'spirit-ash', 'dungeon']

export type ResolvedPin = { marker: MapMarker; world: AtlasWorld }

export function resolveEntityPin(factId: string, coords: CoordPin[] = []): ResolvedPin | null {
  if (!factId) return null
  const canonical = canonicalFactId(factId)

  const grace = warpGraces.find((g) => g.id === factId) ?? warpGraces.find((g) => g.id === canonical)
  if (grace) {
    return {
      marker: {
        id: grace.id,
        name: grace.name,
        kind: 'grace',
        region: grace.region,
        campaign: grace.campaign === 'tarnished-pack' ? 'base' : grace.campaign,
        x: grace.x,
        y: grace.y,
        note: 'result',
      },
      world: grace.world,
    }
  }

  const catalogName = byId.get(canonical)?.name ?? byId.get(factId)?.name
  const entry = lootById.get(factId) ?? lootById.get(canonical) ?? (catalogName ? lootByName.get(norm(catalogName)) : undefined)
  if (entry) {
    const pos = resolveLeftover(entry, coords)
    if (pos) {
      return {
        marker: {
          id: entry.id,
          name: entry.name,
          kind: entry.kind === 'spirit' ? 'spirit-ash' : 'item',
          region: entry.region,
          campaign: pos.world === 'shadow' ? 'sote' : 'base',
          x: pos.x,
          y: pos.y,
          note: entry.how,
        },
        world: pos.world,
      }
    }
  }

  const lookup = catalogName ?? factId
  const n = norm(lookup)
  if (n.length >= 3) {
    const exact = coords.find((c) => norm(c.name) === n)
    const partial = exact ?? coords.find((c) => {
      const cn = norm(c.name)
      return Math.min(n.length, cn.length) >= 5 && (cn.includes(n) || n.includes(cn))
    })
    if (partial) {
      const world = asWorld(partial.world)
      return {
        marker: {
          id: factId,
          name: partial.name,
          kind: (KINDS as string[]).includes(partial.kind) ? (partial.kind as MapMarker['kind']) : 'item',
          region: partial.world,
          campaign: world === 'shadow' ? 'sote' : 'base',
          x: partial.x,
          y: partial.y,
          note: partial.how || partial.cat || '',
        },
        world,
      }
    }
  }

  return null
}

/** Re-export the canonical grace world map for callers building focus targets. */
export function graceWorld(factId: string): AtlasWorld | null {
  const g = warpGraces.find((x) => x.id === factId)
  return g ? g.world : null
}
