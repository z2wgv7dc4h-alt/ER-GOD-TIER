import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import {
  areaFromFactId,
  areaLabel,
  deriveCurrentArea,
  isAreaStale,
  resolveCurrentArea,
  signalsFromCharacter,
  type AreaSignal,
} from './areaContext'

const sig = (over: Partial<AreaSignal>): AreaSignal => ({
  region: 'Limgrave',
  source: 'grace',
  at: 0,
  ...over,
})

function withEvidence(rows: { fact: string; at: number }[]): Character {
  return {
    ...emptyCharacter,
    evidence: rows.map((r, i) => ({ id: `e${i}`, fact: r.fact, source: 'answer', confidence: 1, at: r.at })),
  }
}

describe('currentArea derivation precedence', () => {
  it('is null when there is no signal', () => {
    expect(deriveCurrentArea([])).toBeNull()
    expect(deriveCurrentArea([null, undefined])).toBeNull()
  })

  it('picks the most recent signal regardless of source', () => {
    const older = sig({ region: 'Liurnia', source: 'map', at: 100 })
    const newer = sig({ region: 'Limgrave', source: 'grace', at: 200 })
    expect(deriveCurrentArea([older, newer])?.region).toBe('Limgrave')
    expect(deriveCurrentArea([newer, older])?.region).toBe('Limgrave')
  })

  it('breaks ties by source rank: engine > map > grace > fact', () => {
    const at = 500
    expect(deriveCurrentArea([sig({ region: 'Aaaa', source: 'grace', at }), sig({ region: 'Bbbb', source: 'map', at })])?.region).toBe('Bbbb')
    expect(deriveCurrentArea([sig({ region: 'Bbbb', source: 'map', at }), sig({ region: 'Cccc', source: 'engine', at })])?.region).toBe('Cccc')
    expect(deriveCurrentArea([sig({ region: 'Dddd', source: 'fact', at }), sig({ region: 'Aaaa', source: 'grace', at })])?.region).toBe('Aaaa')
  })

  it('ignores a signal with an empty region', () => {
    expect(deriveCurrentArea([sig({ region: '', at: 900 }), sig({ region: 'Limgrave', at: 1 })])?.region).toBe('Limgrave')
  })
})

describe('areaFromFactId', () => {
  it('maps a grace to region + place', () => {
    expect(areaFromFactId('grace:academy-gate')).toEqual({ region: 'Liurnia', place: 'South Raya Lucaria Gate' })
  })

  it('maps a region fact to its name and nothing finer', () => {
    expect(areaFromFactId('region:liurnia')).toEqual({ region: 'Liurnia of the Lakes' })
  })

  it('returns null for an id with no location', () => {
    expect(areaFromFactId('mechanic:upgrades')).toBeNull()
  })
})

describe('signalsFromCharacter', () => {
  it('prefers the newest evidence row for each of grace and fact', () => {
    const c = withEvidence([
      { fact: 'grace:elleh', at: 1000 },
      { fact: 'grace:academy-gate', at: 3000 },
      { fact: 'boss:godrick', at: 2000 },
      { fact: 'boss:margit', at: 4000 },
    ])
    const signals = signalsFromCharacter(c)
    expect(signals.find((s) => s.source === 'grace')).toMatchObject({ region: 'Liurnia', at: 3000 })
    expect(signals.find((s) => s.source === 'fact')).toMatchObject({ region: 'Stormveil', at: 4000 })
    expect(resolveCurrentArea(c, null)?.region).toBe('Stormveil')
  })

  it('falls back to the tail of authored lists when evidence is empty', () => {
    const c: Character = { ...emptyCharacter, discoveredGraces: ['grace:elleh', 'grace:academy-gate'] }
    const signals = signalsFromCharacter(c)
    expect(signals.find((s) => s.source === 'grace')?.region).toBe('Liurnia')
  })
})

describe('area label + staleness', () => {
  it('formats region · place, collapsing a duplicate', () => {
    expect(areaLabel(sig({ region: 'Liurnia', place: 'Raya Lucaria' }))).toBe('Liurnia · Raya Lucaria')
    expect(areaLabel(sig({ region: 'Limgrave', place: 'Limgrave' }))).toBe('Limgrave')
    expect(areaLabel(null)).toBe('')
  })

  it('flags an area older than 45 minutes', () => {
    const now = 10_000_000
    expect(isAreaStale(sig({ at: now - 46 * 60_000 }), now)).toBe(true)
    expect(isAreaStale(sig({ at: now - 44 * 60_000 }), now)).toBe(false)
    expect(isAreaStale(null, now)).toBe(false)
  })
})
