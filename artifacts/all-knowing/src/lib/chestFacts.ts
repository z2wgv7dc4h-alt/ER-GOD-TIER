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
import type { NpcPlacement } from './npcPlacements'

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

// ---------------------------------------------------------------------------
// Task 183 §2 — chest pins on the static plate
// ---------------------------------------------------------------------------

export type ChestWorld = 'overworld' | 'underground' | 'shadow'

export type ChestPin = {
  id: string
  /** The chest's headline item (or its region when it holds only materials). */
  name: string
  flag: number
  map: string
  region: string
  world: ChestWorld
  /** Plate percent (0..100), the same frame `coords.ts` / `boss-pins.json` use. */
  x: number
  y: number
}

const MOSAIC = 10496
const TILE_WORLD = 256
const OFFSET_X = -7168
const OFFSET_Y = 16640

type Anchor = { offX: number; offY: number; world: ChestWorld }

const asWorld = (value: string | undefined): ChestWorld =>
  value === 'underground' || value === 'shadow' ? value : 'overworld'

const pct = (v: number) => (v / MOSAIC) * 100

function parseMapId(id: string): { area: number; block: number; mapno: number } | null {
  const m = /^m(\d+)_(\d+)_(\d+)_/.exec(id)
  if (!m) return null
  return { area: Number(m[1]), block: Number(m[2]), mapno: Number(m[3]) }
}

/**
 * A per-map translation from the already-projected NPC placements: local x/z ->
 * plate px/py. This is the exact anchor `map/itemSources.ts` derives for enemy
 * spawns, so chests land in the same frame as every other pin. Legacy dungeons
 * (`m10`, `m30`, …) have no runtime world->plate affine of their own, so an NPC
 * or boss anchor on the same map is the only honest way to place them.
 */
export function chestAnchors(placements: NpcPlacement[]): Map<string, Anchor> {
  const byMap = new Map<string, Anchor>()
  for (const p of placements) {
    if (typeof p.px !== 'number' || typeof p.py !== 'number') continue
    if (byMap.has(p.map)) continue
    byMap.set(p.map, { offX: p.px - p.x, offY: p.py + p.z, world: asWorld(p.world) })
  }
  return byMap
}

/** Project one chest into plate percent, or null when its map cannot be grounded. */
export function projectChest(chest: ChestFact, anchors: Map<string, Anchor>): ChestPin | null {
  const name = chest.items[0] ?? chest.region ?? ''
  const anchor = anchors.get(chest.map)
  if (anchor) {
    return {
      id: chest.id,
      name,
      flag: chest.flag,
      map: chest.map,
      region: chest.region,
      world: anchor.world,
      x: pct(chest.x + anchor.offX),
      y: pct(-chest.z + anchor.offY),
    }
  }
  const tile = parseMapId(chest.map)
  // The overworld (m60) and Shadow (m61) tiles have a fixed affine. A `_02`
  // map is an interior/underground variant of the same tile that is NOT on the
  // surface plate; a legacy dungeon without an anchor is skipped rather than guessed.
  if (!tile || (tile.area !== 60 && tile.area !== 61) || !/_00$/.test(chest.map)) return null
  const px = tile.block * TILE_WORLD + TILE_WORLD / 2 + chest.x + OFFSET_X
  const py = OFFSET_Y - (tile.mapno * TILE_WORLD + TILE_WORLD / 2 + chest.z)
  return {
    id: chest.id,
    name,
    flag: chest.flag,
    map: chest.map,
    region: chest.region,
    world: tile.area === 61 ? 'shadow' : 'overworld',
    x: pct(px),
    y: pct(py),
  }
}

export function chestPins(chests: ChestFact[], placements: NpcPlacement[]): ChestPin[] {
  const anchors = chestAnchors(placements)
  const out: ChestPin[] = []
  for (const c of chests) {
    const pin = projectChest(c, anchors)
    if (pin) out.push(pin)
  }
  return out
}

export type ChestData = { facts: ChestFact[]; pins: ChestPin[] }

let chestDataCache: ChestData | null = null

/** Fetch world lots + region labels + NPC anchors once, then build facts and pins. */
export async function loadChestData(): Promise<ChestData> {
  if (chestDataCache) return chestDataCache
  const [lots, regions, placements] = await Promise.all([
    fetch('/sourced/open/world-lots.json').then((r) => r.json() as Promise<WorldLot[]>),
    loadGraceRegions(),
    fetch('/sourced/npc-placements.json')
      .then((r) => r.json() as Promise<{ placements?: NpcPlacement[] }>)
      .catch(() => ({}) as { placements?: NpcPlacement[] }),
  ])
  const facts = buildChestFacts(lots, regions)
  chestDataCache = { facts, pins: chestPins(facts, placements.placements ?? []) }
  return chestDataCache
}

export function useChestData(enabled: boolean): ChestData {
  const [data, setData] = useState<ChestData>(chestDataCache ?? { facts: [], pins: [] })
  useEffect(() => {
    if (!enabled || chestDataCache) return
    let cancelled = false
    void loadChestData()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        /* no chest data: the layer simply stays empty */
      })
    return () => {
      cancelled = true
    }
  }, [enabled])
  return data
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
