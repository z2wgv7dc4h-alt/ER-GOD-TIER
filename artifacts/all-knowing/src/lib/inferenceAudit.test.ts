import { describe, expect, it } from 'vitest'
import { facts } from '../knowledge/catalog'
import { LIKELY_CATALOG_EDGES, LIKELY_CATALOG_NOTES, auditTotals, ruleInventory } from './inferenceAudit'

/**
 * Task 166 §19 — the audit's "likely, not certain" set referenced edges the
 * catalog had long dropped, so the safety net was inert. These tests pin every
 * key to a live `implies` edge and require a documented note, so it cannot go
 * stale again without a failing test.
 */
describe('inference audit likely keys', () => {
  it('every likely key is a real catalog edge', () => {
    expect(LIKELY_CATALOG_EDGES.size).toBeGreaterThan(0)
    for (const key of LIKELY_CATALOG_EDGES) {
      const [from, to] = key.split('->')
      const fact = facts.find((f) => f.id === from)
      expect(fact, `missing fact ${from}`).toBeTruthy()
      expect(fact!.implies, `${key} is not a catalog edge`).toContain(to)
    }
  })

  it('every likely key has an explanation', () => {
    for (const key of LIKELY_CATALOG_EDGES) {
      expect(LIKELY_CATALOG_NOTES[key], `${key} has no note`).toBeTruthy()
    }
  })

  it('counts the rule inventory without duplicates', () => {
    const rules = ruleInventory()
    const ids = rules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(auditTotals().rules).toBe(rules.length)
  })
})
