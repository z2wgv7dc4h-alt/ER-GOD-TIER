import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import {
  buildResume,
  characterFactCount,
  RESUME_MIN_GAP_MS,
  shouldShowResume,
  type ResumeSnapshot,
} from './resume'

const NOW = 1_800_000_000_000

function withFacts(graces: number, bosses: number): Character {
  return {
    ...emptyCharacter,
    discoveredGraces: Array.from({ length: graces }, (_, i) => `grace:g${i}`),
    defeatedBosses: Array.from({ length: bosses }, (_, i) => `boss:b${i}`),
  }
}

describe('resume trigger (Task 100 §1)', () => {
  it('never shows without a stored snapshot', () => {
    expect(shouldShowResume(NOW, null)).toBe(false)
    expect(shouldShowResume(NOW, undefined)).toBe(false)
    expect(shouldShowResume(NOW, { lastVisitAt: 0, factCount: 0 })).toBe(false)
  })

  it('shows only after the gap has elapsed', () => {
    const justUnder: ResumeSnapshot = { lastVisitAt: NOW - RESUME_MIN_GAP_MS + 1, factCount: 0 }
    const exactly: ResumeSnapshot = { lastVisitAt: NOW - RESUME_MIN_GAP_MS, factCount: 0 }
    const over: ResumeSnapshot = { lastVisitAt: NOW - RESUME_MIN_GAP_MS - 1, factCount: 0 }
    expect(shouldShowResume(NOW, justUnder)).toBe(false)
    expect(shouldShowResume(NOW, exactly)).toBe(false)
    expect(shouldShowResume(NOW, over)).toBe(true)
  })

  it('ignores a clock that jumped backwards', () => {
    expect(shouldShowResume(NOW, { lastVisitAt: NOW + 60_000, factCount: 0 })).toBe(false)
  })
})

describe('resume content (Task 100 §1)', () => {
  it('counts the four progress lists', () => {
    expect(characterFactCount(emptyCharacter)).toBe(0)
    expect(characterFactCount(withFacts(3, 2))).toBe(5)
  })

  it('reports facts gained since the snapshot, never negative', () => {
    const snapshot: ResumeSnapshot = { lastVisitAt: NOW, factCount: 2 }
    expect(buildResume(withFacts(3, 2), snapshot, { area: 'Limgrave', goal: 'Elden Lord' }).added).toBe(3)
    expect(buildResume(withFacts(1, 0), snapshot).added).toBe(0)
  })

  it('carries the supplied area / goal / next through', () => {
    const data = buildResume(withFacts(1, 1), { lastVisitAt: NOW, factCount: 0 }, {
      area: 'Liurnia',
      goal: 'Age of Stars',
      next: 'Enter Ranni’s service',
      nextFactId: 'quest:ranni:service',
    })
    expect(data).toMatchObject({
      area: 'Liurnia',
      goal: 'Age of Stars',
      next: 'Enter Ranni’s service',
      nextFactId: 'quest:ranni:service',
      added: 2,
      factCount: 2,
    })
  })
})
