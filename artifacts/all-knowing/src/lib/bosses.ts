/**
 * Boss drops (and per-location runes) scraped from the Fextralife Elden Ring
 * wiki by `scripts/scrape-fextralife-bosses.mjs` — base + Shadow of the Erdtree,
 * which the older FanAPI/checklist boss files did not cover for the DLC.
 *
 * Each row keeps its page URL. Values are quoted from the wiki (rune totals,
 * remembrance + item names); nothing is inferred.
 */
export type FextBoss = {
  name: string
  locations: string[]
  drops: string[]
  hp: string
  /** Page body sections: fight guide/strategy, combat info, lore. */
  sections?: { heading: string; text: string }[]
  url: string
}
export type BossDrops = { source: string; bosses: FextBoss[] }

let cache: BossDrops | null = null

export async function loadBossDrops(): Promise<BossDrops> {
  if (cache) return cache
  const r = await fetch('/sourced/open/bosses-fextralife.json')
  if (!r.ok) throw new Error('boss drops ' + r.status)
  cache = (await r.json()) as BossDrops
  return cache
}

export function matchBossDrops(query: string, rows: FextBoss[], limit = 12): FextBoss[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows
    .filter((b) => `${b.name} ${b.locations.join(' ')} ${b.drops.join(' ')}`.toLowerCase().includes(q))
    .slice(0, limit)
}
