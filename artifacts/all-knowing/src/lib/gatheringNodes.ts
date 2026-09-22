/**
 * Gathering node facts from the open `gathering-nodes.json` dump (Goblins
 * `all_gathering_nodes_final.json` — ~21.8k AEG asset placements).
 *
 * A gathering node fact is one placement: "this gathering-node asset at this
 * world position". It is deliberately not named — the dump has no item/material
 * field, only the model code (e.g. AEG099_821) and the instance placement. The
 * human-readable `region` comes from the nearest named point in the existing
 * `grace-xyz.json` world-position index, the same way `chestFacts.ts` labels
 * chests.
 */
import { useEffect, useState } from 'react'
import type { AtlasWorld } from '../knowledge/graces'

export type GatheringNode = {
  /** `node:<area>_<instanceId>` — unique per placement. */
  id: string
  model: string
  area: number
  map: string
  x: number
  y: number
  z: number
  /** Nearest named region from the grace world-position index, or ''. */
  region: string
  world: AtlasWorld
  /** Entity/instance IDs from the source dump. */
  entityId: number
  instanceId: number
}

export type GraceRegion = {
  areaNo: number
  x: number
  y: number
  z: number
  region: string
}

/**
 * Infer world (overworld/underground/ashen/shadow) from area number.
 * Heuristic based on Elden Ring geography:
 * - 10-19, 30-59: overworld (base game)
 * - 20-29, 35: underground (Siofra, Ainsel, Nokron, Deeproot + DLC cave areas)
 * - 60: ashen capital
 * - 61: shadow realm (DLC)
 */
function areaToWorld(area: number): AtlasWorld {
  if (area === 60) return 'ashen'
  if (area === 61) return 'shadow'
  if ((area >= 20 && area <= 29) || area === 35) return 'underground'
  return 'overworld'
}

export function nearestRegion(regionsByArea: Map<number, GraceRegion[]>, area: number, x: number, y: number, z: number): string {
  const points = regionsByArea.get(area)
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
 * Group gathering-node rows into queryable facts, one per placement.
 * Rows are distinct placements; no deduping needed. Each gets a world
 * assignment and nearest-region label.
 */
export function buildGatheringNodes(rows: any[], regions: GraceRegion[]): GatheringNode[] {
  const regionsByArea = new Map<number, GraceRegion[]>()
  for (const r of regions) {
    if (!r.region) continue
    const list = regionsByArea.get(r.areaNo)
    if (list) list.push(r)
    else regionsByArea.set(r.areaNo, [r])
  }

  const out: GatheringNode[] = []
  for (const row of rows) {
    if (!row.area || !row.map) continue
    const area = row.area ?? 0
    const world = areaToWorld(area)
    out.push({
      id: `node:${area}_${row.instance_id ?? row.instanceId ?? 0}`,
      model: row.model ?? '',
      area,
      map: row.map ?? '',
      x: row.x ?? 0,
      y: row.y ?? 0,
      z: row.z ?? 0,
      region: nearestRegion(regionsByArea, area, row.x ?? 0, row.y ?? 0, row.z ?? 0),
      world,
      entityId: row.entity_id ?? 0,
      instanceId: row.instance_id ?? 0,
    })
  }
  out.sort((a, b) => a.world.localeCompare(b.world) || a.region.localeCompare(b.region) || a.area - b.area)
  return out
}

export function matchGatheringNodes(text: string, nodes: GatheringNode[], limit = 12): GatheringNode[] {
  const n = text.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (n.length < 3) return []
  const hits: GatheringNode[] = []
  for (const node of nodes) {
    if (node.region.toLowerCase().includes(n) || node.map.toLowerCase().includes(n) || node.model.toLowerCase().includes(n)) {
      hits.push(node)
      if (hits.length >= limit) break
    }
  }
  return hits
}

let nodesCache: GatheringNode[] | null = null
let regionsCache: GraceRegion[] | null = null

export async function loadGatheringNodes(): Promise<GatheringNode[]> {
  if (nodesCache) return nodesCache

  if (!regionsCache) {
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
  }

  const res = await fetch('/sourced/open/gathering-nodes.json')
  if (!res.ok) throw new Error(`gathering nodes unavailable (${res.status})`)
  const rows = (await res.json()) as any[]
  nodesCache = buildGatheringNodes(rows, regionsCache)
  return nodesCache
}

export function useGatheringNodes(): GatheringNode[] {
  const [nodes, setNodes] = useState<GatheringNode[]>(nodesCache ?? [])
  useEffect(() => {
    if (nodesCache) return
    let cancelled = false
    void loadGatheringNodes()
      .then((rows) => {
        if (!cancelled) setNodes(rows)
      })
      .catch(() => {
        /* no gathering nodes; facts still carry map + XYZ */
      })
    return () => {
      cancelled = true
    }
  }, [])
  return nodes
}
