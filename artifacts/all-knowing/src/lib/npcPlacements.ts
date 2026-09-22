/**
 * Where each talking NPC stands, from the map MSBs
 * (`scripts/extract-npc-placements.py`). Enemy spawns are excluded — only the
 * 95 NPCs with dialogue are kept (1,370 placements). Positions are the part's
 * raw local position.
 */
export type NpcPlacement = {
  npc: number
  name: string
  map: string
  x: number
  y: number
  z: number
}
export type NpcPlacements = { source: string; placements: NpcPlacement[] }

let cache: NpcPlacements | null = null

export async function loadNpcPlacements(): Promise<NpcPlacements> {
  if (cache) return cache
  const r = await fetch('/sourced/npc-placements.json')
  if (!r.ok) throw new Error('npc placements ' + r.status)
  cache = (await r.json()) as NpcPlacements
  return cache
}

export function matchNpcPlacements(query: string, rows: NpcPlacement[], limit = 20): NpcPlacement[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((p) => p.name.toLowerCase().includes(q)).slice(0, limit)
}

/** Placement count + distinct maps for one NPC name (for a compact summary). */
export function placementSummary(rows: NpcPlacement[], name: string): { count: number; maps: string[] } {
  const hits = rows.filter((p) => p.name === name)
  return { count: hits.length, maps: [...new Set(hits.map((h) => h.map))].sort() }
}
