import type { Character, Stats } from '../types'
import { emptyStats } from '../data/seed'
import { canonicalFactId } from './aliases'
import { REGULATION_STAMP } from './regulation'

/**
 * Task 159: the engine now ships as static app assets under `/engine` in every
 * build (see `scripts/build-engine.mjs`). Dev, preview and the installed PWA all
 * load it from the same origin, so it works on the phone with no PC process.
 * `VITE_MAP_ENGINE` is the escape hatch for an external engine (e.g. a running
 * save reader on `http://127.0.0.1:8099`).
 */
export const MAP_ENGINE_BASE = import.meta.env.VITE_MAP_ENGINE ?? '/engine'

/**
 * The tiled map's own manifest. It only exists once the engine's tiles were
 * extracted and shipped, so it is the honest "the live map can actually draw"
 * signal — an engine shell without tiles would render a blank canvas, and the
 * static plate is the better fallback.
 */
export const ENGINE_PROBE_PATH = '/tiles/manifest.json'

export type EngineMarker = {
  id: string
  category?: string
  name?: string
  names?: { en?: string; ru?: string }
  flag?: number
  flags?: number[]
  master?: string
  px?: number
  py?: number
  height?: number
  tip?: { text?: string }
}

export type EngineCharacter = {
  slot: number
  name: string
  level: number
  secondsPlayed?: number
  ok: boolean
  stats?: Partial<Stats> & { level?: number; name?: string; deaths?: number; runes?: number }
  position?: unknown
  mapPixel?: { px: number; py: number; master?: string } | null
  deaths?: number | null
  lastRestedGrace?: number | null
  found: string[]
}

export type EngineState = {
  savePath: string
  characters: EngineCharacter[]
  activeSlot?: number | null
  markerCount: number
  live?: { enabled: boolean; status: string }
  newlyFound?: { slot: number; ids: string[] }[]
  at: number
}

export type EngineStatus = 'offline' | 'connecting' | 'live'

/**
 * Honest, non-alarming copy for the engine state. Offline is the normal state on a
 * phone (the Atlas draws the static plates), so it is never worded as an error.
 * Live-memory is only surfaced when the API actually reports it enabled.
 */
export type EngineBanner = {
  tone: 'ok' | 'idle'
  label: string
  detail: string
  liveMemory: boolean
}

export function engineBanner(status: EngineStatus, state: EngineState | null): EngineBanner {
  const liveMemory = state?.live?.enabled === true
  if (status === 'live') {
    return {
      tone: 'ok',
      label: 'Map engine · connected',
      detail: liveMemory
        ? 'reading ER0000.sl2 and the live player position (read-only, offline only)'
        : 'the live map files are installed; the PC save reader adds the live player dot',
      liveMemory,
    }
  }
  if (status === 'connecting') {
    return {
      tone: 'idle',
      label: 'Map engine · connecting',
      detail: 'looking for the installed map files',
      liveMemory,
    }
  }
  return {
    tone: 'idle',
    label: 'Offline — using static plates',
    detail: 'the live map files are not installed in this build — showing the saved map plates',
    liveMemory,
  }
}

/** Compact rail text for the same state. */
export function engineChipLabel(status: EngineStatus): string {
  if (status === 'live') return 'engine live'
  if (status === 'connecting') return 'engine…'
  return 'plates'
}

export function markerName(m: EngineMarker) {
  return m.names?.en || m.name || m.id
}

export function markerKind(id: string, category?: string) {
  if (id.startsWith('grace:') || category === 'grace') return 'grace' as const
  if (id.startsWith('boss:') || category === 'boss') return 'boss' as const
  if (category === 'scadutree_fragments') return 'fragment' as const
  if (category === 'spirits') return 'spirit-ash' as const
  if (category === 'poi' || category === 'landmark') return 'dungeon' as const
  return 'item' as const
}

