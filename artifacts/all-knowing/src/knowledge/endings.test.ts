import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { endings, planRoute } from './endings'
import { storylines } from './storylines'

const stars = endings.find((e) => e.id === 'stars')!
const alexander = storylines.find((l) => l.id === 'alexander')!
const leda = storylines.find((l) => l.id === 'leda')!

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

describe('quest lockout edges', () => {
  it('forecloses Alexander’s later beats when the Limgrave hole is missed', () => {
    const character = { ...emptyCharacter, completedQuestSteps: ['quest:alexander:missed-limgrave'] }
    const plan = planRoute(character, alexander)
    const foreclosed = plan.foreclosed.map((s) => s.id)
    expect(foreclosed).toContain('a2')
    expect(foreclosed).toContain('a3')
    expect(plan.available.map((s) => s.id)).not.toContain('a2')
    expect(plan.available.map((s) => s.id)).not.toContain('a3')
    expect(plan.current?.id).not.toBe('a2')
  })

  it('gates Alexander’s later beats behind the earlier fact', () => {
    const plan = planRoute(emptyCharacter, alexander)
    expect(plan.current?.id).toBe('a1')
    expect(plan.blocked.map((s) => s.id)).toEqual(expect.arrayContaining(['a2', 'a3']))
  })

  it('forecloses Leda’s Enir-Ilim window once the invitations are locked', () => {
    const character = { ...emptyCharacter, completedQuestSteps: ['quest:leda:invitations-locked'] }
    const plan = planRoute(character, leda)
    expect(plan.foreclosed.map((s) => s.id)).toContain('ld3')
    expect(plan.available.map((s) => s.id)).not.toContain('ld3')
  })

  it('forecloses Ranni’s later beats once Seluvis has the Fingerslayer Blade', () => {
    const character = { ...emptyCharacter, completedQuestSteps: ['quest:seluvis-blade'] }
    const plan = planRoute(character, stars)
    expect(plan.locked).toMatch(/Seluvis/)
    expect(plan.foreclosed.map((s) => s.id)).toEqual(expect.arrayContaining(['s4', 's5', 's6']))
    expect(plan.available.map((s) => s.id)).not.toContain('s4')
  })
})
