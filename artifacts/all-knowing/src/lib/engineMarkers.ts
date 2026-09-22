import { useEffect, useMemo, useState } from 'react'
import type { MapMarker, MarkerKind } from '../types'
import type { AtlasWorld } from '../knowledge/graces'

/**
 * The map engine's own named data (`scripts/export-engine-markers.mjs`) — the
 * canonical source, since the user's "EldenRingMap" Nexus pack is the same
 * project and fully subsumed by it. Gives the app offline/phone access to the
 * engine's markers + named item pickups (with nearest grace) without the server.
 */
export type EngineMarker = { id: string; name: string; cat: string; master: string; px: number; py: number }
export type EngineItem = { id: string; name: string; cat: string; map: string; px: number; py: number; near: string }
export type EngineMarkersDoc = {
  source: string
  graces: { name: string; px: number; py: number }[]
  markers: EngineMarker[]
  items: EngineItem[]
}

let cache: EngineMarkersDoc | null = null

export async function loadEngineMarkers(): Promise<EngineMarkersDoc> {
  if (cache) return cache
  const r = await fetch('/sourced/open/engine-markers.json')
  if (!r.ok) throw new Error('engine markers ' + r.status)
  cache = (await r.json()) as EngineMarkersDoc
  return cache
}

export function matchEngineItems(query: string, rows: EngineItem[], limit = 12): EngineItem[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((r) => `${r.name} ${r.near}`.toLowerCase().includes(q)).slice(0, limit)
}

const MOSAIC = 10496
const WORLD_BY_MASTER: Record<string, AtlasWorld> = { M00: 'overworld', M01: 'underground', M10: 'shadow' }
const KIND: Record<string, MarkerKind> = {
  grace: 'grace',
  boss: 'boss',
  poi: 'item',
  landmark: 'dungeon',
  fragment: 'fragment',
}

/** The engine's graces/bosses/landmarks/poi as static-plate pins for a world. */
export function enginePins(doc: EngineMarkersDoc, world: AtlasWorld): MapMarker[] {
  const out: MapMarker[] = []
  for (const m of doc.markers) {
    if (WORLD_BY_MASTER[m.master] !== world) continue
    const kind = KIND[m.cat] ?? 'item'
    out.push({
      id: `engine:${m.id}`,
      name: m.name,
      kind,
      region: m.master,
      campaign: m.master === 'M10' ? 'sote' : 'base',
      x: (m.px / MOSAIC) * 100,
      y: (m.py / MOSAIC) * 100,
      note: 'engine marker',
    })
  }
  return out
}

export function useEnginePins(world: AtlasWorld): MapMarker[] {
  const [doc, setDoc] = useState<EngineMarkersDoc | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadEngineMarkers()
      .then((d) => { if (!cancelled) setDoc(d) })
      .catch(() => { /* engine data absent: no extra pins */ })
    return () => { cancelled = true }
  }, [])
  return useMemo(() => (doc ? enginePins(doc, world) : []), [doc, world])
}
