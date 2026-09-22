import { useEffect, useMemo, useState } from 'react'
import type { MapMarker, MarkerKind } from '../types'
import type { AtlasWorld } from '../knowledge/graces'
import { loadEldenringMap, type EldenringMap } from './packs'

/**
 * EldenRingMap markers as static-plate pins. The pack's coordinates are in the
 * engine mosaic frame (`px`), the same one `graces.ts` stores as percent, so the
 * conversion is `px / 10496 * 100` — pins land on the Pack 960 plates. Only the
 * marker kinds the pack adds (dungeons, merchants, night bosses, collectibles)
 * are emitted; graces already come from `warpGraces`/`coords.json`.
 */
const MOSAIC = 10496
const toPct = (px: number) => (px / MOSAIC) * 100

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function push(out: MapMarker[], world: AtlasWorld, m: {
  id: string
  name: string
  kind: MarkerKind
  region: string
  world: string
  x: number
  y: number
  note?: string
}): void {
  if (m.world !== world) return
  out.push({
    id: m.id,
    name: m.name,
    kind: m.kind,
    region: m.region || m.world,
    campaign: m.world === 'shadow' ? 'sote' : 'base',
    x: toPct(m.x),
    y: toPct(m.y),
    note: m.note || 'EldenRingMap pack',
  })
}

export function eldenringMapPins(doc: EldenringMap, world: AtlasWorld): MapMarker[] {
  const out: MapMarker[] = []
  for (const d of doc.dungeons) {
    push(out, world, { id: `erm:dungeon:${slug(d.name)}`, name: d.name, kind: 'dungeon', region: d.region, world: d.world, x: d.x, y: d.y })
  }
  for (const [i, m] of doc.merchants.entries()) {
    push(out, world, { id: `erm:merchant:${slug(m.name)}:${i}`, name: m.name, kind: 'npc', region: m.region, world: m.world, x: m.x, y: m.y })
  }
  const collectibleKinds: Record<string, MarkerKind> = {
    golden_seed: 'item',
    sacred_tear: 'item',
    scadutree: 'fragment',
    rspirit_ash: 'spirit-ash',
  }
  for (const [key, rows] of Object.entries(doc.collectibles)) {
    const kind = collectibleKinds[key] ?? 'item'
    for (const c of rows) {
      push(out, world, { id: `erm:${key}:${c.id}`, name: c.name, kind, region: '', world: c.world, x: c.x, y: c.y, note: c.note })
    }
  }
  // Night bosses carry no layer in the pack; they are all overworld.
  for (const [i, b] of doc.nightBosses.entries()) {
    push(out, world, { id: `erm:nightboss:${i}`, name: b.category.replace(/_/g, ' '), kind: 'boss', region: '', world: 'overworld', x: b.x, y: b.y })
  }
  return out
}

/** Loads the pack once and returns its pins for `world`. */
export function useEldenringMapPins(world: AtlasWorld): MapMarker[] {
  const [doc, setDoc] = useState<EldenringMap | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadEldenringMap()
      .then((d) => { if (!cancelled) setDoc(d) })
      .catch(() => { /* pack absent: no extra pins */ })
    return () => { cancelled = true }
  }, [])
  return useMemo(() => (doc ? eldenringMapPins(doc, world) : []), [doc, world])
}
