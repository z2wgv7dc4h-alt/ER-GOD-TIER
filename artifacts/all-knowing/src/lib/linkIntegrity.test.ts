import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clearEntityIndex, setEntityIndex, type EntityRecord } from './entityIndex'
import { allEntities, edges, resolveEntityId, type EntityKind } from './entityGraph'
import { allWarpRows, canonicalFactId, generatedAliases } from './aliases'
import { inferChains } from '../knowledge/inferChains'
import { normaliseDropName, normaliseDrops } from '../knowledge/dropNames'
import { mapFragments } from '../knowledge/collectibles'
import { trackActionLabel } from '../library/pageModel'
import { bossRoster } from './bossRoster'
import { closeWorld } from './infer'

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

function slug(name: string): string {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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

  /**
   * Task 173 §9–§12 — the remaining link-graph gaps Task 171's audit found.
   * Each guard pins the fix, not a magic count.
   */
  describe('Task 173 link-gap guards', () => {
    it('§9 — a record region that only maps through REGION_FACT still gets a real place edge', () => {
      // "Stormveil Castle"/"Moonlight Altar" are not region entities themselves;
      // the catalog's authored region map must still place the record and the
      // region must carry the reverse `contains` edge.
      expect(edges('boss:godrick').some((e) => e.rel === 'foundIn' && e.to === 'region:limgrave')).toBe(true)
      expect(edges('region:limgrave').some((e) => e.rel === 'contains' && e.to === 'boss:godrick')).toBe(true)
      expect(edges('boss:adula--moonlight-altar').some((e) => e.rel === 'foundIn' && e.to === 'region:liurnia')).toBe(true)
    })

    it('§10 — one loot list: every boss/enemy drop string resolves to a real item', () => {
      const entities = allEntities()
      const byId = new Map(entities.map((e) => [e.id, e]))
      const ownedByName = new Map<string, string>()
      for (const e of entities) {
        if (!OWNED.has(e.kind)) continue
        const n = norm(e.name)
        if (n && !ownedByName.has(n)) ownedByName.set(n, e.id)
      }
      const resolveOwned = (raw: string): string | undefined => {
        const name = normaliseDropName(raw)
        if (!name) return undefined
        const direct = ownedByName.get(norm(name))
        if (direct) return direct
        const candidate = canonicalFactId(`item:${slug(name)}`, name)
        const entity = byId.get(candidate)
        if (entity && OWNED.has(entity.kind)) return candidate
        return undefined
      }
      const unresolved: string[] = []
      for (const [id, rec] of Object.entries(loadRecords())) {
        if (rec.kind !== 'boss' && rec.kind !== 'enemy') continue
        for (const raw of rec.drops ?? []) {
          for (const drop of normaliseDrops(raw)) if (!resolveOwned(drop)) unresolved.push(`${id}: ${drop}`)
        }
      }
      for (const row of bossRoster) {
        for (const raw of row.drops) {
          for (const drop of normaliseDrops(raw)) if (!resolveOwned(drop)) unresolved.push(`roster ${row.id}: ${drop}`)
        }
      }
      expect(unresolved, unresolved.slice(0, 20).join('\n')).toEqual([])
      // The same list discards a name that names no single item.
      expect(normaliseDropName('Somber Smithing Stones')).toBeNull()
      expect(normaliseDropName("Night's Cavalry Set")).toBeNull()
    })

    it('§11 — the Haligtree cycle is gone but the medallion still infers the region', () => {
      const closed = closeWorld(['region:haligtree'])
      expect(closed).not.toContain('item:haligtree-secret-medallion')
      expect(closeWorld(['item:haligtree-secret-medallion'])).toContain('region:haligtree')
    })

    it('§12 — a folded vendor card resolves to the entity that owns the name', () => {
      const bad = allEntities()
        .filter((e) => e.kind === 'merchant')
        .filter((e) => /^Remembrance of /i.test(e.name) || /^(Sorcery|Incantation|Dragon Communion|Elden Remembrance)$/i.test(e.name))
      expect(bad.map((e) => `${e.id} = ${e.name}`), bad.slice(0, 20).join('\n')).toEqual([])
      expect(resolveEntityId('merchant:sorcery')).toBe('mechanic:sorcery')
      expect(resolveEntityId('merchant:incantation')).toBe('mechanic:incantation')
      expect(resolveEntityId('merchant:dragon-communion')).toBe('region:cathedral-of-dragon-communion')
      expect(resolveEntityId('merchant:remembrance-of-the-grafted')).toBe('item:remembrance-grafted')
    })
  })
})
