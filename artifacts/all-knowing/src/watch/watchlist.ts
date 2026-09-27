import { markers } from '../data/seed'
import type { CoordPin } from '../lib/coords'
import { canonicalEntityId } from '../lib/entityGraph'
import type { Character } from '../types'

/**
 * Task 112 §3 — the Watchlist.
 *
 * Stars live in `character.answers.watch` so they are per-Tarnished and ride
 * along in the existing packet/vault without a schema change. Any entity can be
 * starred; `watchPins()` is the small bridge Task 111's map can consume later.
 */

const WATCH_KEY = 'watch'

export function watchIds(character: Character): string[] {
  const raw = character.answers[WATCH_KEY]
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const entry of raw) {
    if (typeof entry === 'string' && entry && !out.includes(entry)) out.push(entry)
  }
  return out
}

export function isWatched(character: Character, id: string): boolean {
  const canonical = canonicalEntityId(id)
  return watchIds(character).some((w) => w === id || w === canonical || canonicalEntityId(w) === canonical)
}

/** Star or unstar an entity, returning the next character (never mutates). */
export function toggleWatch(character: Character, id: string, name?: string): Character {
  const canonical = canonicalEntityId(id, name)
  const list = watchIds(character)
  const tracked = list.some((w) => w === canonical || w === id || canonicalEntityId(w) === canonical)
  const next = tracked
    ? list.filter((w) => !(w === canonical || w === id || canonicalEntityId(w) === canonical))
    : [...list, canonical]
  return { ...character, answers: { ...character.answers, [WATCH_KEY]: next } }
}

export type WatchPin = {
  id: string
  name: string
  x: number
  y: number
  region?: string
}

/**
 * Starred entities that have a map position. `coords` is the caller's already
 * loaded coord set (the Atlas / `useCoords`); the seed markers fill the base-game
 * gaps. Exposed for the Task 111 map layer.
 */
export function watchPins(character: Character, coords: CoordPin[] = []): WatchPin[] {
  const wanted = watchIds(character)
  if (!wanted.length) return []
  const byCoord = new Map<string, CoordPin>()
  for (const c of coords) byCoord.set(c.id, c)
  const bySeed = new Map(markers.map((m) => [m.id, m]))
  const out: WatchPin[] = []
  const seen = new Set<string>()
  for (const raw of wanted) {
    const canonical = canonicalEntityId(raw)
    const coord = byCoord.get(raw) ?? byCoord.get(canonical)
    if (coord) {
      if (seen.has(coord.id)) continue
      seen.add(coord.id)
      out.push({ id: coord.id, name: coord.name, x: coord.x, y: coord.y })
      continue
    }
    const seed = bySeed.get(raw) ?? bySeed.get(canonical)
    if (seed) {
      if (seen.has(seed.id)) continue
      seen.add(seed.id)
      out.push({ id: seed.id, name: seed.name, x: seed.x, y: seed.y, region: seed.region })
    }
  }
  return out
}
