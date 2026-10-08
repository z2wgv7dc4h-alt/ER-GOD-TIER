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
  /** Master-image pixel from the engine affine; percent = px / 10496 * 100. */
  px?: number
  py?: number
  /** Task 128: SotE-underground areas are pinned to M10 (shadow), badged. */
  world?: 'overworld' | 'underground' | 'shadow'
}
export type NpcPlacements = { source: string; placements: NpcPlacement[] }

/** Task 183 §1 — a placement projected into the shared coordinator plane. */
export type NpcPin = {
  id: string
  name: string
  kind: 'npc'
  world: 'overworld' | 'underground' | 'shadow'
  x: number
  y: number
  map: string
}

const MOSAIC = 10496

function norm(s: string): string {
  return s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()
}

/** The person's name with the SotE-underground badge stripped (Task 128). */
export function baseNpcName(name: string): string {
  return name.replace(/ · underground$/, '')
}

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
  const hits = placementsForName(name, rows)
  return { count: hits.length, maps: [...new Set(hits.map((h) => h.map))].sort() }
}

/**
 * The placements that belong to one NPC page. Exact name first (the MSB name
 * matches the catalogue name for most talkers); otherwise a conservative
 * partial match so task-128's "… · underground" variants still resolve. The
 * length floor stops a two-letter NPC ("D") matching every page.
 */
export function placementsForName(name: string, rows: NpcPlacement[]): NpcPlacement[] {
  const n = norm(baseNpcName(name))
  if (!n) return []
  const exact = rows.filter((p) => norm(baseNpcName(p.name)) === n)
  if (exact.length) return exact
  if (n.length < 5) return []
  return rows.filter((p) => {
    const pn = norm(baseNpcName(p.name))
    return Math.min(n.length, pn.length) >= 5 && (pn.includes(n) || n.includes(pn))
  })
}

/**
 * One map pin per NPC per world, projected from the raw part position into the
 * engine mosaic frame (percent = px / 10496). This is the only projection
 * `coords.ts` needs: the placement already carries the engine `px/py`, so NPCs
 * join the same plate frame as graces and bosses without a third transform.
 */
export function npcCoordPins(rows: NpcPlacement[]): NpcPin[] {
  const seen = new Set<string>()
  const out: NpcPin[] = []
  for (const p of rows) {
    if (typeof p.px !== 'number' || typeof p.py !== 'number') continue
    const world = p.world === 'shadow' || p.world === 'underground' ? p.world : 'overworld'
    const name = baseNpcName(p.name)
    const key = `${norm(name)}|${world}`
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push({
      id: `npc:${p.npc}:${p.map}:${Math.round(p.x)}:${Math.round(p.z)}`,
      name,
      kind: 'npc',
      world,
      x: Math.round((p.px / MOSAIC) * 10000) / 100,
      y: Math.round((p.py / MOSAIC) * 10000) / 100,
      map: p.map,
    })
  }
  return out
}
