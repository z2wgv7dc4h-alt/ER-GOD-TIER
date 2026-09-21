import type { Character, StartingClass, Stats } from '../types'
import { emptyStats } from '../data/seed'
import { canonicalFactId } from './aliases'

/** Dev: Vite proxies /er-map → :8099. Prod: talk to the map server directly. */
export const MAP_ENGINE_BASE =
  import.meta.env.VITE_MAP_ENGINE ??
  (import.meta.env.DEV ? '/er-map' : 'http://127.0.0.1:8099')

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

export function subscribeEngine(onState: (s: EngineState) => void, onStatus: (s: EngineStatus) => void) {
  onStatus('connecting')
  const es = new EventSource(`${MAP_ENGINE_BASE}/api/events`)
  es.addEventListener('state', (ev) => {
    onStatus('live')
    onState(JSON.parse((ev as MessageEvent).data))
  })
  es.onerror = () => onStatus('offline')
  return () => es.close()
}
