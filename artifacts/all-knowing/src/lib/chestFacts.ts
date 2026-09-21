/**
 * Chest / pickup facts from the open `world-lots.json` dump (Goblins
 * `items_database.json`, slimmed — see DATA.md).
 *
 * A chest fact is one event flag: "this chest/pickup at this world position
 * contains these items". It is deliberately not a second projection — lots stay
 * in the game's own world XYZ frame, the same frame `boss-xyz.json` /
 * `grace-xyz.json` use, which `coords.ts` already documents as the reason lots
 * are not plotted on the static plate. The human-readable `region` comes from
 * the nearest named point in the existing `grace-xyz.json` world-position index.
 *
 * Item names are cross-referenced against the authored catalog so a fact can be
 * deduped / logged against the same item ids the rest of the app uses.
 */
import { useEffect, useState } from 'react'
import { facts } from '../knowledge/catalog'
import type { WorldLot } from './openData'

export type ChestFact = {
  /** `lot:<eventFlag>` — matches the id `openData.matchOpen` already emits. */
  id: string
  flag: number
  lot: number
  items: string[]
  /** Catalog fact ids for items whose names resolve; the dedupe key. */
  catalogIds: string[]
  map: string
  x: number
  y: number
  z: number
  /** Nearest named region from the grace world-position index, or ''. */
  region: string
  category: string
  source: string
}

export type GraceRegion = {
  areaNo: number
  x: number
  y: number
  z: number
  region: string
}

/** Treasure sources only — enemy drops and scripted award events are not chests. */
const CHEST_SOURCES = new Set(['treasure', 'emevd_treasure'])

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

let catalogIndex: Map<string, string> | null = null

/** item name (normalised) -> catalog fact id, built once. */
export function catalogItemIndex(): Map<string, string> {
  if (catalogIndex) return catalogIndex
  const index = new Map<string, string>()
  for (const f of facts) {
    if (f.kind !== 'item') continue
    const key = norm(f.name)
    if (key && !index.has(key)) index.set(key, f.id)
  }
  catalogIndex = index
  return index
}

function areaNumber(map: string): number {
  const m = /^m(\d{2})_/.exec(map)
  return m ? Number(m[1]) : 0
}

export function nearestRegion(regionsByArea: Map<number, GraceRegion[]>, map: string, x: number, y: number, z: number): string {
  const points = regionsByArea.get(areaNumber(map))
  if (!points || points.length === 0) return ''
  let best = ''
  let bestDist = Infinity
  for (const p of points) {
    const dx = p.x - x
    const dy = p.y - y
    const dz = p.z - z
    const d = dx * dx + dy * dy + dz * dz
    if (d < bestDist) {
      bestDist = d
      best = p.region
    }
  }
  return best
}

/**
 * Group treasure lots into one fact per event flag. A flag with several item
 * rows is a single chest containing several items (the slim dump keeps one row
 * per item), so items are unioned. Flag 0 means "no event flag" — those rows
 * cannot be deduped or ticked off, so they are dropped rather than merged into
 * one giant fake chest.
 */
export function buildChestFacts(lots: WorldLot[], regions: GraceRegion[]): ChestFact[] {
  const index = catalogItemIndex()
  const regionsByArea = new Map<number, GraceRegion[]>()
  for (const r of regions) {
    if (!r.region) continue
    const list = regionsByArea.get(r.areaNo)
    if (list) list.push(r)
    else regionsByArea.set(r.areaNo, [r])
  }

  const byFlag = new Map<number, { items: string[]; seen: Set<string>; rows: WorldLot[] }>()
  for (const row of lots) {
    if (!row.flag || !row.src || !CHEST_SOURCES.has(row.src)) continue
    let group = byFlag.get(row.flag)
    if (!group) {
      group = { items: [], seen: new Set(), rows: [] }
      byFlag.set(row.flag, group)
    }
    group.rows.push(row)
    if (row.name && !group.seen.has(row.name)) {
      group.seen.add(row.name)
      group.items.push(row.name)
    }
  }

  const out: ChestFact[] = []
  for (const [flag, group] of byFlag) {
    if (group.items.length === 0) continue
    const first = group.rows[0]
    const catalogIds: string[] = []
    for (const item of group.items) {
      const id = index.get(norm(item))
      if (id && !catalogIds.includes(id)) catalogIds.push(id)
    }
    out.push({
      id: `lot:${flag}`,
      flag,
      lot: first.lot ?? 0,
      items: group.items,
      catalogIds,
      map: first.map ?? '',
      x: first.x ?? 0,
      y: first.y ?? 0,
      z: first.z ?? 0,
      region: nearestRegion(regionsByArea, first.map ?? '', first.x ?? 0, first.y ?? 0, first.z ?? 0),
      category: first.cat ?? 'unknown',
      source: first.src ?? '',
    })
  }
  out.sort((a, b) => a.region.localeCompare(b.region) || a.items[0].localeCompare(b.items[0]))
  return out
}

export function matchChests(text: string, chests: ChestFact[], limit = 12): ChestFact[] {
  const n = norm(text)
  if (n.length < 3) return []
  const hits: ChestFact[] = []
  for (const c of chests) {
    if (c.items.some((i) => norm(i).includes(n)) || norm(c.region).includes(n) || c.map.toLowerCase().includes(n)) {
      hits.push(c)
      if (hits.length >= limit) break
    }
  }
  return hits
}

let regionsCache: GraceRegion[] | null = null

export async function loadGraceRegions(): Promise<GraceRegion[]> {
  if (regionsCache) return regionsCache
  const res = await fetch('/sourced/open/grace-xyz.json')
  if (!res.ok) throw new Error(`grace position index unavailable (${res.status})`)
  const rows = (await res.json()) as { areaNo: number; x: number; y: number; z: number; subRegion?: string | null; majorRegion?: string | null }[]
  regionsCache = rows.map((r) => ({
    areaNo: r.areaNo,
    x: r.x,
    y: r.y,
    z: r.z,
    region: r.subRegion || r.majorRegion || '',
  }))
  return regionsCache
}

export function useGraceRegions(): GraceRegion[] {
  const [regions, setRegions] = useState<GraceRegion[]>(regionsCache ?? [])
  useEffect(() => {
    if (regionsCache) return
    let cancelled = false
    void loadGraceRegions()
      .then((rows) => {
        if (!cancelled) setRegions(rows)
      })
      .catch(() => {
        /* no region labels; facts still carry map + XYZ */
      })
    return () => {
      cancelled = true
    }
  }, [])
  return regions
}
