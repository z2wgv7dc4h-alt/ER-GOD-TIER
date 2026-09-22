import { byId, facts } from '../knowledge/catalog'
import { approachingGates } from '../knowledge/gates'
import { warpGraces } from '../knowledge/graces'
import { loot } from '../knowledge/loot'
import { stillAvailable } from '../knowledge/storylines'
import type { Character } from '../types'
import { knownIds, labelOf } from './links'
import { currentRegion, leftovers } from './leftovers'

/**
 * Task 75: "what did I miss here" — region-scoped leftovers.
 *
 * Pure presentation over data that already exists. It reuses `leftovers()`,
 * `stillAvailable()` and `approachingGates()`; it never invents a wiki region
 * table. Region membership comes only from in-repo grace / loot / catalog
 * metadata. A thing with no region never appears in a scoped answer (and the
 * global answer never claims to be "here").
 */
export type RegionMissSource = 'line' | 'loot' | 'grace' | 'gate'

export type RegionMiss = {
  id: string
  name: string
  region?: string
  source: RegionMissSource
}

export type RegionLeftovers = {
  /** Display label of the matched region(s), or null when the answer is global. */
  region: string | null
  /** True only when a real in-repo region matched — never for the global pool. */
  scoped: boolean
  /** Up to `cap` items, region-scoped first. */
  items: RegionMiss[]
  /** How many matching items remain beyond the cap. */
  more: number
  /** Every matched item, before the cap. */
  total: number
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()

// Region names harvested from in-repo metadata only: authored loot rows, the
// warp-list graces, and every catalog fact. Longest first so a specific name
// ("Mountaintops of the Giants") beats a substring ("Mountaintops").
const REGION_NAMES: string[] = (() => {
  const seen = new Set<string>()
  const names: string[] = []
  const add = (r?: string) => {
    if (!r) return
    const n = norm(r)
    if (n.length < 4 || n === 'various' || n === 'craft') return
    if (seen.has(n)) return
    seen.add(n)
    names.push(r)
  }
  for (const l of loot) add(l.region)
  for (const g of warpGraces) add(g.region)
  for (const f of facts) add(f.region)
  return names.sort((a, b) => norm(b).length - norm(a).length)
})()

function matchesRegion(region: string | undefined, tokens: string[]): boolean {
  if (!region) return false
  const r = norm(region)
  if (!r) return false
  return tokens.some((t) => {
    const tn = norm(t)
    if (tn.length < 4) return false
    return r.includes(tn) || tn.includes(r)
  })
}

/** Region name(s) named in the question, or the current region for "here". */
function resolveRegions(character: Character, query: string): string[] {
  const n = norm(query)
  if (/\bhere\b/.test(n)) {
    const r = currentRegion(character)
    return r ? [r] : []
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of REGION_NAMES) {
    if (!n.includes(norm(r))) continue
    const k = norm(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

export function regionLeftovers(character: Character, query = '', cap = 8): RegionLeftovers {
  const tokens = resolveRegions(character, query)
  const scoped = tokens.length > 0
  const scope = scoped ? tokens.join(' / ') : null

  const items: RegionMiss[] = []
  const seen = new Set<string>()
  const add = (m: RegionMiss) => {
    if (seen.has(m.id)) return
    seen.add(m.id)
    items.push(m)
  }

  // 1. The next unbeaten beat of every line in play, attributed by the catalog
  //    region of its fact (never by prose).
  const survey = stillAvailable(character)
  for (const row of [...survey.active, ...survey.open]) {
    const step = row.current
    if (!step?.factId) continue
    const region = byId.get(step.factId)?.region
    if (scoped && !matchesRegion(region, tokens)) continue
    add({ id: step.factId, name: labelOf(step.factId), region, source: 'line' })
  }

  // 2. Outstanding loot. `leftovers()` already owns the region filter and the
  //    "is it known" check; pass the scope through (the slash form handles a
  //    multi-region selection like "Nokron/Siofra").
  const lootPool = scoped ? leftovers(character, tokens.join('/')) : leftovers(character)
  for (const e of lootPool) add({ id: e.id, name: e.name, region: e.region, source: 'loot' })

  // 3. Undiscovered warp-list graces.
  const have = knownIds(character)
  for (const g of warpGraces) {
    if (have.has(g.id)) continue
    if (scoped && !matchesRegion(g.region, tokens)) continue
    add({ id: g.id, name: g.name, region: g.region, source: 'grace' })
  }

  // 4. World-state gates have no region, so they only ever join the global pool.
  if (!scoped) {
    for (const gate of approachingGates(character)) add({ id: gate.id, name: gate.name, source: 'gate' })
  }

  return {
    region: scope,
    scoped,
    items: items.slice(0, Math.max(0, cap)),
    more: Math.max(0, items.length - cap),
    total: items.length,
  }
}
