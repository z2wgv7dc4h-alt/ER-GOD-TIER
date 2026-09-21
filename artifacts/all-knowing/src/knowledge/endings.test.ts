import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { endings, planRoute } from './endings'

const stars = endings.find((e) => e.id === 'stars')!

describe('planRoute lockouts', () => {
  it('reports no lockout on a fresh character', () => {
    const plan = planRoute(emptyCharacter, stars)
    expect(plan.locked).toBeNull()
    expect(plan.current?.id).toBe('s1')
    expect(plan.remain).toBe(stars.steps.length)
  })

  it('locks Age of Stars once Seluvis has the Fingerslayer Blade', () => {
    const character = { ...emptyCharacter, completedQuestSteps: ['quest:seluvis-blade'] }
    const plan = planRoute(character, stars)
    expect(plan.locked).toMatch(/Seluvis/)
    expect(plan.todo).toHaveLength(stars.steps.length)
  })

  it('locks Age of Stars once the Elden Ring is mended without the ring', () => {
    const character = { ...emptyCharacter, defeatedBosses: ['boss:radagon'] }
    const plan = planRoute(character, stars)
    expect(plan.locked).toMatch(/already mended/)
  })

  it('advances done/current when steps are satisfied', () => {
    const character = {
      ...emptyCharacter,
      completedQuestSteps: ['quest:ranni:service'],
      defeatedBosses: ['boss:radahn'],
    }
    const plan = planRoute(character, stars)
    expect(plan.locked).toBeNull()
    expect(plan.done.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(plan.current?.id).toBe('s3')
    expect(plan.remain).toBe(stars.steps.length - 2)
  })

  it('raises a level detour when the character is under-levelled', () => {
    const character = { ...emptyCharacter, level: 20 }
    const plan = planRoute(character, stars)
    expect(plan.detours.some((d) => d.includes('level 20'))).toBe(true)
  })
})
