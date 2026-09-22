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
 *
 * NOT MAP-COMPLETE until an item field exists (Task 62). These are placement
 * records, not item locations: they are never drawn as Atlas pins and Gideon
 * never answers "where is X" from this dump. The Codex may list them, labelled
 * as unverified placement / model code only. Do not invent material names for
 * AEG codes, and do not delete the dump.
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
 * Infer world (overworld/underground/ashen/shadow) from the MSB `area` number
 * (this dump's `area` field is the game's own map-id prefix, e.g. area 60 rows
 * all carry `map: "m60_BB_CC_00"`).
 *
 * Only two mappings are actually confirmed, cross-checked against this repo's
 * own `boss-xyz.json`/`grace-xyz.json` world-tile grid (`ARCHITECTURE.md`
 * "Goblins XYZ × m60/m61 grid"): `m60_*` is the continuous Lands Between
 * overworld grid (274 distinct sub-map tiles in this dump — consistent with
 * "the whole open world"), `m61_*` is the Realm of Shadow DLC's equivalent
 * grid (126 tiles). An earlier pass at this heuristic guessed `m60` was
 * "Ashen Capital" and lumped every other legacy-dungeon area into "overworld"
 * — both wrong, confirmed by checking the actual per-area map-id counts
 * against the architecture this repo already established elsewhere.
 *
 * Every other area id (10-19, 20-22, 28, 30-43 — Stormveil, Leyndell,
 * catacombs, Siofra/Ainsel/Nokron/Deeproot, and other legacy dungeons/
 * interiors) genuinely is not the open overworld, but this repo has no
 * verified per-area name table to sort them individually into "underground"
 * vs. a true fourth bucket, and `AtlasWorld` has no "legacy dungeon" option.
 * Bucketing them as `underground` is the closer of the two remaining options
 * (enclosed, not open-world) but is NOT independently verified the way 60/61
 * are — do not present it as more precise than that. No area is ever labeled
 * `ashen`: nothing in this dump distinguishes Ashen Capital's map id from
 * living Leyndell's, so that specific claim would be a guess, not a finding.
 */
function areaToWorld(area: number): AtlasWorld {
  if (area === 60) return 'overworld'
  if (area === 61) return 'shadow'
  return 'underground'
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
