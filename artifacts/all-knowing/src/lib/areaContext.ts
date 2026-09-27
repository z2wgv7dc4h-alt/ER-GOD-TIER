import { byId, type Fact } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { canonicalFactId, allWarpRows } from './aliases'
import type { Character } from '../types'

/**
 * Task 98 — the global "current area" context.
 *
 * `currentArea` is one small record the whole app shares: which region the
 * player is standing in right now. It is derived from the most recent of four
 * signals (`docs/tasks/98-area-hub-context.md`):
 *
 *   engine  — the live PC map engine's last rested grace (authoritative, moves often)
 *   map     — a region the player picked (the header picker / map)
 *   grace   — the last discovered site of grace
 *   fact    — the last logged fact that carries a location
 *
 * Recency wins; on a tie the source rank above breaks it. Nothing here invents a
 * region: a signal only exists when in-repo data maps a real id to a real region.
 */

export type AreaSource = 'engine' | 'map' | 'grace' | 'fact'

export type AreaSignal = {
  /** Region label, exactly as the catalog/grace/loot data spells it. */
  region: string
  /** A finer place inside the region (a grace name), when one is known. */
  place?: string
  /** The grace or fact this signal came from, so the UI can link back. */
  factId?: string
  source: AreaSource
  /** Epoch ms the signal was observed. */
  at: number
}

export type CurrentArea = AreaSignal

/** Tie-break order when two signals share a timestamp (higher wins). */
export const AREA_SOURCE_RANK: Record<AreaSource, number> = {
  engine: 3,
  map: 2,
  grace: 1,
  fact: 0,
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

/** The picked/observed signal that should be the current area, or null. */
export function deriveCurrentArea(signals: (AreaSignal | null | undefined)[]): CurrentArea | null {
  const list = signals.filter((s): s is AreaSignal => Boolean(s && s.region && norm(s.region)))
  if (!list.length) return null
  return list.reduce((best, s) => {
    if (s.at !== best.at) return s.at > best.at ? s : best
    return AREA_SOURCE_RANK[s.source] >= AREA_SOURCE_RANK[best.source] ? s : best
  })
}

const seedGraceById = new Map(warpGraces.map((g) => [g.id, g]))
const warpById = new Map(allWarpRows.map((g) => [g.id, g]))

/** Region + place for a grace id, or null when the id is not a known grace. */
export function areaFromGraceId(factId: string): { region: string; place?: string } | null {
  const id = canonicalFactId(factId)
  const seed = seedGraceById.get(id)
  if (seed) return { region: seed.region, place: seed.name }
  const row = warpById.get(id)
  if (row) return { region: row.region, place: row.name }
  const fact = byId.get(id)
  if (fact?.kind === 'grace') return { region: fact.region, place: fact.name }
  return null
}

function isGraceId(factId: string): boolean {
  const id = canonicalFactId(factId)
  return seedGraceById.has(id) || warpById.has(id) || byId.get(id)?.kind === 'grace'
}

/**
 * Region for any located entity id. A grace also supplies a `place`; every other
 * kind only knows the region, so the chip stays "Liurnia · Raya Lucaria" rather
 * than "Liurnia · Uchigatana".
 */
export function areaFromFactId(factId: string): { region: string; place?: string } | null {
  const fact: Fact | undefined = byId.get(canonicalFactId(factId))
  const grace = areaFromGraceId(factId)
  if (grace) return grace
  if (fact?.kind === 'region') return { region: fact.name }
  if (fact?.region) return { region: fact.region }
  return null
}

function signalFor(factId: string, at: number, source: AreaSource): AreaSignal | null {
  const area = areaFromFactId(factId)
  if (!area) return null
  return { ...area, factId: canonicalFactId(factId), source, at }
}

/** The most recent located grace and the most recent located non-grace fact. */
export function signalsFromCharacter(character: Character): AreaSignal[] {
  let grace: AreaSignal | null = null
  let fact: AreaSignal | null = null

  for (const e of character.evidence) {
    if ((e.claim ?? 'true') !== 'true') continue
    const id = canonicalFactId(e.fact)
    const area = areaFromFactId(id)
    if (!area) continue
    const sig: AreaSignal = {
      ...area,
      factId: id,
      source: isGraceId(id) ? 'grace' : 'fact',
      at: e.at ?? 0,
    }
    if (sig.source === 'grace') {
      if (!grace || sig.at >= grace.at) grace = sig
    } else if (!fact || sig.at >= fact.at) {
      fact = sig
    }
  }

  // A save/merge can carry facts with no evidence rows at all. Fall back to the
  // tail of the authored lists (the most recently appended entry).
  if (!grace) {
    const lastGrace = [...character.discoveredGraces].reverse().find((id) => areaFromGraceId(id))
    if (lastGrace) grace = signalFor(lastGrace, 0, 'grace')
  }
  if (!fact) {
    const known = [
      ...character.completedQuestSteps,
      ...character.collectedItems,
      ...character.defeatedBosses,
    ]
    const lastFact = [...known].reverse().find((id) => areaFromFactId(id) && !isGraceId(id))
    if (lastFact) fact = signalFor(lastFact, 0, 'fact')
  }

  return [grace, fact].filter((s): s is AreaSignal => Boolean(s))
}

/**
 * The live engine's last rested grace mapped back to a region. `lastRestedGrace`
 * is a warp-list id (`grace:NNNNNN`); `allWarpRows` carries its region and name.
 * Returns null when the engine is offline or the id is unknown.
 */
export function engineAreaSignal(
  engine: { characters?: { lastRestedGrace?: number | null }[]; activeSlot?: number | null; at?: number } | null | undefined,
): AreaSignal | null {
  if (!engine?.characters?.length) return null
  const active =
    engine.characters[engine.activeSlot ?? -1] ??
    engine.characters.find((c) => c.lastRestedGrace) ??
    engine.characters[0]
  const warp = active?.lastRestedGrace
  if (!warp) return null
  const id = `grace:${warp}`
  const area = areaFromGraceId(id)
  if (!area) return null
  return { ...area, factId: id, source: 'engine', at: engine.at ?? Date.now() }
}

/** The full derivation: character signals, the persisted pick, and the engine. */
export function resolveCurrentArea(
  character: Character,
  persisted: AreaSignal | null | undefined,
  opts: { engine?: AreaSignal | null } = {},
): CurrentArea | null {
  return deriveCurrentArea([...signalsFromCharacter(character), persisted ?? null, opts.engine ?? null])
}

/** "Liurnia · Raya Lucaria" — the region, plus a finer place when there is one. */
export function areaLabel(area: AreaSignal | null | undefined): string {
  if (!area?.region) return ''
  if (area.place && norm(area.place) !== norm(area.region)) return `${area.region} · ${area.place}`
  return area.region
}

export const AREA_STALE_MINUTES = 45

/** True when the area was set more than `minutes` of wall clock ago. */
export function isAreaStale(area: AreaSignal | null | undefined, now = Date.now(), minutes = AREA_STALE_MINUTES): boolean {
  if (!area) return false
  return now - area.at > minutes * 60_000
}
