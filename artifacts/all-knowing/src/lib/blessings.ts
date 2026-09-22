import type { GuideItem } from './guide'
import type { Character } from '../types'

/**
 * Scadutree Fragment / Revered Spirit Ash meters (Task 60).
 *
 * Totals are the guide catalog's own row counts, read from
 * `public/sourced/guide/catalog.json`:
 *   - category `scadutree-fragment` → 50 rows
 *   - category `revered-spirit-ash` → 25 rows
 *
 * That is the authoritative in-repo list (a per-pickup checklist). The authored
 * `src/knowledge/collectibles.ts` `frag:*` entries are a partial **map-pin**
 * layer and are deliberately NOT used for the meter: they are fewer pins that
 * each cover 1/2/5 fragments, so counting them would show a smaller N/N and
 * claim 100% before the run is actually complete.
 *
 * Blessing *level* uses the per-level fragment/ash thresholds published on the
 * Fextralife Scadutree Fragment and Revered Spirit Ash pages (patch 1.12.2 /
 * 1.12). Only the cumulative count needed per level is stored here; no wiki HTML
 * is committed. See `source` on each set.
 */
export type BlessingSetId = 'scadutree' | 'revered-ash'

export type BlessingSetMeta = {
  id: BlessingSetId
  name: string
  /** Guide catalog category whose rows are the authoritative list. */
  category: string
  /** Unit shown next to the count, e.g. "fragments". */
  unit: string
  /** Category row count as of Task 60; asserted against the catalog by tests. */
  total: number
  /**
   * Cumulative count needed to reach each level: `thresholds[n]` is the total
   * required for blessing level `n`, so `thresholds[0] === 0` and the last entry
   * equals `total`.
   */
  thresholds: number[]
  /** Where the threshold table came from. */
  source: string
  note: string
}

export const blessingSets: BlessingSetMeta[] = [
  {
    id: 'scadutree',
    name: 'Scadutree Blessing',
    category: 'scadutree-fragment',
    unit: 'fragments',
    total: 50,
    thresholds: [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50],
    source: 'Fextralife, Scadutree Fragment — Shadow Realm Blessing table (patch 1.12.2).',
    note: 'Each Scadutree Fragment raises the blessing — attack and damage negation in the Realm of Shadow.',
  },
  {
    id: 'revered-ash',
    name: 'Revered Spirit Ash Blessing',
    category: 'revered-spirit-ash',
    unit: 'ashes',
    total: 25,
    thresholds: [0, 1, 2, 3, 5, 7, 10, 13, 16, 20, 25],
    source: 'Fextralife, Revered Spirit Ash — Shadow Realm Blessing table (patch 1.12).',
    note: 'Each Revered Spirit Ash raises the blessing for your summoned spirits.',
  },
]

/** Highest blessing level whose cumulative threshold is met by `done`. */
export function levelFromCount(done: number, thresholds: number[]): number {
  let level = 0
  for (let i = 1; i < thresholds.length; i += 1) {
    if (done >= thresholds[i]) level = i
    else break
  }
  return level
}

export type BlessingProgress = BlessingSetMeta & {
  done: number
  /** Rows actually found in the guide catalog for this category. */
  listCount: number
  /** True when the in-repo list has fewer rows than the known total. */
  incomplete: boolean
  /** Blessing level for the current count, from the cited threshold table. */
  level: number
  remaining: GuideItem[]
}

/**
 * Progress for the two blessing meters against `character.collectedItems`. Guide
 * ids have no `kind:` prefix, so `prefixKind` files them under items — the same
 * bucket Task 29's achievement sets use.
 */
export function blessingProgress(items: GuideItem[], collected: string[]): BlessingProgress[] {
  const have = new Set(collected)
  return blessingSets.map((set) => {
    const rows = items.filter((i) => i.category === set.category)
    const remaining = rows.filter((r) => !have.has(r.id))
    const done = rows.length - remaining.length
    return {
      ...set,
      done,
      listCount: rows.length,
      incomplete: rows.length < set.total,
      level: levelFromCount(done, set.thresholds),
      remaining,
    }
  })
}

/**
 * "Scadutree Blessing Lv 2 (5/50 fragments)". The level is the highest threshold
 * the count has met; the count is the real collected total.
 */
export function blessingLine(p: BlessingProgress): string {
  return `${p.name} Lv ${p.level} (${p.done}/${p.total} ${p.unit})`
}

/** True when this run has Realm of Shadow access (so the AR caveat applies). */
export function isSoteRun(character: Character): boolean {
  const a = character.answers
  if (a.dlc === 'sote' || a.soteStart === 'yes') return true
  const known = (id: string) =>
    character.collectedItems.includes(id) ||
    character.completedQuestSteps.includes(id) ||
    character.discoveredGraces.includes(id) ||
    character.defeatedBosses.includes(id)
  return known('region:shadow') || known('item:shadow-realm-blessing')
}
