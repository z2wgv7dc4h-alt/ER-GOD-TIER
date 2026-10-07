import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clearEntityIndex, setEntityIndex, type EntityRecord } from './entityIndex'
import { allEntities, edges, resolveEntityId, type EntityKind } from './entityGraph'
import { allWarpRows, canonicalFactId, generatedAliases } from './aliases'
import { inferChains } from '../knowledge/inferChains'
import { mapFragments } from '../knowledge/collectibles'
import { trackActionLabel } from '../library/pageModel'

/**
 * Task 160 — the six link/inference defects Task 157 found, recomputed over the
 * committed enrichment index installed exactly as the app installs it at runtime.
 * `npm run audit:links` cannot see these: they live in the graph edges, the alias
 * plane, the infer chains and the page model, not in a whitelist of data ids.
 *
 * Every count below must be 0 (or ≤ a named, reasoned exception list). A count
 * that rises means a real regression, not a data change.
 */
const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))

const OWNED = new Set<EntityKind>(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])
const PLACE = new Set<EntityKind>(['region', 'grace', 'dungeon'])

/** Authored edge -> the kinds its target may honestly be. */
const DROPPERS = new Set<EntityKind>(['boss', 'enemy'])
const EXPECTED_TO_KINDS: Record<string, Set<EntityKind>> = {
  drops: OWNED,
  droppedBy: DROPPERS,
  soldBy: new Set<EntityKind>(['merchant']),
  sells: OWNED,
  tradedFor: OWNED,
  goodForBuild: OWNED,
  craftedFrom: OWNED,
  upgradeMaterial: OWNED,
  foundIn: PLACE,
}

/** A within-kind duplicate tolerated because the two pages really are distinct. */
const DUPLICATE_NAME_EXCEPTIONS: Record<string, string> = {}

/** `whenFact` ids resolved by the collectibles plane, not the entity graph. */
const collectibleIds = new Set(mapFragments.map((f) => f.id))

function loadRecords(): Record<string, EntityRecord> {
  const doc = JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }
  return doc.records ?? {}
}

function norm(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

describe('link integrity guards (Task 160)', () => {
  beforeAll(() => {
    setEntityIndex(new Map(Object.entries(loadRecords())))
  })
  afterAll(() => {
    clearEntityIndex()
  })

  it('every Related edge opens a real entity page (no dead chips)', () => {
    const entities = new Set(allEntities().map((e) => e.id))
    const dead: string[] = []
    for (const from of entities) {
      for (const edge of edges(from)) {
        if (!entities.has(edge.to)) dead.push(`${from} -${edge.rel}-> ${edge.to}`)
      }
    }
    expect(dead, dead.slice(0, 20).join('\n')).toEqual([])
  })

  it('every resolved edge lands on the kind its relationship promises', () => {
    const byId = new Map(allEntities().map((e) => [e.id, e]))
    const wrong: string[] = []
    for (const from of byId.keys()) {
      for (const edge of edges(from)) {
        const expected = EXPECTED_TO_KINDS[edge.rel]
        if (!expected) continue
        const to = byId.get(edge.to)
        if (!to) continue // covered by the dead-edge guard above
        if (!expected.has(to.kind)) wrong.push(`${from} -${edge.rel}-> ${edge.to} (${to.kind})`)
      }
    }
    expect(wrong, wrong.slice(0, 20).join('\n')).toEqual([])
  })

  it('every warp and alias search row opens a real entity page', () => {
    const dead: string[] = []
    for (const w of allWarpRows) {
      const id = canonicalFactId(w.id)
      if (!resolveEntityId(id)) dead.push(`warp ${w.id} -> ${id}`)
    }
    for (const a of generatedAliases) {
      const id = canonicalFactId(a.slug)
      if (!resolveEntityId(id)) dead.push(`alias ${a.engineId} -> ${id}`)
    }
    expect(dead, dead.slice(0, 20).join('\n')).toEqual([])
  })

  it('every inference chain can fire (its evidence id resolves)', () => {
    const dead = inferChains
      .filter((c) => !resolveEntityId(c.whenFact) && !collectibleIds.has(c.whenFact))
      .map((c) => `${c.whenFact} -> ${c.implies.join(', ')}`)
    expect(dead, dead.slice(0, 20).join('\n')).toEqual([])
  })

  it('never offers "Mark done" for a kind the page model does not track', () => {
    const TRACKABLE_DONE = new Set<EntityKind>(['quest', 'gate', 'ending'])
    const refused = allEntities()
      .map((e) => ({ id: e.id, kind: e.kind, label: trackActionLabel(e.kind, false, e.id) }))
      .filter((r) => r.label === 'Mark done' && !TRACKABLE_DONE.has(r.kind))
    expect(refused.map((r) => `${r.id} (${r.kind})`), refused.slice(0, 20).map((r) => `${r.id} (${r.kind})`).join('\n')).toEqual([])
  })

  it('has no two entities of one kind sharing a display name', () => {
    const groups = new Map<string, string[]>()
    for (const e of allEntities()) {
      const key = `${e.kind}|${norm(e.name)}`
      const list = groups.get(key) ?? []
      list.push(e.id)
      groups.set(key, list)
    }
    const dups = [...groups.entries()]
      .filter(([, ids]) => ids.length > 1)
      .filter(([key]) => !(key in DUPLICATE_NAME_EXCEPTIONS))
      .map(([key, ids]) => `${key}: ${ids.join(', ')}`)
    expect(dups, dups.slice(0, 20).join('\n')).toEqual([])
  })
})
