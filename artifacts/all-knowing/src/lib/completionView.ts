import { markers } from '../data/seed'
import { facts } from '../knowledge/catalog'
import { flaskUpgrades, mapFragments, scadutreeFragments } from '../knowledge/collectibles'
import { warpGraces } from '../knowledge/graces'
import { loot } from '../knowledge/loot'
import { canonicalFactId } from './aliases'
import { knownFactIds } from './infer'
import type { Character } from '../types'

/**
 * Task 100 §5 — the completion "Missing" drill-down (Usage model moment 16).
 *
 * One pure pass over the reference data the repo already ships. Every category
 * is real data with an honest total; a category the repo has no rows for still
 * appears (total 0) rather than being faked. `pinned` marks the categories whose
 * rows are Atlas pins, so the UI only offers "Show all on map" where it works.
 */

export type CompletionRow = { id: string; name: string }

export type CompletionCategory = {
  id: string
  label: string
  /** True when every row is a real Atlas pin. */
  pinned: boolean
  have: number
  total: number
  missing: CompletionRow[]
}

function dedupe(rows: CompletionRow[]): CompletionRow[] {
  const seen = new Set<string>()
  const out: CompletionRow[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

/**
 * Every completion category from `docs/tasks/100-resume-glance.md`, each with the
 * rows still missing for this character.
 */
export function completionCategories(character: Character): CompletionCategory[] {
  const known = knownFactIds(character)

  const category = (id: string, label: string, rows: CompletionRow[], pinned = false): CompletionCategory => {
    const unique = dedupe(rows)
    const missing = unique.filter((r) => !known.has(canonicalFactId(r.id)))
    return { id, label, pinned, have: unique.length - missing.length, total: unique.length, missing }
  }

  const markerRows = (kind: (typeof markers)[number]['kind']) =>
    markers.filter((m) => m.kind === kind).map((m) => ({ id: m.id, name: m.name }))

  return [
    category('bosses', 'Bosses', markerRows('boss'), true),
    category('graces', 'Graces', warpGraces.map((g) => ({ id: g.id, name: g.name })), true),
    category('items', 'Items', markerRows('item'), true),
    category(
      'spirit-ashes',
      'Spirit ashes',
      loot.filter((l) => l.kind === 'spirit').map((l) => ({ id: l.id, name: l.name })),
    ),
    category(
      'crystal-tears',
      'Crystal tears',
      flaskUpgrades.filter((c) => /tear/i.test(c.name)).map((c) => ({ id: c.id, name: c.name })),
    ),
    category(
      'cookbooks',
      'Cookbooks',
      facts.filter((f) => /cookbook/i.test(f.name)).map((f) => ({ id: f.id, name: f.name })),
    ),
    category(
      'bell-bearings',
      'Bell bearings',
      facts.filter((f) => /bell bearing/i.test(f.name)).map((f) => ({ id: f.id, name: f.name })),
    ),
    category('map-fragments', 'Map fragments', mapFragments.map((c) => ({ id: c.id, name: c.name }))),
    category('scadutree', 'Scadutree fragments', scadutreeFragments.map((c) => ({ id: c.id, name: c.name }))),
  ]
}
