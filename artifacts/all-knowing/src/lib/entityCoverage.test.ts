import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { allEntities } from './entityGraph'
import { clearEntityIndex, setEntityIndex } from './entityIndex'
import { computeEntityCoverage, GUARD_MINIMUMS, violations, type CoverageReport } from './entityCoverage'
import { catalogueIdFor } from './catalogueIds'
import type { EntityRecord } from './entityIndex'

/**
 * Task 119 §4 — the coverage guard.
 *
 * Runs the same coverage computation `npm run coverage:entities` writes into
 * `docs/ENTITY-COVERAGE.md`, over the committed enrichment index, and fails if
 * any of the task's per-kind minimums regress. This is the tripwire that keeps
 * boss pages, weapon stats and grace coords from silently emptying again.
 */

const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))

function loadRecords(): Record<string, EntityRecord> {
  const doc = JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }
  return doc.records ?? {}
}

const report: CoverageReport = computeEntityCoverage(loadRecords())

describe('entity coverage minimums (Task 119)', () => {
  it('ships an enrichment record for the known bosses, weapons and graces', () => {
    const records = loadRecords()
    expect(Object.keys(records).length).toBeGreaterThan(1000)
    for (const id of ['boss:margit', 'boss:malenia', 'boss:radahn', 'boss:godrick', 'item:moonveil', 'item:rivers-of-blood']) {
      expect(records[id], `missing ${id}`).toBeTruthy()
    }
  })

  it('meets every per-kind minimum', () => {
    const breaches = violations(report)
    expect(breaches, breaches.join('\n')).toEqual([])
  })

  for (const guard of GUARD_MINIMUMS) {
    it(`${guard.kind} ≥ ${guard.min}% ${guard.label}`, () => {
      const kind = report.kinds.find((k) => k.kind === guard.kind)
      if (!kind || kind.total === 0) return
      const value = kind.fields[guard.field]
      expect(value, `${guard.kind} has no ${guard.field} metric`).toBeTruthy()
      expect(value!.pct).toBeGreaterThanOrEqual(guard.min)
    })
  }

  it('registers the full enrichment index as graph entities (Task 122 §C)', () => {
    const records = loadRecords()
    setEntityIndex(new Map(Object.entries(records)))
    try {
      const known = new Set(allEntities().map((e) => e.id))
      expect(known.has('item:alberich-s-bracers'), 'armor record not registered').toBe(true)
      expect(known.has('boss:margit')).toBe(true)
      expect(known.size).toBeGreaterThan(1400)
    } finally {
      clearEntityIndex()
    }
  })

  it('enumerates the full catalogue, not just the graph subset (Task 123 §2)', () => {
    const byKind: Record<string, number> = {}
    for (const record of Object.values(loadRecords())) byKind[record.kind] = (byKind[record.kind] ?? 0) + 1
    expect(byKind.weapon ?? 0, 'weapons').toBeGreaterThanOrEqual(400)
    expect(byKind.shield ?? 0, 'shields').toBeGreaterThanOrEqual(60)
    expect(byKind.armor ?? 0, 'armor').toBeGreaterThanOrEqual(550)
    expect(byKind.talisman ?? 0, 'talismans').toBeGreaterThanOrEqual(80)
    expect(byKind.spell ?? 0, 'spells').toBeGreaterThanOrEqual(160)
    expect(byKind.ash ?? 0, 'ashes').toBeGreaterThanOrEqual(80)
    expect(byKind.spirit ?? 0, 'spirits').toBeGreaterThanOrEqual(55)
    expect(byKind.item ?? 0, 'items').toBeGreaterThanOrEqual(420)
  })

  it('shares the Library id authority with the index (Task 123 §2)', () => {
    const records = loadRecords()
    const samples: [string, string][] = [
      ['item', 'Uchigatana'],
      ['item', "Lordsworn's Straight Sword"],
      ['item', 'Brass Shield'],
      ['item', 'Banished Knight Helm'],
      ['item', 'Crimson Amber Medallion'],
      ['item', 'Glintstone Pebble'],
      ['item', 'Flame Sling'],
      ['item', "Lion's Claw"],
      ['item', 'Black Knife Tiche'],
      ['item', 'Golden Seed'],
    ]
    for (const [prefix, name] of samples) {
      const id = catalogueIdFor(prefix, name)
      expect(records[id], `${name} -> ${id} has no index record`).toBeTruthy()
    }
  })

  it('never stores a stringified structured value in the index (Task 123 §1)', () => {
    const raw = readFileSync(indexPath, 'utf8')
    expect(raw).not.toContain('[object Object]')
    expect(raw).not.toContain('undefined')
    expect(raw).not.toContain('NaN')
  })

  it('covers the ten spot-check entities end to end', () => {
    const records = loadRecords()
    const spot = [
      'boss:margit',
      'boss:malenia',
      'boss:radahn',
      'boss:godrick',
      'item:moonveil',
      'item:rivers-of-blood',
      'item:mimic-tear-ashes',
      'item:radagon-s-soreseal',
      'npc:alexander',
      'grace:elleh',
    ]
    const known = new Set(allEntities().map((e) => e.id))
    for (const id of spot) {
      const record = records[id]
      expect(record, `no enriched record for ${id}`).toBeTruthy()
      expect(known.has(id), `${id} is not in the entity graph`).toBe(true)
      const filled = [record!.description, record!.location, record!.strategy, record!.map, record!.stats && Object.keys(record!.stats).length, record!.drops?.length].filter(Boolean)
      expect(filled.length, `${id} record is empty`).toBeGreaterThan(0)
    }
  })
})
