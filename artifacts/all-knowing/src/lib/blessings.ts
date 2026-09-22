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
 * Blessing *level* needs the per-level fragment thresholds. No such table exists
 * in-repo, nor in a permitted source already listed in `DATA.md` / `awesome.ts`,
 * so this is count-only: `level` stays `undefined` and the UI prints "Lv —" with
 * a note rather than inventing thresholds.
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
  note: string
  /** Why no level can be shown. Honest, not a placeholder threshold. */
  levelNote: string
}

export const blessingSets: BlessingSetMeta[] = [
  {
    id: 'scadutree',
    name: 'Scadutree Blessing',
    category: 'scadutree-fragment',
    unit: 'fragments',
    total: 50,
    note: 'Each Scadutree Fragment raises the blessing — attack and damage negation in the Realm of Shadow.',
    levelNote: 'Blessing level thresholds are not in this repo, so only the count is shown.',
  },
  {
    id: 'revered-ash',
    name: 'Revered Spirit Ash Blessing',
    category: 'revered-spirit-ash',
    unit: 'ashes',
    total: 25,
    note: 'Each Revered Spirit Ash raises the blessing for your summoned spirits.',
    levelNote: 'Blessing level thresholds are not in this repo, so only the count is shown.',
  },
]

export type BlessingProgress = BlessingSetMeta & {
  done: number
  /** Rows actually found in the guide catalog for this category. */
  listCount: number
  /** True when the in-repo list has fewer rows than the known total. */
  incomplete: boolean
  /** Undefined until a cited level-threshold table exists (see `levelNote`). */
  level: number | undefined
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
    return {
      ...set,
      done: rows.length - remaining.length,
      listCount: rows.length,
      incomplete: rows.length < set.total,
      level: undefined,
      remaining,
    }
  })
}

/**
 * "Scadutree Blessing Lv — (12/50 fragments)". The level is `—` unless a cited
 * table is added; the count is always real.
 */
export function blessingLine(p: BlessingProgress): string {
  const lv = p.level === undefined ? '—' : String(p.level)
  return `${p.name} Lv ${lv} (${p.done}/${p.total} ${p.unit})`
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
