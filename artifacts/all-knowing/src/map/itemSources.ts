import { useEffect, useMemo, useState } from 'react'
import type { AtlasWorld } from '../knowledge/graces'
import type { CoordPin } from '../lib/coords'
import type { NpcPlacement } from '../lib/npcPlacements'
import { resolveEntityPin } from './pins'

/**
 * Task 156 — "Show on map" for items that are not world pickups.
 *
 * Many items have no `coords.json` pickup row: they are sold by a merchant,
 * dropped by an enemy or boss, handed out by a quest or crafted. The resolver
 * here turns an item id/name into an ordered list of *map targets* (a label plus
 * one or more grounded positions) from data already on disk:
 *
 *   pickup  `open/coords.json` / `boss-pins.json` (existing `resolveEntityPin`)
 *   boss    the boss roster's `drops`, positioned by its own percent pin
 *   vendor  `open/shops.json` stock -> the merchant's `npc-placements` position
 *   enemy   `open/enemy-drops.json` -> `open/msb-enemies.json` spawn instances,
 *           projected to the plate frame with the per-map affine derived from
 *           the already-projected `npc-placements.json`
 *   other   quest/craft rewards; the `how to get it` text when no position
 *
 * Order is fixed: pickup > boss > vendor > enemy > other. Nothing is invented:
 * an enemy spawn is only emitted when its MSB map has a projection anchor, and a
 * vendor only when the merchant has a placement. A source with no point still
 * carries a label so the UI can show the region and the "how to get it" text.
 */

export type ItemSourceKind = 'pickup' | 'boss' | 'vendor' | 'enemy' | 'other'

export type SourcePoint = { x: number; y: number }

export type ItemSource = {
  kind: ItemSourceKind
  /** e.g. "Sold by Twin Maiden Husks", "Dropped by Omen 4% · 6 spawns". */
  label: string
  world: AtlasWorld
  /** Plate-percent positions. Empty when the source has no grounded position. */
  points: SourcePoint[]
  region?: string
}

export type MsbEnemyRow = { id: string; map: string; x: number; z: number }
export type EnemyDropRow = { npcParamId: number; name: string; drops: { item: string; chance: number }[] }
export type ShopRow = { vendor: string; item: string }
export type BossDropRow = {
  id: string
  name: string
  drops?: string[]
  map?: { x: number; y: number; world?: string }
  region?: string
}
export type AcquisitionRow = { name: string; method: string; location: string; near?: string }
export type RecipeRow = { name: string; materials: { name: string }[] }

export type ItemSourceData = {
  coords: CoordPin[]
  anchors: NpcPlacement[]
  msb: MsbEnemyRow[]
  enemyDrops: EnemyDropRow[]
  shops: ShopRow[]
  bosses: BossDropRow[]
  acquisitions: AcquisitionRow[]
  recipes: RecipeRow[]
}

export type ItemQuery = {
  id: string
  name: string
  kind?: string
  region?: string
  /** The entity's best acquisition sentence, for the "how to get it" fallback. */
  how?: string
  /** A percent plate position the entity index carries (0..100 only). */
  map?: { x: number; y: number; world?: string }
}

export type ItemSourceResolver = (item: ItemQuery) => ItemSource[]

const MOSAIC = 10496
const TILE_WORLD = 256
const OFFSET_X = -7168
const OFFSET_Y = 16640

const WORLDS: AtlasWorld[] = ['overworld', 'underground', 'ashen', 'shadow']
const asWorld = (value: string | undefined): AtlasWorld =>
  (WORLDS as string[]).includes(value ?? '') ? (value as AtlasWorld) : 'overworld'

const norm = (s: string) =>
  s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

const pct = (px: number, py: number): SourcePoint => ({
  x: (px / MOSAIC) * 100,
  y: (py / MOSAIC) * 100,
})

const inPlate = (v: number | undefined): boolean => typeof v === 'number' && v >= 0 && v <= 100

/** First-token / base name so "Sorceress Sellen - Quest" resolves to Sellen. */
function baseVendor(name: string): string {
  return name.split(/\s+-\s+/)[0].trim()
}

function parseMapId(id: string): { area: number; block: number; mapno: number } | null {
  const m = /^m(\d+)_(\d+)_(\d+)_/.exec(id)
  if (!m) return null
  return { area: Number(m[1]), block: Number(m[2]), mapno: Number(m[3]) }
}

type Anchor = { offX: number; offY: number; world: AtlasWorld }

