import { byId } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { loot, type Loot } from '../knowledge/loot'
import type { Character, MapMarker } from '../types'
import { canonicalFactId } from './aliases'
import type { CoordPin } from './coords'
import { leftoverPins, lootPin } from './leftoverPins'

/**
 * Task 78: does a plan beat already have a pin?
 *
 * Pure and grounded. It reuses `lootPin` / `leftoverPins` and the authored
 * `graces.ts` coordinates — it never invents lat/lng. A beat with no existing
 * pin returns null and is shown as text only.
 */

// Apostrophes/quotes are dropped, not spaced, to match buildHunt/leftoverPins.
const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

const lootById = new Map<string, Loot>(loot.map((l) => [l.id, l]))
const lootByName = new Map<string, Loot>()
for (const l of loot) {
  const n = norm(l.name)
  if (n && !lootByName.has(n)) lootByName.set(n, l)
}

/** An authored `graces.ts` warp, which already carries a real x/y. */
function gracePin(factId: string): MapMarker | null {
  const g = warpGraces.find((w) => w.id === factId)
  if (!g) return null
  return {
    id: g.id,
    name: g.name,
    kind: 'grace',
    region: g.region,
    campaign: g.campaign === 'tarnished-pack' ? 'base' : g.campaign,
    x: g.x,
    y: g.y,
    note: 'existing grace pin',
  }
}

export function beatPin(
  character: Character,
  factId: string | null,
  coords: CoordPin[] = [],
): MapMarker | null {
  if (!factId) return null

  const grace = gracePin(factId)
  if (grace) return grace

  // A loot row by id, or a loot row whose name matches the catalog fact's name.
  const catalogName = byId.get(factId)?.name
  const direct = lootById.get(factId) ?? (catalogName ? lootByName.get(norm(catalogName)) : undefined)
  if (direct) {
    const pin = lootPin(direct, coords)
    if (pin) return pin
  }

  // Whatever the current leftover/watchlist layer can already place.
  const canonical = canonicalFactId(factId)
  return leftoverPins(character, coords).find((p) => p.id === factId || p.id === canonical) ?? null
}
