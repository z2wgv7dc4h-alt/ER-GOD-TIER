import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from '../lib/infer'
import { completionIds, endings, isStepDone, nextCompletionId, planRoute, type PlanStep } from './endings'
import { allLines, findNpcLine, storylines } from './storylines'

const stars = endings.find((e) => e.id === 'stars')!
const alexander = storylines.find((l) => l.id === 'alexander')!
const leda = storylines.find((l) => l.id === 'leda')!
const seluvis = storylines.find((l) => l.id === 'seluvis')!
const kenneth = storylines.find((l) => l.id === 'kenneth')!
const igon = storylines.find((l) => l.id === 'igon')!

function stepOf(lineId: string, stepId: string): PlanStep {
  const line = allLines.find((l) => l.id === lineId)!
  const step = line.steps.find((s) => s.id === stepId)
  if (!step) throw new Error(`no step ${lineId}/${stepId}`)
  return step
}

/** The handler behaviour from Gideon.tsx's "I'm done", factored for the test. */
function pressImDone(c: Character, step: PlanStep): Character {
  const id = nextCompletionId(c, step)
  return id ? applyFacts(c, [id], 'answer', 'I’m done') : c
}

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

describe('newly seeded companion lines', () => {
  it('locks Seluvis once Ranni has the Fingerslayer Blade', () => {
    const character = { ...emptyCharacter, completedQuestSteps: ['quest:ranni:nokron'] }
    const plan = planRoute(character, seluvis)
    expect(plan.locked).toMatch(/Seluvis is already dead/)
  })

  it('gates Kenneth’s coronation behind Nepheli’s Stormhawk beat', () => {
    const plan = planRoute(emptyCharacter, kenneth)
    expect(plan.current?.id).toBe('kh1')
    expect(plan.blocked.map((s) => s.id)).toContain('kh3')
  })

  it('forecloses Kenneth’s coronation if Nepheli drank the potion', () => {
    const character = { ...emptyCharacter, completedQuestSteps: ['quest:nepheli:potioned'] }
    const plan = planRoute(character, kenneth)
    expect(plan.foreclosed.map((s) => s.id)).toContain('kh3')
    expect(plan.available.map((s) => s.id)).not.toContain('kh3')
  })

  it('gates Igon’s payoff behind Bayle being alive', () => {
    const plan = planRoute(emptyCharacter, igon)
    expect(plan.current?.id).toBe('ig1')
    expect(plan.blocked.map((s) => s.id)).toContain('ig3')
  })

  it('resolves NPC names to their lines', () => {
    expect(findNpcLine('what does ranni want next')?.id).toBe('stars')
    expect(findNpcLine('kenneth haight quest')?.id).toBe('kenneth')
    expect(findNpcLine('st trina')?.id).toBe('thiollier')
    expect(findNpcLine('where is the giant prayerbook')).toBeUndefined()
  })
})

