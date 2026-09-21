import type { GuideItem } from './guide'

/**
 * Achievement-shaped completion sets (HANDOFF-CLAUDE.md §7). Task 16 already
 * gave golden seeds and sacred tears a real total and per-item source; this
 * extends the same treatment to cookbooks, bell bearings, and whetblades,
 * which the guide catalog carries as loose rows with no "N/total" surface.
 *
 * The guide catalog is the single source of truth for the item rows; this
 * module only adds the set metadata, an overlay for the handful of bell
 * bearings the guide shipped without a source, and the progress arithmetic.
 */
export type AchievementSetId = 'cookbook' | 'bell-bearing' | 'whetblade'

export type AchievementSetMeta = {
  id: AchievementSetId
  name: string
  /** Authoritative base + Shadow of the Erdtree total, asserted by tests. */
  total: number
  note: string
}

export const achievementSets: AchievementSetMeta[] = [
  {
    id: 'cookbook',
    name: 'Cookbooks',
    total: 106,
    note: 'Every crafting recipe book, base game + SotE. Use each to learn its recipes.',
  },
  {
    id: 'bell-bearing',
    name: 'Bell Bearings',
    total: 65,
    note: 'Give a merchant’s bell bearing to the Twin Maiden Husks to buy their stock.',
  },
  {
    id: 'whetblade',
    name: 'Whetblades',
    total: 5,
    note: 'Affinity whetblades for the Whetstone Knife. The knife itself is a separate key item.',
  },
]

/**
 * The guide shipped 31 bell bearings with an empty acquisition string — all
 * merchant/miner bearings. These are the named-NPC ones worth spelling out;
 * everything else falls back to the (always true) "kill the merchant" line.
 */
export const bellBearingSources: Record<string, string> = {
  'bell-bearing-kale-s-bell-bearing': 'Dropped by Merchant Kalé at the Church of Elleh, Limgrave.',
  'bell-bearing-rogier-s-bell-bearing': 'Dropped by Sorcerer Rogier in Roundtable Hold.',
  'bell-bearing-d-s-bell-bearing': 'Dropped by D, Hunter of the Dead, in Roundtable Hold.',
  'bell-bearing-corhyn-s-bell-bearing':
    'Dropped by Brother Corhyn in Roundtable Hold, or later on the Altus Plateau.',
  'bell-bearing-sellen-s-bell-bearing':
    'Dropped by Sorceress Sellen at the Witchbane Ruins, Liurnia (or after her questline).',
  'bell-bearing-miriel-s-bell-bearing':
    'Dropped by Miriel, Pastor of Vows, at the Church of Vows, Liurnia.',
  'bell-bearing-iji-s-bell-bearing': 'Dropped by Iji at the Road to the Manor, Liurnia.',
  'bell-bearing-gowry-s-bell-bearing': 'Dropped by Gowry at Gowry’s Shack, Caelid.',
  'bell-bearing-patches-bell-bearing': 'Dropped by Patches in Murkwater Cave, Limgrave.',
  'bell-bearing-blackguard-s-bell-bearing':
    'Dropped by Blackguard Big Boggart in Liurnia, after Rya’s necklace.',
  'bell-bearing-imprisoned-merchant-s-bell-bearing':
    'Dropped by the Imprisoned Merchant in Mohgwyn Palace.',
  'bell-bearing-abandoned-merchant-s-bell-bearing':
    'Dropped by the Abandoned Merchant in the Subterranean Shunning-Grounds, Leyndell.',
  'bell-bearing-smithing-stone-miner-s-bell-bearing':
    'Dropped by the Crystalian boss of the Raya Lucaria Crystal Tunnel.',
}

const BELL_BEARING_FALLBACK =
  'Dropped by the matching merchant — kill them, then hand the bearing to the Twin Maiden Husks.'

export type AchievementRow = {
  id: string
  name: string
  how: string
  dlc: boolean
  missable: string | null
}

export type AchievementProgress = {
  id: AchievementSetId
  name: string
  note: string
  total: number
  done: number
  rows: AchievementRow[]
  remaining: AchievementRow[]
}

function toRow(item: GuideItem, set: AchievementSetId): AchievementRow {
  const how =
    item.how ||
    (set === 'bell-bearing'
      ? bellBearingSources[item.id] || BELL_BEARING_FALLBACK
      : 'Location not captured in the guide catalog.')
  return {
    id: item.id,
    name: item.name,
    how,
    dlc: Boolean(item.dlc),
    missable: item.missable ?? null,
  }
}

/**
 * Progress for every achievement set against the character's collected item
 * ids. `collected` is `character.collectedItems`; guide ids have no `kind:`
 * prefix, so `prefixKind` files them under items.
 */
export function achievementProgress(items: GuideItem[], collected: string[]): AchievementProgress[] {
  const have = new Set(collected)
  return achievementSets.map((set) => {
    const rows = items.filter((i) => i.category === set.id).map((i) => toRow(i, set.id))
    const remaining = rows.filter((r) => !have.has(r.id))
    return {
      id: set.id,
      name: set.name,
      note: set.note,
      total: rows.length,
      done: rows.length - remaining.length,
      rows,
      remaining,
    }
  })
}

/** One compact line per set, e.g. "Cookbooks 12/106 · Bell Bearings 3/65". */
export function achievementSummary(items: GuideItem[], collected: string[]): string {
  return achievementProgress(items, collected)
    .map((p) => `${p.name} ${p.done}/${p.total}`)
    .join(' · ')
}
