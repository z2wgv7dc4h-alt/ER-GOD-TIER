import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { byId } from './catalog'
import { dungeonGrace, dungeonPlan, dungeons, stepKnown } from './dungeons'
import { warpGraces } from './graces'

const stormveil = dungeons[0]
const warpIds = new Set(warpGraces.map((g) => g.id))
const stormveilGraces = new Set(warpGraces.filter((g) => g.region === 'Stormveil').map((g) => g.id))

describe('Task 80 Stormveil dungeon', () => {
  it('authors exactly one dungeon and no Raya / Volcano / Haligtree', () => {
    expect(dungeons).toHaveLength(1)
    expect(stormveil.name).toBe('Stormveil Castle')
    expect(dungeons.some((d) => /raya|volcano|haligtree/i.test(d.name))).toBe(false)
  })

  it('says in the block title that it is not every corpse', () => {
    expect(stormveil.scope).toMatch(/not every corpse/i)
  })

  it('uses existing catalog facts and existing Stormveil graces only', () => {
    expect(stormveilGraces.size).toBeGreaterThanOrEqual(3)
    for (const step of stormveil.steps) {
      expect(byId.has(step.factId) || warpIds.has(step.factId), step.factId).toBe(true)
      if (step.graceId) {
        expect(stormveilGraces.has(step.graceId), step.graceId).toBe(true)
        expect(dungeonGrace(step)?.name, step.graceId).toBeTruthy()
      }
    }
  })

  it('puts an empty character on a real first beat, never a finish-the-game step', () => {
    const plan = dungeonPlan(emptyCharacter, stormveil)
    expect(plan.done).toEqual([])
    expect(plan.current?.id).toBe('sv1')
    expect(['grace:castleward', 'boss:godrick']).toContain(plan.current?.factId)
    expect(plan.current?.do).not.toMatch(/finish|elden beast|ashen capital/i)
  })

  it('reads done state from the same fact lists a tick writes', () => {
    expect(stepKnown(emptyCharacter, stormveil.steps[0])).toBe(false)
  })
})
