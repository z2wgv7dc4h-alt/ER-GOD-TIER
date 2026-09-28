import { describe, expect, it } from 'vitest'
import type { PlanStep } from './endings'
import { storylines } from './storylines'

/**
 * Task 140 §3 — questline walk-through.
 *
 * The authored `storylines.ts` arrays were checked beat-by-beat against the
 * Fandom wiki DB (`data/raw/er-mcp.db`, `quests` table). These tests pin the
 * ordering invariants that walk-through found broken, plus the explicit step
 * order of every authored line.
 */

function produces(step: PlanStep): string[] {
  return [step.factId, ...(step.factIds ?? []), ...step.grants].filter((id): id is string => Boolean(id))
}

function indexOf(lineId: string, needle: string): number {
  const line = storylines.find((l) => l.id === lineId)
  if (!line) throw new Error(`no line ${lineId}`)
  const index = line.steps.findIndex(
    (step) => step.id === needle || step.factId === needle || (step.factIds ?? []).includes(needle),
  )
  if (index < 0) throw new Error(`${lineId} has no step ${needle}`)
  return index
}

describe('every authored line is internally ordered', () => {
  it('has unique step ids and no forward reference to a later beat', () => {
    for (const line of storylines) {
      const ids = line.steps.map((step) => step.id)
      expect(new Set(ids).size, `${line.id} duplicate step id`).toBe(ids.length)
      for (let i = 0; i < line.steps.length; i++) {
        const earlier = new Set(line.steps.slice(0, i).flatMap(produces))
        const later = new Set(line.steps.slice(i + 1).flatMap(produces))
        for (const requirement of line.steps[i].requires) {
          // A beat may require a global fact the line never produces, but it may
          // never require something only a future beat of the same line grants.
          if (later.has(requirement) && !earlier.has(requirement)) {
            throw new Error(`${line.id}/${line.steps[i].id} requires future beat ${requirement}`)
          }
        }
      }
    }
  })

  it('opens every mid-line beat with a requirement and a grant', () => {
    for (const line of storylines) {
      line.steps.forEach((step, i) => {
        expect(step.factId, `${line.id}/${step.id} factId`).toBeTruthy()
        expect(step.do.length, `${line.id}/${step.id} do`).toBeGreaterThan(0)
        expect(step.detail.length, `${line.id}/${step.id} detail`).toBeGreaterThan(0)
        if (i > 0) {
          expect(step.requires.length, `${line.id}/${step.id} requires`).toBeGreaterThan(0)
          expect(step.grants.length, `${line.id}/${step.id} grants`).toBeGreaterThan(0)
        }
      })
    }
  })
})

describe('walk-through fixes', () => {
  it('orders Millicent: needle → cure → Altus → prosthesis → Dominula → Mountaintops → Elphael', () => {
    const order = [
      'quest:millicent:needle',
      'quest:millicent:cured',
      'quest:millicent:altus',
      'quest:millicent:prosthesis',
      'quest:millicent:godskin',
      'quest:millicent:mountains',
      'quest:millicent:elphael',
      'quest:millicent:aid',
      'quest:millicent:betrayed',
    ].map((fact) => indexOf('millicent', fact))
    for (let i = 1; i < order.length; i++) expect(order[i], `beat ${i}`).toBeGreaterThan(order[i - 1])
  })

  it('orders Sellen: Azur → Lusat → report → Witchbane → Primal Glintstone → Jerren', () => {
    const order = [
      'quest:sellen:azur',
      'quest:sellen:lusat',
      'quest:sellen:primers',
      'quest:sellen:witchbane',
      'quest:sellen:primal-glintstone',
      'quest:sellen:jerren',
    ].map((fact) => indexOf('sellen', fact))
    for (let i = 1; i < order.length; i++) expect(order[i], `beat ${i}`).toBeGreaterThan(order[i - 1])
  })

  it('orders Yura: Nerijus → Nagakiba → Second Church → Shabriri', () => {
    const order = ['quest:yura:nerijus', 'quest:yura:nagakiba', 'quest:yura:altus', 'quest:yura:shabriri'].map((fact) =>
      indexOf('yura', fact),
    )
    for (let i = 1; i < order.length; i++) expect(order[i], `beat ${i}`).toBeGreaterThan(order[i - 1])
  })

  it('keeps the shared lockable lines in wiki order', () => {
    const checks: [string, string[]][] = [
      ['rya', ['quest:rya:necklace', 'quest:rya:manor', 'quest:rya:amnion', 'quest:rya:concluded']],
      ['tanith', ['quest:tanith:contracts', 'quest:tanith:targets', 'boss:rykard', 'quest:tanith:concluded']],
      ['fia', ['quest:fia:met', 'quest:fia:dagger', 'grace:deeproot', 'quest:fia:cursemark', 'boss:fortissax']],
      ['dung-eater', ['quest:dungeater:met', 'quest:dungeater:freed', 'quest:dungeater:invasion', 'item:mending-rune-fell-curse']],
      ['leda', ['quest:leda:met', 'quest:leda:highroad', 'quest:leda:invitations', 'quest:leda:invitations-locked', 'quest:leda:concluded']],
    ]
    for (const [line, facts] of checks) {
      const order = facts.map((fact) => indexOf(line, fact))
      for (let i = 1; i < order.length; i++) {
        expect(order[i], `${line} beat ${facts[i]}`).toBeGreaterThan(order[i - 1])
      }
    }
  })
})
