import { useSyncExternalStore } from 'react'
import type { AtlasWorld } from '../knowledge/graces'
import type { CoordPin } from '../lib/coords'
import { labelOf } from '../lib/links'
import type { MapMarker } from '../types'
import { resolveEntityPin } from './pins'

/**
 * Task 111 §1 — temporary "result" pins.
 *
 * Opening any entity (a Library/Search/Gideon hit, an entity link) records a
 * small, non-persisted pointer here. The Atlas resolves it to a plate position
 * lazily (coords load after the store is written) and draws it with a pulse, so
 * an answer with a location is one tap from the map. It is deliberately an
 * external store, not vault state: results are a session artifact, not progress.
 */
export type ResultPin = {
  /** The entity/fact this result points at. */
  factId: string
  /** Display label, captured at open time so it survives a data change. */
  label: string
  at: number
}

const MAX = 12
const EMPTY: ResultPin[] = []
let pins: ResultPin[] = EMPTY

const listeners = new Set<() => void>()
function emit() {
  for (const l of listeners) l()
}

export function getResultPins(): ResultPin[] {
  return pins
}

export function recordResultPin(input: { factId: string; label?: string; at?: number }): void {
  const factId = input.factId
  if (!factId) return
  if (pins[0]?.factId === factId) return
  const next: ResultPin = { factId, label: input.label ?? labelOf(factId), at: input.at ?? Date.now() }
  pins = [next, ...pins.filter((p) => p.factId !== factId)].slice(0, MAX)
  emit()
}

export function clearResultPins(): void {
  if (pins === EMPTY) return
  pins = EMPTY
  emit()
}

export function subscribeResultPins(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useResultPins(): ResultPin[] {
  return useSyncExternalStore(subscribeResultPins, getResultPins, getResultPins)
}

/** Resolve the stored pointers to plate markers for one world, newest first. */
export function resultMarkers(results: ResultPin[], coords: CoordPin[], world?: AtlasWorld): MapMarker[] {
  const out: MapMarker[] = []
  const seen = new Set<string>()
  for (const r of results) {
    const resolved = resolveEntityPin(r.factId, coords)
    if (!resolved) continue
    if (world && resolved.world !== world) continue
    if (seen.has(r.factId)) continue
    seen.add(r.factId)
    // Keep the opened entity id as the marker id, so the "Show on map" action
    // (which sets exactly that id as the selection) centres on this pin.
    out.push({ ...resolved.marker, id: r.factId, name: r.label || resolved.marker.name })
  }
  return out
}
