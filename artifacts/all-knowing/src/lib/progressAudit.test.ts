import { describe, expect, it } from 'vitest'
import { runProgressAudit } from './progressAudit'

describe('progress audit (Task 144 §4)', () => {
  const report = runProgressAudit()

  it('runs at least one scenario character', () => {
    expect(report.scenarios.length).toBeGreaterThan(0)
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
})