export function characterFromEngine(c: EngineCharacter, savePath: string): Character {
  const s = c.stats || {}
  const stats: Stats = {
    vigor: s.vigor ?? emptyStats.vigor,
    mind: s.mind ?? emptyStats.mind,
    endurance: s.endurance ?? emptyStats.endurance,
    strength: s.strength ?? emptyStats.strength,
    dexterity: s.dexterity ?? emptyStats.dexterity,
    intelligence: s.intelligence ?? emptyStats.intelligence,
    faith: s.faith ?? emptyStats.faith,
    arcane: s.arcane ?? emptyStats.arcane,
  }
  const found = (c.found || []).map((id) => canonicalFactId(id))
  return {
    source: 'save',
    platform: 'pc',
    regulation: REGULATION_STAMP,
    fileName: savePath.split(/[/\\]/).pop(),
    name: s.name || c.name,
    level: s.level || c.level,
    startingClass: 'unknown',
    stats,
    loadout: [],
    defeatedBosses: found.filter((id) => id.startsWith('boss:')),
    discoveredGraces: found.filter((id) => id.startsWith('grace:')),
    collectedItems: found.filter((id) => !id.startsWith('boss:') && !id.startsWith('grace:')),
    completedQuestSteps: [],
    deniedFacts: [],
    answers: { platform: 'pc' },
    evidence: [{
      id: `save:${savePath}:${c.slot}`,
      fact: `${found.length} flags from live save`,
      source: 'save',
      confidence: 1,
      at: Date.now(),
    }],
    shots: [],
  }
}

export function shownEngineCharacter(state: EngineState): EngineCharacter | null {
  return state.characters.find((c) => c.slot === state.activeSlot) || state.characters[0] || null
}

export async function fetchEngineState(): Promise<EngineState> {
  const res = await fetch(`${MAP_ENGINE_BASE}/api/state`)
  if (!res.ok) throw new Error(`map engine ${res.status}`)
  return res.json()
}

export async function fetchEngineMarkers(): Promise<EngineMarker[]> {
  const res = await fetch(`${MAP_ENGINE_BASE}/api/markers`)
  if (!res.ok) throw new Error(`map engine ${res.status}`)
  const doc = await res.json()
  return doc.markers || []
}

/** Does the engine's static tree load (tiles manifest reachable)? */
export async function probeEngine(): Promise<boolean> {
  if (typeof fetch !== 'function') return false
  try {
    const res = await fetch(`${MAP_ENGINE_BASE}${ENGINE_PROBE_PATH}`)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Task 159 status rule. The engine is *live* as soon as its files load, whether
 * that is the shipped static assets or a running PC save reader. The SSE stream
 * only adds save-derived state and the live player dot; its absence must not
 * downgrade an engine whose files are present. Before the probe answers we are
 * still `connecting`; only a failed probe with no SSE leaves us on the plates.
 */
export function resolveEngineStatus(opts: {
  probed: boolean
  staticUp: boolean
  sseUp: boolean
}): EngineStatus {
  if (opts.staticUp || opts.sseUp) return 'live'
  return opts.probed ? 'offline' : 'connecting'
}

export function subscribeEngine(onState: (s: EngineState) => void, onStatus: (s: EngineStatus) => void) {
  let staticUp = false
  let sseUp = false
  let probed = false
  let closed = false
  const emit = () => {
    if (!closed) onStatus(resolveEngineStatus({ probed, staticUp, sseUp }))
  }
  onStatus('connecting')
  // The engine ships as app assets, so "are the files there?" is the primary
  // signal. It is independent of the (optional, PC-only) save reader.
  void probeEngine().then((ok) => {
    if (closed) return
    staticUp = ok
    probed = true
    emit()
  })
  let es: EventSource | null = null
  // Defer opening the stream by one task. React StrictMode runs every effect
  // twice in development; opening synchronously meant the throwaway first mount
  // closed an EventSource still connecting, which the browser logged as an
  // aborted `/engine/api/events` request. Deferring never opens it at all.
  const timer = setTimeout(() => {
    if (closed) return
    es = new EventSource(`${MAP_ENGINE_BASE}/api/events`)
    es.addEventListener('state', (ev) => {
      sseUp = true
      emit()
      try {
        onState(JSON.parse((ev as MessageEvent).data))
      } catch {
        /* ignore a malformed frame */
      }
    })
    // A failed stream only removes the live save state; `emit()` keeps `live`
    // while the engine's files are reachable.
    es.onerror = () => {
      sseUp = false
      emit()
    }
  }, 0)
  return () => {
    closed = true
    clearTimeout(timer)
    // Explicit close on unmount so the in-flight request is not aborted.
    es?.close()
    es = null
  }
}
