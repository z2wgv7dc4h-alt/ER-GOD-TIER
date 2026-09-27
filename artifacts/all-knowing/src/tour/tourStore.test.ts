import { beforeEach, describe, expect, it } from 'vitest'
import {
  TOUR_STEPS,
  endTour,
  hasSeenTour,
  markTourSeen,
  resetTourSeen,
  startTour,
  tourIsOpen,
} from './tourStore'

describe('first-run tour (Task 117)', () => {
  beforeEach(() => {
    resetTourSeen()
    endTour(false)
  })

  it('has the five coach marks the spec names', () => {
    expect(TOUR_STEPS).toHaveLength(5)
    expect(TOUR_STEPS.map((s) => s.title)).toEqual([
      'Tarnished',
      'Journey',
      'Library',
      'Gideon',
      'Log what you just did',
    ])
    for (const step of TOUR_STEPS) {
      expect(step.body.length).toBeGreaterThan(0)
    }
  })

  it('is unseen until it is finished or skipped, then stays seen', () => {
    expect(hasSeenTour()).toBe(false)
    markTourSeen()
    expect(hasSeenTour()).toBe(true)
    resetTourSeen()
    expect(hasSeenTour()).toBe(false)
  })

  it('opens on replay and marks itself seen when closed', () => {
    expect(tourIsOpen()).toBe(false)
    startTour()
    expect(tourIsOpen()).toBe(true)
    endTour(true)
    expect(tourIsOpen()).toBe(false)
    expect(hasSeenTour()).toBe(true)
  })
})
