import { beforeEach, describe, expect, it } from 'vitest'
import { clearResultPins, getResultPins, recordResultPin, resultMarkers } from './resultPins'

describe('result pin store (Task 111 §1)', () => {
  beforeEach(() => clearResultPins())

  it('records newest first and dedupes by fact id', () => {
    recordResultPin({ factId: 'grace:first-step', at: 1 })
    recordResultPin({ factId: 'boss:margit', at: 2 })
    recordResultPin({ factId: 'grace:first-step', at: 3 })
    const pins = getResultPins()
    expect(pins.map((p) => p.factId)).toEqual(['grace:first-step', 'boss:margit'])
    expect(pins[0].at).toBe(3)
  })

  it('keeps the label given at open time', () => {
    recordResultPin({ factId: 'boss:margit', label: 'Margit' })
    expect(getResultPins()[0].label).toBe('Margit')
  })

  it('clears', () => {
    recordResultPin({ factId: 'boss:margit' })
    clearResultPins()
    expect(getResultPins()).toEqual([])
  })
})

describe('resultMarkers (Task 111 §1)', () => {
  beforeEach(() => clearResultPins())

  it('resolves grounded results for the viewed world only', () => {
    recordResultPin({ factId: 'grace:first-step', label: 'The First Step' })
    recordResultPin({ factId: 'grace:gravesite' })
    expect(resultMarkers(getResultPins(), [], 'overworld').map((m) => m.id)).toEqual(['grace:first-step'])
    expect(resultMarkers(getResultPins(), [], 'shadow').map((m) => m.id)).toEqual(['grace:gravesite'])
  })

  it('drops results with no grounded position', () => {
    recordResultPin({ factId: 'nonsense:thing' })
    expect(resultMarkers(getResultPins(), [])).toEqual([])
  })
})