describe('multi-id step completion', () => {
  // Each row is a real beat whose completion the game records under more than
  // one id. `alt` is a genuine alternate marker, not an invented synonym.
  const cases: {
    line: string
    step: string
    primary: string
    alt: string
    list: 'defeatedBosses' | 'discoveredGraces' | 'collectedItems' | 'completedQuestSteps'
  }[] = [
    { line: 'stars', step: 's3', primary: 'item:fingerslayer', alt: 'quest:ranni:nokron', list: 'completedQuestSteps' },
    { line: 'stars', step: 's5', primary: 'quest:ranni:ring', alt: 'item:dark-moon-ring', list: 'collectedItems' },
    { line: 'duskborn', step: 'd2', primary: 'quest:ranni:statue', alt: 'item:cursemark-of-death', list: 'collectedItems' },
    { line: 'frenzy', step: 'f1', primary: 'grace:lake-shore', alt: 'quest:hyetta:met', list: 'completedQuestSteps' },
    { line: 'frenzy', step: 'f1', primary: 'grace:lake-shore', alt: 'quest:yura:shabriri', list: 'completedQuestSteps' },
    { line: 'sellen', step: 'se4', primary: 'quest:sellen:side', alt: 'item:stars-of-ruin', list: 'collectedItems' },
  ]

  it('lists the primary marker first and includes the alternatives', () => {
    expect(completionIds(stepOf('stars', 's3'))).toEqual(['item:fingerslayer', 'quest:ranni:nokron'])
  })

  for (const c of cases) {
    it(`${c.line}/${c.step} resolves done from the alternate ${c.alt}`, () => {
      const step = stepOf(c.line, c.step)
      expect(completionIds(step)).toContain(c.primary)
      expect(completionIds(step)).toContain(c.alt)
      expect(isStepDone(emptyCharacter, step)).toBe(false)

      const withAlt = { ...emptyCharacter, [c.list]: [c.alt] } as Character
      expect(isStepDone(withAlt, step)).toBe(true)

      // planRoute must agree, reading the raw list (no closeWorld pass).
      const line = allLines.find((l) => l.id === c.line)!
      expect(planRoute(withAlt, line).done.map((s) => s.id)).toContain(c.step)
    })
  }

  it('resolves from the primary when neither marker is known, via the “I’m done” handler', () => {
    const step = stepOf('stars', 's3')
    expect(nextCompletionId(emptyCharacter, step)).toBe('item:fingerslayer')
    const after = pressImDone(emptyCharacter, step)
    expect(isStepDone(after, step)).toBe(true)
  })

  it('is a no-op when the character already holds an acceptable marker', () => {
    const step = stepOf('stars', 's3')
    const withAlt: Character = { ...emptyCharacter, completedQuestSteps: ['quest:ranni:nokron'] }
    expect(nextCompletionId(withAlt, step)).toBeUndefined()
    expect(pressImDone(withAlt, step)).toBe(withAlt)
    expect(isStepDone(withAlt, step)).toBe(true)
  })

  it('resolves the blade beat when the quest flag is the marker that is true', () => {
    // Realistic run: Ranni's quest flag is recorded, but the blade item is not.
    const character: Character = { ...emptyCharacter, completedQuestSteps: ['quest:ranni:service', 'quest:ranni:nokron'] }
    const plan = planRoute(character, stars)
    expect(plan.done.map((s) => s.id)).toEqual(['s1', 's3'])
    expect(plan.current?.id).toBe('s2')
  })
})

describe('dump-id completion markers', () => {
  const dumpStep: PlanStep = {
    id: 'dump',
    do: 'Kill Godrick',
    detail: '',
    factId: 'bossflag:510010',
    requires: [],
    grants: [],
    lockouts: [],
  }

  it('canonicalises a dump marker to the authored slug', () => {
    expect(completionIds(dumpStep)).toEqual(['boss:godrick'])
  })

  it('matches a character whose fact was recorded as the authored slug', () => {
    expect(isStepDone({ ...emptyCharacter, defeatedBosses: ['boss:godrick'] }, dumpStep)).toBe(true)
  })

  it('matches a character that still holds the raw dump id', () => {
    expect(isStepDone({ ...emptyCharacter, defeatedBosses: ['bossflag:510010'] }, dumpStep)).toBe(true)
  })
})

describe('story beats that previously had no completion marker', () => {
  // These beats granted the fact the next beat required but carried no
  // `factId`, so planRoute could never mark them done and the line stalled.
  const fixed = [
    { line: 'millicent', step: 'm2', id: 'quest:millicent:cured' },
    { line: 'alexander', step: 'a3', id: 'quest:alexander:complete' },
    { line: 'nepheli', step: 'nepheli2', id: 'quest:nepheli:refused-potion' },
    { line: 'fia', step: 'fia2', id: 'quest:fia:dagger' },
    { line: 'd-hunter', step: 'd3', id: 'quest:d:dagger-choice' },
  ]

  for (const f of fixed) {
    it(`${f.line}/${f.step} now resolves`, () => {
      const step = stepOf(f.line, f.step)
      expect(completionIds(step)).toEqual([f.id])
      const after = pressImDone(emptyCharacter, step)
      expect(isStepDone(after, step)).toBe(true)

      const line = allLines.find((l) => l.id === f.line)!
      expect(planRoute(after, line).done.map((s) => s.id)).toContain(f.step)

      // The fact this beat produces is exactly what the following beat gates on.
      const idx = line.steps.findIndex((s) => s.id === f.step)
      const next = line.steps[idx + 1]
      if (next) expect(next.requires).toContain(f.id)
    })
  }
})
