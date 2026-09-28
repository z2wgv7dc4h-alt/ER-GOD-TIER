import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { allEntities } from './entityGraph'
import { clearEntityIndex, setEntityIndex } from './entityIndex'
import { computeEntityCoverage, GUARD_MINIMUMS, violations, type CoverageReport } from './entityCoverage'
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
