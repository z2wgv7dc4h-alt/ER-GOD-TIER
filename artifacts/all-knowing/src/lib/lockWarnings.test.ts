import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from './infer'
import { lockoutWarnings } from './lockWarnings'

/** Golden mid-run fixture used by Tasks 42/53: Fingerslayer not handed in. */
const TRUE_FACTS = [
  'boss:margit',
  'boss:godrick',
  'boss:rennala',
  'boss:radahn',
  'quest:ranni:service',
  'item:black-knifeprint',
  'quest:rogier:knifeprint',
  'quest:varre:met',
  'quest:fia:met',
  'quest:fia:dagger',
  'invader:ensha',
  'quest:thops:met',
]
const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 50 fixture')

describe('SCOPE case: Alexander in the Limgrave hole', () => {
  it('warns when the Alexander line is in play', () => {
    const started = applyFacts(emptyCharacter, ['alexander-1'], 'answer', 'freed him')
    const warns = lockoutWarnings(started, 'quest:alexander:missed-limgrave')
    const warn = warns.find((w) => w.lineId === 'alexander')
    expect(warn).toBeDefined()
    expect(warn!.started).toBe(true)
    expect(warn!.steps.map((s) => s.id)).toEqual(expect.arrayContaining(['a2', 'a3']))
  })

  it('is silent on an unrelated character', () => {
    const warns = lockoutWarnings(emptyCharacter, 'quest:alexander:missed-limgrave')
    expect(warns.some((w) => w.lineId === 'alexander')).toBe(false)
  })
})

describe('SCOPE case: Leda Enir-Ilim invitations', () => {
  const inShadow = applyFacts(
    emptyCharacter,
    ['region:shadow', 'quest:leda:met', 'quest:leda:highroad'],
    'answer',
    'met Leda',
  )

  it('warns when the Leda line is in play', () => {
    const warns = lockoutWarnings(inShadow, 'quest:leda:invitations-locked')
    const warn = warns.find((w) => w.lineId === 'leda')
    expect(warn).toBeDefined()
    expect(warn!.steps.map((s) => s.id)).toEqual(expect.arrayContaining(['ld3', 'ld4', 'ld5']))
  })

  it('is silent on an unrelated character', () => {
    const warns = lockoutWarnings(emptyCharacter, 'quest:leda:invitations-locked')
    expect(warns.some((w) => w.lineId === 'leda')).toBe(false)
  })
})

describe('no false positives', () => {
  it('marking Fingerslayer done on the golden fixture does not warn', () => {
    expect(lockoutWarnings(fixture, 'item:fingerslayer')).toEqual([])
  })

  it('reports a started line only, never a theoretical lockout in an untouched line', () => {
    // Advancing Ranni past the blade kills the Seluvis line — but only when that
    // line is actually in play.
    const seluvisStarted = applyFacts(emptyCharacter, ['quest:seluvis:met'], 'answer', 'met Seluvis')
    expect(lockoutWarnings(seluvisStarted, 'quest:ranni:nokron').some((w) => w.lineId === 'seluvis')).toBe(true)
    expect(lockoutWarnings(emptyCharacter, 'quest:ranni:nokron').some((w) => w.lineId === 'seluvis')).toBe(false)
  })
})
