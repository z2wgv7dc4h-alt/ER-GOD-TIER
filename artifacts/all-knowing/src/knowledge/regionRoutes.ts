/**
 * Task 114 §1 — region adjacency for reachability.
 *
 * The progress route in `public/sourced/guide/legs.json` walks the world in a
 * fixed order; the distinct `region` labels it lists, in order, are the spine
 * below. Two regions are "adjacent" when they sit in the same route group or in
 * neighbouring groups, so an item in Liurnia is reachable once you are standing
 * in Limgrave (the route crosses Stormveil between them).
 *
 * The grouping only collapses sub-regions into the route leg that contains them
 * (Raya Lucaria → Liurnia, Stormveil → Limgrave). `regionRoutes.test.ts` asserts
 * `ROUTE_REGIONS` equals the distinct region order in legs.json, so this file
 * cannot silently drift from the guide it claims to read.
 */

/** Distinct `region` labels of legs.json, in route order. */
export const ROUTE_REGIONS = [
  'Limgrave',
  'Weeping Peninsula',
  'Stormveil Castle',
  'Liurnia of the Lakes',
  'Siofra River',
  'Caelid',
  'Dragonbarrow',
  'Nokron, Eternal City',
  'Ainsel River, Nokstella & Lake of Rot',
  'Altus Plateau',
  'Mt. Gelmir',
  'Leyndell, Royal Capital & Sewers',
  'Deeproot Depths',
  'Mountaintops of the Giants',
  'Consecrated Snowfield',
  'Mohgwyn Palace',
  "Miquella's Haligtree & Elphael",
  'DLC: Gravesite Plain & Belurat',
  'DLC: Scadu Altus & Shadow Keep',
  'DLC: Cerulean Coast & Southern Shore',
  'DLC: Rauh, Abyssal Woods & Jagged Peak',
  'DLC: Enir-Ilim',
  'Crumbling Farum Azula',
  'Leyndell, Ashen Capital & Endings',
] as const

export type RouteRegion = (typeof ROUTE_REGIONS)[number]

/**
 * Sub-region → the route group that contains it. Every read of a catalog/loot
 * region resolves through here before adjacency is computed. Matching is
 * substring-based (normalised), so "Raya Lucaria" lands in Liurnia and
 * "Gravesite Plain" lands in the first DLC leg.
 */
const SUBREGION_GROUPS: [RegExp, RouteRegion][] = [
  [/limgrave|stormhill|stormveil|murkwater|mistwood|deathtouched|highroad/i, 'Limgrave'],
  [/weeping peninsula|castle morne|morne tunnel/i, 'Weeping Peninsula'],
  [/liurnia|raya lucaria|caria manor|moonlight altar|albinauric village|lakeside crystal|black knife catacombs|kingsrealm|four belfries/i, 'Liurnia of the Lakes'],
  [/siofra/i, 'Siofra River'],
  [/caelid|redmane|gael tunnel|wailing dunes|greyoll|dragonbarrow/i, 'Caelid'],
  [/nokron/i, 'Nokron, Eternal City'],
  [/ainsel|nokstella|lake of rot|moonlight altar underground/i, 'Ainsel River, Nokstella & Lake of Rot'],
  [/deeproot/i, 'Deeproot Depths'],
  [/altus|lux ruins|sealed tunnel|capital outskirts|volcano manor/i, 'Altus Plateau'],
  [/gelmir/i, 'Mt. Gelmir'],
  [/leyndell|ashen capital|capital rampart/i, 'Leyndell, Royal Capital & Sewers'],
  [/mountaintop|forbidden lands|church of repose|zamor|forge of the giants/i, 'Mountaintops of the Giants'],
  [/consecrated snowfield|ordina|haligtree secret/i, 'Consecrated Snowfield'],
  [/mohgwyn/i, 'Mohgwyn Palace'],
  [/haligtree|elphael|miquella/i, "Miquella's Haligtree & Elphael"],
  [/farum azula/i, 'Crumbling Farum Azula'],
  [/gravesite|belurat|scorpion river/i, 'DLC: Gravesite Plain & Belurat'],
  [/scadu altus|shadow keep|castle ensis|ruined forge|church of the bud|rauh base/i, 'DLC: Scadu Altus & Shadow Keep'],
  [/cerulean coast|southern shore|charo/i, 'DLC: Cerulean Coast & Southern Shore'],
  [/rauh|abyssal woods|jagged peak|ancient ruins/i, 'DLC: Rauh, Abyssal Woods & Jagged Peak'],
  [/enir-ilim/i, 'DLC: Enir-Ilim'],
]

/** Regions that are always reachable regardless of progress. */
const ALWAYS_REACHABLE = new Set(['roundtable', 'roundtable hold', 'various', 'craft', 'limgrave'])

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()

/** The route group a region label belongs to, or null when it is not a map region. */
export function routeGroupFor(region: string | null | undefined): RouteRegion | null {
  const n = norm(region ?? '')
  if (n.length < 3) return null
  for (const [re, group] of SUBREGION_GROUPS) {
    if (re.test(n)) return group
  }
  // Fall back to a direct (fuzzy) match against the route labels themselves.
  for (const r of ROUTE_REGIONS) {
    const rn = norm(r)
    if (rn.includes(n) || n.includes(rn)) return r
  }
  return null
}

export function routeIndexFor(region: string | null | undefined): number | null {
  const group = routeGroupFor(region)
  if (!group) return null
  const i = ROUTE_REGIONS.indexOf(group)
  return i < 0 ? null : i
}

/** True for a region that only exists in Shadow of the Erdtree. */
export function isDlcRegion(region: string | null | undefined): boolean {
  const group = routeGroupFor(region)
  return group !== null && group.startsWith('DLC:')
}

export function isAlwaysReachable(region: string | null | undefined): boolean {
  return ALWAYS_REACHABLE.has(norm(region ?? ''))
}

/**
 * Adjacency index: the opening three legs (Limgrave, Weeping Peninsula,
 * Stormveil Castle) are one walkable cluster, then the route continues. The
 * cluster means Limgrave is adjacent to Liurnia, exactly the "Liurnia-edge" a
 * starting player can ride to.
 */
function adjIndexFor(region: string | null | undefined): number | null {
  const group = routeGroupFor(region)
  if (!group) return null
  const i = ROUTE_REGIONS.indexOf(group as RouteRegion)
  return i < 0 ? null : i <= 2 ? 0 : i - 2
}

/**
 * Two regions are adjacent when the route reaches one from the other: same
 * index, or neighbouring indices. Unknown regions are never adjacent (the
 * advisor refuses to guess a route it cannot see).
 */
export function regionsAdjacent(a: string | null | undefined, b: string | null | undefined): boolean {
  const ia = adjIndexFor(a)
  const ib = adjIndexFor(b)
  if (ia === null || ib === null) return false
  return Math.abs(ia - ib) <= 1
}

/**
 * Reachable when the region (or any reached region) names it directly, is
 * adjacent on the route, or is one of the always-open hubs.
 */
export function regionReachableFrom(reached: string[], region: string | null | undefined): boolean {
  if (!region) return false
  if (isAlwaysReachable(region)) return true
  const r = norm(region)
  if (r.length < 4) return false
  for (const have of reached) {
    const h = norm(have)
    if (h.length < 4) continue
    if (h.includes(r) || r.includes(h) || regionsAdjacent(have, region)) return true
  }
  return false
}
