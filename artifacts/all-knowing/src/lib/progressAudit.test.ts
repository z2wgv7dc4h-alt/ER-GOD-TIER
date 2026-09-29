import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { setEntityIndex, type EntityRecord } from './entityIndex'
import { areaBosses } from './areaHub'
import { AUDIT_AREAS, progressionScenarios } from './__fixtures__/scenarios/progression'
import { auditScenario, runProgressAudit } from './progressAudit'
import { emptyCharacter } from '../data/seed'

describe('progress audit (Task 144 §4)', () => {
  // The item meter's full set is the entity index, exactly as the audit script loads it.
  let report: ReturnType<typeof runProgressAudit>
  beforeAll(() => {
    const doc = JSON.parse(readFileSync('public/sourced/entity-index.json', 'utf8')) as { records: Record<string, EntityRecord> }
    setEntityIndex(new Map(Object.entries(doc.records)))
    report = runProgressAudit()
  })

  it('runs the user character plus early, mid, late, DLC and denial characters', () => {
    expect(report.scenarios.length).toBe(1 + progressionScenarios.length)
  })

  it('has no violations across the scenarios', () => {
    expect(report.violations).toEqual([])
  })

  it('every progress ratio is within [0, 1] and uses a full set', () => {
    for (const scenario of report.scenarios) {
      for (const meter of scenario.ratios) {
        expect(meter.total, `${scenario.scenario} ${meter.id}`).toBeGreaterThan(0)
        expect(meter.ratio, `${scenario.scenario} ${meter.id}`).toBeGreaterThanOrEqual(0)
        expect(meter.ratio, `${scenario.scenario} ${meter.id}`).toBeLessThanOrEqual(1)
        expect(meter.have, `${scenario.scenario} ${meter.id}`).toBeLessThanOrEqual(meter.total)
      }
    }
  })

  it('never shows a Liurnia/Roundtable lockout at Stormveil', () => {
    for (const scenario of report.scenarios) {
      expect(scenario.lockouts.some((l) => /seluvis|nepheli/i.test(l))).toBe(false)
    }
  })

  // The audit must look at real rows, or "no violations" means nothing.
  it('checks areas that actually list bosses', () => {
    const withBosses = AUDIT_AREAS.filter((a) => areaBosses(emptyCharacter, a).length > 0)
    expect(withBosses.length).toBeGreaterThanOrEqual(8)
  })

  it('inference shows through: the mid-game character has Margit ticked without logging her', () => {
    const mid = progressionScenarios.find((s) => s.name.startsWith('mid'))!.character()
    expect(areaBosses(mid, 'Stormveil').find((b) => b.id === 'boss:margit')?.done).toBe(true)
  })

  it('an explicit denial wins over inference and is not reported as a fault', () => {
    const denial = progressionScenarios.find((s) => s.name.startsWith('denial'))!.character()
    const stormveil = areaBosses(denial, 'Stormveil')
    expect(stormveil.find((b) => b.id === 'boss:godrick')?.done).toBe(true)
    expect(stormveil.find((b) => b.id === 'boss:margit')?.done).toBe(false)
    expect(auditScenario('denial', denial).violations).toEqual([])
  })
})
