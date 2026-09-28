import { byId } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { bossRoster } from './bossRoster'
import { loot, type Loot } from '../knowledge/loot'
import { dungeons, dungeonPlan } from '../knowledge/dungeons'
import { gates, gateState } from '../knowledge/gates'
import { npcLocations, npcLocate } from '../knowledge/npcLocations'
import { canonicalFactId } from './aliases'
import { knownFactIds } from './infer'
import { areaFromGraceId } from './areaContext'
import { detectArchetype } from './archetype'
import { GEAR_TAGS } from './gearTags'
import { bandFor, type RegionLevel } from './regionLevels'
import type { Character } from '../types'

/**
 * Task 98 — the Area hub's pure data layer.
 *
 * Everything is region-scoped from in-repo metadata only (catalog fact regions,
 * loot regions, warp-grace regions, authored dungeon regions). The hub never
 * invents a region for a row that has none; an unmatched entity simply does not
 * appear. `levelVerdict` and `areaCompletion` are the acceptance-tested core.
 */

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

/** Two region labels refer to the same place when one contains the other (≥4 chars). */
export function regionMatches(region: string | null | undefined, area: string | null | undefined): boolean {
  const r = norm(region)
  const a = norm(area)
  if (r.length < 4 || a.length < 4) return false
  return r.includes(a) || a.includes(r)
}

export type LevelVerdict = 'under' | 'right' | 'over'

/** "under / right / over" for a level against a region band (null when no band). */
export function levelVerdict(level: number, band: RegionLevel | null | undefined): LevelVerdict | null {
  if (!band) return null
  if (level < band.levelMin) return 'under'
  if (level > band.levelMax) return 'over'
  return 'right'
}

export type Count = { have: number; total: number }
export type AreaCompletion = {
  graces: Count
  bosses: Count
  items: Count
  dungeons: Count
  done: number
  total: number
}

function isKnown(known: Set<string>, id: string): boolean {
  return known.has(canonicalFactId(id))
}

export function areaGraces(character: Character, area: string | null | undefined) {
  const known = knownFactIds(character)
  return warpGraces
    .filter((g) => regionMatches(g.region, area))
    .map((g) => ({ id: g.id, name: g.name, region: g.region, done: isKnown(known, g.id) }))
}

export function areaBosses(character: Character, area: string | null | undefined) {
  const known = knownFactIds(character)
  const seen = new Set<string>()
  const out: { id: string; name: string; region: string; done: boolean }[] = []
  for (const b of bossRoster) {
    if (!regionMatches(b.region, area)) continue
    if (seen.has(b.id)) continue
    seen.add(b.id)
    out.push({ id: b.id, name: b.name, region: b.region, done: isKnown(known, b.id) })
  }
  return out.sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name))
}

export function areaLoot(character: Character, area: string | null | undefined): (Loot & { owned: boolean; goodForBuild: boolean })[] {
  const known = knownFactIds(character)
  const archetype = detectArchetype(character.stats)
  const goodNames = new Set(GEAR_TAGS[archetype].map((t) => norm(t.name)))
  return loot
    .filter((l) => regionMatches(l.region, area))
    .map((l) => ({
      ...l,
      owned: isKnown(known, l.id),
      goodForBuild: goodNames.has(norm(l.name)),
    }))
    .sort((a, b) => Number(a.owned) - Number(b.owned) || a.name.localeCompare(b.name))
}

export function areaDungeons(character: Character, area: string | null | undefined) {
  return dungeons
    .filter((d) => regionMatches(d.region, area))
    .map((d) => {
      const plan = dungeonPlan(character, d)
      const bossStep = d.steps.find((s) => s.factId.startsWith('boss:'))
      const status = plan.done.length === 0 ? 'todo' : plan.done.length === plan.total ? 'done' : 'current'
      return {
        id: `dungeon:${d.id}`,
        name: d.name,
        region: d.region,
        boss: bossStep?.do,
        bossId: bossStep?.factId,
        status,
        have: plan.done.length,
        total: plan.total,
      }
    })
}

export function areaNpcs(character: Character, area: string | null | undefined) {
  const seen = new Set<string>()
  const out: { id: string; name: string; graceId: string; graceName: string; note?: string }[] = []
  for (const row of npcLocations) {
    if (seen.has(row.npc)) continue
    seen.add(row.npc)
    const hit = npcLocate(character, row.npc)
    if (!hit) continue
    const graceArea = areaFromGraceId(hit.graceId)
    if (!regionMatches(graceArea?.region, area)) continue
    out.push({ id: `npc:${row.npc}`, name: hit.name, graceId: hit.graceId, graceName: hit.graceName, note: hit.note })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export type DontMiss = { id: string; name: string; why: string; kind: 'missable' | 'gate' }

export function areaDontMiss(character: Character, area: string | null | undefined): DontMiss[] {
  const known = knownFactIds(character)
  const out: DontMiss[] = []

  // Loot rows the data already flags missable and that belong to this area.
  for (const l of loot) {
    if (!l.missable || !regionMatches(l.region, area)) continue
    if (isKnown(known, l.id)) continue
    out.push({ id: l.id, name: l.name, why: l.how, kind: 'missable' })
  }

  // World-state gates whose trigger, approach, or locked content sits here.
  for (const gate of gates) {
    if (gateState(character, gate) === 'fired') continue
    const touches = [...gate.triggerFacts, ...gate.approachingWhen, ...gate.locks.map((l) => l.factId)].some((id) =>
      regionMatches(byId.get(canonicalFactId(id))?.region, area),
    )
    if (!touches) continue
    const names = gate.locks.map((l) => l.name).join(', ')
    out.push({ id: gate.id, name: gate.name, why: names ? `Continuing locks: ${names}` : 'A point of no return touches this area.', kind: 'gate' })
  }

  return out
}

/** Graces, bosses, items, and dungeons counted against everything in the area. */
export function areaCompletion(character: Character, area: string | null | undefined): AreaCompletion {
  const graces = areaGraces(character, area)
  const bosses = areaBosses(character, area)
  const items = areaLoot(character, area)
  const piles = areaDungeons(character, area)
  const count = (rows: { done?: boolean; owned?: boolean; status?: string }[]): Count => ({
    have: rows.filter((r) => r.done || r.owned || r.status === 'done').length,
    total: rows.length,
  })
  const draft = {
    graces: count(graces.map((g) => ({ done: g.done }))),
    bosses: count(bosses.map((b) => ({ done: b.done }))),
    items: count(items.map((i) => ({ owned: i.owned }))),
    dungeons: count(piles.map((d) => ({ status: d.status }))),
  }
  const done = draft.graces.have + draft.bosses.have + draft.items.have + draft.dungeons.have
  const total = draft.graces.total + draft.bosses.total + draft.items.total + draft.dungeons.total
  return { ...draft, done, total }
}

/** The band for an area label, given the async-loaded progress-route table. */
export function areaBand(bands: RegionLevel[], area: string | null | undefined): RegionLevel | null {
  return bandFor(bands, area)
}
