import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { bestEquippedAr, SIDE_GRADE_BAND_PCT, UPGRADE_GAIN_PCT, verdictFromAr } from './verdict'

const base = { meets: true, requirement: '', currentBestAr: 100, currentName: 'Uchigatana' }

describe('item verdict thresholds (Task 100 §3)', () => {
  it('is "not for you" when requirements are unmet, regardless of AR', () => {
    const v = verdictFromAr({ ...base, meets: false, requirement: 'needs 20 INT (you have 9)', candidateAr: 500 })
    expect(v.kind).toBe('not-for-you')
    expect(v.meets).toBe(false)
    expect(v.line).toContain('needs 20 INT (you have 9)')
  })

  it('is an upgrade at or above the gain threshold', () => {
    expect(verdictFromAr({ ...base, candidateAr: 100 * (1 + UPGRADE_GAIN_PCT / 100) }).kind).toBe('upgrade')
    expect(verdictFromAr({ ...base, candidateAr: 118 }).kind).toBe('upgrade')
    expect(verdictFromAr({ ...base, candidateAr: 118 }).line).toContain('Uchigatana')
  })

  it('is a side-grade inside the band', () => {
    expect(verdictFromAr({ ...base, candidateAr: 104 }).kind).toBe('side-grade')
    expect(verdictFromAr({ ...base, candidateAr: 96 }).kind).toBe('side-grade')
  })

  it('is "not for you" well below the current kit', () => {
    const v = verdictFromAr({ ...base, candidateAr: 100 - SIDE_GRADE_BAND_PCT })
    expect(v.kind).toBe('not-for-you')
    expect(v.meets).toBe(true)
  })

  it('treats nothing equipped as an upgrade', () => {
    expect(verdictFromAr({ ...base, currentBestAr: 0, currentName: undefined, candidateAr: 120 }).kind).toBe('upgrade')
  })
})

describe('best equipped AR', () => {
  it('is 0 when nothing is equipped', () => {
    expect(bestEquippedAr(emptyCharacter, []).ar).toBe(0)
  })
})
