import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from './infer'
import {
  completeness,
  inferenceReasons,
  nextSetupStep,
  previousSetupStep,
  readSetupStep,
  removeInferredFact,
  setupSteps,
  stepLearnings,
  weakestStep,
  withSetupStep,
} from './setupWizard'
import { hashToLocation, locationToHash, moduleToLocation } from './sections'

function known(c: Character, id: string): boolean {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

describe('setup step persistence (Task 94)', () => {
  it('defaults to the first step and records the resume point in the vault-backed answers', () => {
    expect(readSetupStep(emptyCharacter)).toBe('status')
    const moved = withSetupStep(emptyCharacter, 'inventory')
    expect(readSetupStep(moved)).toBe('inventory')
    // The vault stores the character as JSON; the resume point must survive that.
    const roundTripped = JSON.parse(JSON.stringify(moved)) as Character
    expect(readSetupStep(roundTripped)).toBe('inventory')
  })

  it('ignores a corrupted step value', () => {
    const bad = withSetupStep(emptyCharacter, 'not-a-step' as never)
    expect(readSetupStep(bad)).toBe('status')
  })

  it('walks forward and back without falling off either end', () => {
    expect(nextSetupStep('status')).toBe('equipment')
    expect(previousSetupStep('status')).toBe('status')
    expect(previousSetupStep('review')).toBe('bosses')
    expect(nextSetupStep('review')).toBe('review')
  })

  it('keeps exactly the six spec steps', () => {
    expect(setupSteps.map((s) => s.id)).toEqual([
      'status', 'equipment', 'inventory', 'graces', 'bosses', 'review',
    ])
  })
})

describe('me/update resolves to me/setup (Task 94 alias)', () => {
  it('parses the legacy hash to setup', () => {
    expect(hashToLocation('#/me/update')).toEqual({ section: 'me', sub: 'setup' })
    expect(hashToLocation('#/me/setup')).toEqual({ section: 'me', sub: 'setup' })
  })

  it('emits and maps setup as the canonical location', () => {
    expect(locationToHash('me', 'setup')).toBe('#/me/setup')
    expect(moduleToLocation('reckon')).toEqual({ section: 'me', sub: 'setup' })
  })
})

describe('what we learned per step', () => {
  it('lists the facts a step recorded plus the live summary', () => {
    const read = applyFacts(emptyCharacter, ['item:godrick-great-rune'], 'screenshot', 'setup:inventory')
    const learned = stepLearnings(read, 'inventory')
    expect(learned.some((l) => /Godrick/i.test(l))).toBe(true)
    expect(stepLearnings(read, 'graces')).toEqual([])
  })
})

describe('inference review', () => {
  it('explains an inferred fact with a reason chain and can remove it', () => {
    const read = applyFacts(emptyCharacter, ['item:godrick-great-rune'], 'screenshot', 'setup:inventory')
    const reasons = inferenceReasons(read)
    const godrick = reasons.find((r) => r.fact === 'boss:godrick')
    expect(godrick).toBeTruthy()
    expect(godrick?.why).toMatch(/Godrick/i)
    const removed = removeInferredFact(read, 'boss:godrick')
    expect(known(removed, 'boss:godrick')).toBe(false)
  })
})

describe('completeness', () => {
  it('reports every spec category and picks the weakest step', () => {
    const rows = completeness(emptyCharacter)
    expect(rows.map((r) => r.id)).toEqual(['stats', 'gear', 'inventory', 'graces', 'bosses', 'quests'])
    for (const row of rows) expect(row.total).toBeGreaterThan(0)
    expect(weakestStep(emptyCharacter)).toBe('status')
  })
})
