import { bossFactIdSet } from './bossRoster'
import { allWarpRows } from './aliases'
import { allRecords } from './entityIndex'
import { getEntity } from './entityGraph'
import { canonicalFactId } from './aliases'
import { resolvedFactIds } from './infer'
import { merchants } from '../knowledge/merchants'
import { normalizeName } from './fanImage'
import type { Character, Evidence } from '../types'

/**
 * Task 144 §2 — the Tarnished › Overview progress meters.
 *
 * Every denominator is a real full set (the hosted grace warp list, the boss
 * roster, the item catalogue) and every numerator is the character's facts
 * mapped into that same canonical id space. A fact that is not in the full set
 * (e.g. a curated extra) is unioned into the denominator rather than allowed to
 * push a ratio above 1 — so the bars are always honest.
 */

export type ProgressMeter = {
  id: string
  label: string
  have: number
  total: number
  /** have / total, always in [0, 1]. */
  ratio: number
}

const GRACE_UNIVERSE: Set<string> = new Set(allWarpRows.map((g) => canonicalFactId(g.id)))

const ITEM_KINDS = new Set(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])

/** Every item-shaped id the enrichment index carries (empty until it loads). */
export function itemCatalogueIds(): Set<string> {
  const out = new Set<string>()
  for (const rec of allRecords()) {
    if (ITEM_KINDS.has(rec.kind)) out.add(canonicalFactId(rec.id))
  }
  return out
}

function meter(label: string, universe: Set<string>, found: Iterable<string>): ProgressMeter {
  const total = new Set(universe)
  const ids = new Set<string>()
  let have = 0
  for (const raw of found) {
    const id = canonicalFactId(raw)
    if (ids.has(id)) continue
    ids.add(id)
    if (total.has(id)) have += 1
    else {
      // Not in the full set: count it and widen the denominator, never > 1.
      total.add(id)
      have += 1
    }
  }
  return { id: label, label, have, total: total.size, ratio: total.size ? have / total.size : 0 }
}

export function progressMeters(character: Character, opts: { itemIds?: Iterable<string> } = {}): ProgressMeter[] {
  const known = resolvedFactIds(character)
  const graces = [...known].filter((id) => GRACE_UNIVERSE.has(id))
  const bosses = [...known].filter((id) => bossFactIdSet.has(id))
  const itemUniverse = new Set(opts.itemIds ?? itemCatalogueIds())
  const items = character.collectedItems.map((id) => canonicalFactId(id))

  return [
    meter('Graces', GRACE_UNIVERSE, graces),
    meter('Bosses', bossFactIdSet, bosses),
    meter('Items found', itemUniverse, items),
  ]
}

/** A readable recent-activity line: verb + entity, never a raw id or source. */
export type ActivityLine = { verb: string; factId: string; name: string; from?: string; inferred: boolean }

function vendorFor(name: string, detail: string): string | undefined {
  const target = normalizeName(name)
  for (const m of merchants) {
    if (m.stock.some((s) => normalizeName(s) === target)) return m.vendor
  }
  const d = detail.toLowerCase()
  for (const m of merchants) {
    if (m.vendor && d.includes(m.vendor.toLowerCase())) return m.vendor
  }
  // "Twin Maiden Husks:Margit's Shackle" style prefix.
  const colon = detail.indexOf(':')
  if (colon > 0) {
    const left = detail.slice(0, colon).trim()
    if (left.length > 2) return left
  }
  return undefined
}

export function activityLine(evidence: Evidence): ActivityLine {
  const factId = canonicalFactId(evidence.fact)
  const entity = getEntity(factId)
  const name = entity.name
  const inferred = evidence.source === 'inference'
  if (inferred) return { verb: 'Inferred', factId, name, inferred }
  switch (entity.kind) {
    case 'boss':
    case 'enemy':
      return { verb: 'Defeated', factId, name, inferred }
    case 'grace':
      return { verb: 'Discovered', factId, name, inferred }
    case 'quest':
    case 'ending':
      return { verb: 'Did', factId, name, inferred }
    default: {
      const from = vendorFor(name, evidence.detail ?? '')
      return { verb: from ? 'Bought' : 'Found', factId, name, from, inferred }
    }
  }
}