/** Project an MSB PARTS position to plate percent; null when it cannot be grounded. */
function projectSpawn(
  row: MsbEnemyRow,
  anchorByMap: Map<string, Anchor>,
): { point: SourcePoint; world: AtlasWorld } | null {
  const anchor = anchorByMap.get(row.map)
  if (anchor) {
    return { point: pct(row.x + anchor.offX, -row.z + anchor.offY), world: anchor.world }
  }
  const tile = parseMapId(row.map)
  if (!tile || (tile.area !== 60 && tile.area !== 61)) return null
  const px = tile.block * TILE_WORLD + TILE_WORLD / 2 + row.x + OFFSET_X
  const py = OFFSET_Y - (tile.mapno * TILE_WORLD + TILE_WORLD / 2 + row.z)
  return { point: pct(px, py), world: tile.area === 61 ? 'shadow' : 'overworld' }
}

/**
 * Build the indexed resolver once from the loaded datasets. Indexing 30k MSB rows
 * per render would be wasteful, so callers memoise this (see `useItemSourceResolver`).
 */
export function createItemSourceResolver(data: ItemSourceData): ItemSourceResolver {
  // Per-map affine translation from a projected NPC placement (local x,z -> px,py).
  const anchorByMap = new Map<string, Anchor>()
  const npcByName = new Map<string, NpcPlacement>()
  for (const p of data.anchors) {
    if (typeof p.px === 'number' && typeof p.py === 'number') {
      if (!anchorByMap.has(p.map)) {
        anchorByMap.set(p.map, { offX: p.px - p.x, offY: p.py + p.z, world: asWorld(p.world) })
      }
      const keys = [norm(p.name), norm(p.name.replace(/ · underground$/, ''))]
      for (const k of keys) if (k && !npcByName.has(k)) npcByName.set(k, p)
    } else {
      const k = norm(p.name)
      if (k && !npcByName.has(k)) npcByName.set(k, p)
    }
  }

  const msbById = new Map<string, MsbEnemyRow[]>()
  for (const row of data.msb) {
    const list = msbById.get(row.id)
    if (list) list.push(row)
    else msbById.set(row.id, [row])
  }

  const enemyByItem = new Map<string, EnemyDropRow[]>()
  for (const row of data.enemyDrops) {
    for (const drop of row.drops ?? []) {
      const key = norm(drop.item)
      if (!key) continue
      const list = enemyByItem.get(key)
      if (list) list.push(row)
      else enemyByItem.set(key, [row])
    }
  }

  const shopsByItem = new Map<string, string[]>()
  for (const row of data.shops) {
    const key = norm(row.item)
    if (!key) continue
    const list = shopsByItem.get(key)
    if (list) list.push(row.vendor)
    else shopsByItem.set(key, [row.vendor])
  }

  const bossByDrop = new Map<string, BossDropRow[]>()
  for (const boss of data.bosses) {
    for (const drop of boss.drops ?? []) {
      for (const token of String(drop).split(/,\s*/)) {
        const key = norm(token)
        if (!key) continue
        const list = bossByDrop.get(key)
        if (list) list.push(boss)
        else bossByDrop.set(key, [boss])
      }
    }
  }

  const recipesByName = new Map<string, RecipeRow>()
  for (const r of data.recipes) {
    const key = norm(r.name)
    if (key && !recipesByName.has(key)) recipesByName.set(key, r)
  }

  const acqByName = new Map<string, AcquisitionRow>()
  for (const a of data.acquisitions) {
    const key = norm(a.name)
    if (key && !acqByName.has(key)) acqByName.set(key, a)
  }

  const coordByName = new Map<string, CoordPin>()
  for (const c of data.coords) {
    const key = norm(c.name)
    if (key && !coordByName.has(key)) coordByName.set(key, c)
  }

  /** A coords row whose name is the item's own name (exact, then conservative partial). */
  function pickupByName(name: string): CoordPin | undefined {
    const n = norm(name)
    if (n.length < 3) return undefined
    const exact = coordByName.get(n)
    if (exact) return exact
    for (const [cn, coord] of coordByName) {
      if (Math.min(n.length, cn.length) < 5) continue
      if (cn.includes(n) || n.includes(cn)) return coord
    }
    return undefined
  }

  function vendorTarget(vendor: string): ItemSource {
    const placement =
      npcByName.get(norm(vendor)) ??
      npcByName.get(norm(baseVendor(vendor))) ??
      npcByName.get(norm(vendor.split(' - ')[0]))
    const points: SourcePoint[] =
      placement && typeof placement.px === 'number' && typeof placement.py === 'number'
        ? [pct(placement.px, placement.py)]
        : []
    return {
      kind: 'vendor',
      label: `Sold by ${vendor}`,
      world: placement ? asWorld(placement.world) : 'overworld',
      points,
    }
  }

  function bossTarget(boss: BossDropRow): ItemSource {
    const world = asWorld(boss.map?.world)
    const points: SourcePoint[] = inPlate(boss.map?.x) && inPlate(boss.map?.y)
      ? [{ x: boss.map!.x, y: boss.map!.y }]
      : []
    if (!points.length) {
      const pin = resolveEntityPin(boss.id, data.coords)
      if (pin) points.push({ x: pin.marker.x, y: pin.marker.y })
    }
    return { kind: 'boss', label: `Dropped by ${boss.name}`, world, points, region: boss.region }
  }

  function enemyTargets(itemName: string): ItemSource[] {
    const rows = enemyByItem.get(norm(itemName))
    if (!rows?.length) return []
    const byName = new Map<string, { chance: number; points: SourcePoint[]; world: AtlasWorld }>()
    for (const row of rows) {
      const chance = Math.max(...(row.drops ?? []).filter((d) => norm(d.item) === norm(itemName)).map((d) => d.chance), 0)
      const bucket = byName.get(row.name) ?? { chance, points: [], world: 'overworld' as AtlasWorld }
      bucket.chance = Math.max(bucket.chance, chance)
      for (const spawn of msbById.get(String(row.npcParamId)) ?? []) {
        const projected = projectSpawn(spawn, anchorByMap)
        if (!projected) continue
        bucket.world = projected.world
        const key = `${projected.point.x.toFixed(2)},${projected.point.y.toFixed(2)}`
        if (!bucket.points.some((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}` === key)) {
          bucket.points.push(projected.point)
        }
      }
      byName.set(row.name, bucket)
    }
    const out: ItemSource[] = []
    for (const [name, bucket] of byName) {
      const spawns = bucket.points.length
      const rate = bucket.chance ? ` ${bucket.chance}%` : ''
      const tail = spawns > 1 ? ` · ${spawns} spawns` : spawns === 1 ? ' · 1 spawn' : ''
      out.push({
        kind: 'enemy',
        label: `Dropped by ${name}${rate}${tail}`,
        world: bucket.world,
        points: bucket.points,
      })
    }
    return out.sort((a, b) => b.points.length - a.points.length || a.label.localeCompare(b.label))
  }

  function otherTargets(item: ItemQuery): ItemSource[] {
    const out: ItemSource[] = []
    const recipe = recipesByName.get(norm(item.name))
    if (recipe) {
      const mats = recipe.materials.map((m) => m.name).join(', ')
      out.push({
        kind: 'other',
        label: mats ? `Crafted from ${mats}` : 'Crafted',
        world: asWorld(item.map?.world),
        points: [],
        region: item.region,
      })
    }
    const acq = acqByName.get(norm(item.name))
    if (acq) {
      const text = `${acq.location} ${acq.near ?? ''}`
      if (norm(acq.method) === 'quest') {
        // A quest reward names the giver somewhere in the location text; use the
        // NPC's own placement when it resolves.
        let best: NpcPlacement | undefined
        for (const [key, p] of npcByName) {
          if (key.length < 5 || !norm(text).includes(key)) continue
          if (!best || key.length > norm(best.name).length) best = p
        }
        if (best && typeof best.px === 'number' && typeof best.py === 'number') {
          out.push({
            kind: 'other',
            label: `Reward from ${best.name}`,
            world: asWorld(best.world),
            points: [pct(best.px, best.py)],
            region: item.region,
          })
        }
      }
    }
    return out
  }

  return function resolve(item: ItemQuery): ItemSource[] {
    const sources: ItemSource[] = []

    // 1 — pickup: the existing grounded lookup (coords row / loot grace / percent map).
    const pickupPoints: SourcePoint[] = []
    let pickupWorld: AtlasWorld = asWorld(item.map?.world)
    if (inPlate(item.map?.x) && inPlate(item.map?.y)) {
      pickupPoints.push({ x: item.map!.x, y: item.map!.y })
    }
    const pin = resolveEntityPin(item.id, data.coords)
    if (pin) {
      if (!pickupPoints.length) pickupWorld = pin.world
      if (!pickupPoints.some((p) => p.x === pin.marker.x && p.y === pin.marker.y)) {
        pickupPoints.push({ x: pin.marker.x, y: pin.marker.y })
      }
    }
    // The entity index names many items the authored catalog does not, so also
    // match the coordinate plane by the item's own name.
    if (!pickupPoints.length) {
      const coord = pickupByName(item.name)
      if (coord && inPlate(coord.x) && inPlate(coord.y)) {
        pickupWorld = asWorld(coord.world)
        pickupPoints.push({ x: coord.x, y: coord.y })
      }
    }
    if (pickupPoints.length) {
      sources.push({ kind: 'pickup', label: 'Found in the world', world: pickupWorld, points: pickupPoints, region: item.region })
    }

    // 2 — boss drops (incl. remembrances).
    for (const boss of bossByDrop.get(norm(item.name)) ?? []) sources.push(bossTarget(boss))

    // 3 — vendor stock.
    const vendors = [...new Set(shopsByItem.get(norm(item.name)) ?? [])]
    for (const vendor of vendors) sources.push(vendorTarget(vendor))

    // 4 — enemy drops.
    sources.push(...enemyTargets(item.name))

    // 5 — other (quest/craft/how-to).
    sources.push(...otherTargets(item))

    return sources
  }
}

/** The menu line shown when a target has no grounded point. */
export function sourceHowTo(item: ItemQuery, sources: ItemSource[]): string {
  const withPoints = sources.find((s) => s.points.length > 0)
  if (withPoints) return withPoints.label
  const other = sources.find((s) => s.kind === 'other')
  if (other) return other.label
  return item.how?.trim() || ''
}

// ---------------------------------------------------------------------------
// Runtime loaders
// ---------------------------------------------------------------------------

type RawDoc<T> = T
let dataCache: ItemSourceData | null = null
let loading: Promise<ItemSourceData> | null = null

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return (await r.json()) as T
}

/** Fetch every source dataset once and cache it for the session. */
export function loadItemSourceData(): Promise<ItemSourceData> {
  if (dataCache) return Promise.resolve(dataCache)
  if (loading) return loading
  loading = Promise.all([
    fetchJson<RawDoc<CoordPin[]>>('/sourced/open/coords.json').catch(() => [] as CoordPin[]),
    fetchJson<RawDoc<CoordPin[]>>('/sourced/open/boss-pins.json').catch(() => [] as CoordPin[]),
    fetchJson<RawDoc<{ placements?: NpcPlacement[] }>>('/sourced/npc-placements.json').catch(() => ({})),
    fetchJson<RawDoc<{ rows?: EnemyDropRow[] }>>('/sourced/open/enemy-drops.json').catch(() => ({})),
    fetchJson<RawDoc<MsbEnemyRow[]>>('/sourced/open/msb-enemies.json').catch(() => [] as MsbEnemyRow[]),
    fetchJson<RawDoc<ShopRow[]>>('/sourced/open/shops.json').catch(() => [] as ShopRow[]),
    fetchJson<RawDoc<{ rows?: AcquisitionRow[] }>>('/sourced/open/acquisition.json').catch(() => ({})),
    fetchJson<RawDoc<{ recipes?: RecipeRow[] }>>('/sourced/open/recipes.json').catch(() => ({})),
  ]).then(([coords, bossPins, npcDoc, dropDoc, msb, shops, acqDoc, recipeDoc]) => {
    dataCache = {
      coords: [...coords, ...bossPins],
      anchors: (npcDoc as { placements?: NpcPlacement[] }).placements ?? [],
      msb,
      enemyDrops: (dropDoc as { rows?: EnemyDropRow[] }).rows ?? [],
      shops,
      bosses: [],
      acquisitions: (acqDoc as { rows?: AcquisitionRow[] }).rows ?? [],
      recipes: (recipeDoc as { recipes?: RecipeRow[] }).recipes ?? [],
    }
    return dataCache
  })
  return loading
}

/** Test seam. */
export function clearItemSourceData(): void {
  dataCache = null
  loading = null
}

/**
 * React hook: the indexed resolver once every dataset has settled, or null while
 * loading. `bosses` is supplied by the caller from the shared entity index so the
 * resolver can answer boss-drop questions without a second fetch of that file.
 */
export function useItemSourceResolver(bosses: BossDropRow[]): ItemSourceResolver | null {
  const [data, setData] = useState<ItemSourceData | null>(dataCache)
  useEffect(() => {
    if (dataCache) return
    let cancelled = false
    void loadItemSourceData().then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return useMemo(() => (data ? createItemSourceResolver({ ...data, bosses }) : null), [data, bosses])
}
