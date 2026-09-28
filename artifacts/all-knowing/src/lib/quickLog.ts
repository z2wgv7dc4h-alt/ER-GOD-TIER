import { normalize } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { bossRoster } from './bossRoster'
import type { Character } from '../types'
import { canonicalFactId } from './aliases'
import { getEntity, type EntityKind } from './entityGraph'
import { allRecords, searchRecordIds } from './entityIndex'
import { applyFacts, knownFactIds } from './infer'
import { nextMoves } from './links'
import { lockoutWarningsFor, type LockWarning } from './lockWarnings'
import { resolveOmniboxTargets } from './omnibox'

/**
 * Task 99 — the pure quick-log planner.
 *
 * The quick-log sheet and the omnibox "Do" row both come through here, so there
 * is exactly one place that turns a set of entity ids into the next character
 * (`applyFacts` + inference) and the after-the-fact story: what got logged, what
 * inference unlocked, what to do next, and whether a gate needs confirming.
 * The component only renders and commits; all of this is unit-testable.
 */

/** A loggable thing, with the graph kind so the sheet can group/icon it. */
export type QuickTarget = {
  id: string
  name: string
  kind?: EntityKind
  /** Region/area text, when the target is a near-me suggestion. */
  region?: string
}

export type QuickLogPlan = {
  /** The character after `applyFacts` + inference. */
  character: Character
  /** The character as it was; the toast's Undo restores exactly this. */
  undo: Character
  /** The ids the player selected, as passed in. */
  ids: string[]
  /** Canonical ids that were not already known. */
  applied: string[]
  appliedTargets: QuickTarget[]
  /** Ids inference added on its own because of the log. */
  inferred: QuickTarget[]
  /** What to chase next, from the existing `nextMoves` graph walk. */
  next: QuickTarget[]
  /** Non-empty when committing would foreclose a line (Task 50 gate prompt). */
  warnings: LockWarning[]
  /** Plain-text version for aria/tests; the UI renders EntityLinks from the arrays. */
  toast: string
}

const TRACKABLE = new Set<EntityKind>([
  'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit',
  'item', 'material', 'boss', 'enemy', 'npc', 'grace', 'region', 'dungeon', 'quest', 'gate',
])

function targetOf(id: string, region?: string): QuickTarget {
  const entity = getEntity(id)
  return { id: entity.id, name: entity.name, kind: entity.kind, region }
}

/** A region/area label for whatever the workspace calls the current area. */
function areaName(currentArea?: string | null): string | undefined {
  if (!currentArea) return undefined
  const grace = warpGraces.find((g) => g.id === currentArea)
  if (grace) return grace.region
  const entity = getEntity(currentArea)
  if (entity.kind === 'region') return entity.name
  return currentArea
}

function sameArea(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const x = normalize(a)
  const y = normalize(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

/**
 * Bosses and graces in the current area the character has not logged yet.
 * `currentArea` is optional and read defensively — the workspace may not expose
 * it yet, and an unresolved area simply yields no near-me rows.
 */
export function nearMeTargets(currentArea: string | null | undefined, character: Character, limit = 6): QuickTarget[] {
  const area = areaName(currentArea)
  if (!area) return []
  const known = knownFactIds(character)
  const out: QuickTarget[] = []
  for (const g of warpGraces) {
    if (!sameArea(area, g.region)) continue
    if (known.has(canonicalFactId(g.id))) continue
    out.push(targetOf(g.id, g.region))
  }
  const seen = new Set<string>()
  for (const b of bossRoster) {
    if (!sameArea(area, b.region)) continue
    if (known.has(canonicalFactId(b.id)) || seen.has(b.id)) continue
    seen.add(b.id)
    out.push(targetOf(b.id, b.region))
  }
  // Task 132 §4 — NPCs, locations and enemies in the same area, from the
  // enriched index (the authored graph only carries graces/bosses).
  for (const rec of allRecords()) {
    if (rec.kind !== 'npc' && rec.kind !== 'enemy' && rec.kind !== 'region') continue
    const where = rec.region || rec.location
    if (!sameArea(area, where)) continue
    const canonical = canonicalFactId(rec.id)
    if (known.has(canonical) || seen.has(canonical) || seen.has(rec.id)) continue
    seen.add(rec.id)
    out.push({ id: rec.id, name: rec.name, kind: rec.kind as EntityKind, region: rec.region ?? where })
    if (out.length >= limit) break
  }
  return out.slice(0, limit)
}

/** Recently viewed entities that are still unlogged. */
export function recentLogTargets(recent: string[], character: Character, limit = 6): QuickTarget[] {
  const known = knownFactIds(character)
  const out: QuickTarget[] = []
  const seen = new Set<string>()
  for (const id of recent) {
    const canonical = canonicalFactId(id)
    if (known.has(canonical) || seen.has(canonical)) continue
    const target = targetOf(id)
    if (!target.kind || !TRACKABLE.has(target.kind)) continue
    seen.add(canonical)
    out.push(target)
    if (out.length >= limit) break
  }
  return out
}

/** Fuzzy matches for the sheet's single input, from the shared resolver. */
export function fuzzyLogTargets(query: string, limit = 8): QuickTarget[] {
  const q = query.trim()
  if (q.length < 2) return []
  const out: QuickTarget[] = []
  const seen = new Set<string>()
  for (const t of resolveOmniboxTargets(q)) {
    const target = targetOf(t.id)
    if (!target.kind || !TRACKABLE.has(target.kind) || seen.has(target.id)) continue
    seen.add(target.id)
    out.push(target)
    if (out.length >= limit) break
  }
  // Task 132 §4 — the index carries the wiki NPCs/locations/enemies and the full
  // item plane the omnibox resolver does not.
  if (out.length < limit) {
    for (const rec of searchRecordIds(q, undefined, 16)) {
      if (!TRACKABLE.has(rec.kind as EntityKind) || seen.has(rec.id)) continue
      seen.add(rec.id)
      out.push({ id: rec.id, name: rec.name, kind: rec.kind as EntityKind, region: rec.region })
      if (out.length >= limit) break
    }
  }
  return out
}

function names(targets: QuickTarget[]): string {
  return targets.map((t) => t.name).join(', ')
}

export function planQuickLog(character: Character, ids: string[], detail = 'quick log'): QuickLogPlan {
  const unique = [...new Set(ids.filter(Boolean))]
  const before = knownFactIds(character)
  const nextCharacter = applyFacts(character, unique, 'answer', detail)
  const after = knownFactIds(nextCharacter)
  const applied = unique.map((id) => canonicalFactId(id)).filter((id) => !before.has(id))
  const appliedSet = new Set(applied)
  const inferred = [...after].filter((id) => !before.has(id) && !appliedSet.has(id))
  const appliedTargets = applied.map((id) => targetOf(id))
  const inferredTargets = inferred.map((id) => targetOf(id))
  const next = nextMoves(nextCharacter, 3).map((m) => targetOf(m.id))
  const warnings = lockoutWarningsFor(character, unique)

  const parts = [`Logged ${names(appliedTargets)} ✓`]
  if (inferredTargets.length) parts.push(`unlocked: ${names(inferredTargets)}`)
  if (next.length) parts.push(`next: ${names(next)}`)
  return {
    character: nextCharacter,
    undo: character,
    ids: unique,
    applied,
    appliedTargets,
    inferred: inferredTargets,
    next,
    warnings,
    toast: parts.join(' — '),
  }
}
