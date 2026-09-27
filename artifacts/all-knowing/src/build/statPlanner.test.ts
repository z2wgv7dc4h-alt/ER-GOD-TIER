import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyTarget, clampStat, customRespec, planStats, statsFromDeltas } from './statPlanner'
import { hpFromVigor } from './playerCurves'
import type { Character } from '../types'

function char(over: Partial<Character> = {}): Character {
  return { ...emptyCharacter, ...over }
}

describe('stat planner (Task 110 §2)', () => {
  it('projects the derived readouts from the target spread', () => {
    const target = { ...emptyCharacter.stats, vigor: 40, mind: 25, endurance: 30 }
    const plan = planStats(emptyCharacter, target)
    expect(plan.hp).toBe(hpFromVigor(40))
    expect(plan.maxLoad).toBeGreaterThan(0)
    expect(plan.level).toBeGreaterThan(emptyCharacter.level)
    expect(plan.levelDelta).toBe(plan.level - emptyCharacter.level)
    expect(plan.rows).toHaveLength(8)
    const vigor = plan.rows.find((r) => r.key === 'vigor')!
    expect(vigor.reached).toBe(1)
    expect(vigor.caps).toEqual([40, 60])
  })

  it('applies deltas and clamps to the legal range', () => {
    expect(clampStat(0)).toBe(1)
    expect(clampStat(120)).toBe(99)
    const next = statsFromDeltas(emptyCharacter.stats, { vigor: 5, arcane: -20 })
    expect(next.vigor).toBe(15)
    expect(next.arcane).toBe(1)
  })

  it('commits a target spread and its implied level', () => {
    const target = { ...emptyCharacter.stats, vigor: 25 }
    const out = applyTarget(emptyCharacter, target)
    expect(out.stats.vigor).toBe(25)
    expect(out.level).toBe(16)
  })

  it('builds a custom respec plan with Larval Tear and Rennala facts', () => {
    const target = { ...emptyCharacter.stats, vigor: 20 }
    const plan = customRespec(emptyCharacter, target)
    expect(plan.changes.map((c) => c.key)).toContain('vigor')
    expect(plan.larvalTears).toBe(1)
    expect(plan.rennalaAvailable).toBe(false)
    expect(plan.rennalaNote).toMatch(/Rennala/)

    const known = customRespec(char({ defeatedBosses: ['boss:rennala'] }), target)
    expect(known.rennalaAvailable).toBe(true)
  })

  it('reports no Larval Tear when nothing changes', () => {
    expect(customRespec(emptyCharacter, emptyCharacter.stats).larvalTears).toBe(0)
  })
})
