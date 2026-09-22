import { describe, expect, it } from 'vitest'
import { resolveSelection } from './atlasSelection'
import type { MapMarker } from '../types'
import type { EngineMarker } from './mapEngine'

function plate(id: string, name: string): MapMarker {
  return { id, name, kind: 'grace', region: 'Limgrave', campaign: 'base', x: 1, y: 2 }
}
function engine(id: string, name: string): EngineMarker {
  return { id, category: 'grace', names: { en: name } }
}

const platePins = [plate('grace:first-step', 'The First Step')]
const enginePins = [engine('grace:engine-a', 'Engine Grace A'), engine('grace:engine-b', 'Engine Grace B')]

describe('resolveSelection — one projection per view (Task 09 Part C)', () => {
  it('engine live, no id: defaults to the engine list, never a hidden plate pin', () => {
    const s = resolveSelection({
      selectedQ: null,
      engineLive: true,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(s.selectedId).toBe('grace:engine-a')
    expect(s.selectedName).toBe('Engine Grace A')
    expect(s.pin).toBeUndefined()
  })

  it('engine live, empty engine list: no id and a prompt, not a plate pin', () => {
    const s = resolveSelection({
      selectedQ: null,
      engineLive: true,
      platePins,
      shown: platePins,
      enginePins: [],
      engineList: [],
    })
    expect(s.selectedId).toBeUndefined()
    expect(s.selectedName).toBe('Select a marker')
  })

  it('engine live, engine id: names that marker even if it is not first', () => {
    const s = resolveSelection({
      selectedQ: 'grace:engine-b',
      engineLive: true,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(s.selectedId).toBe('grace:engine-b')
    expect(s.selectedName).toBe('Engine Grace B')
  })

  it('engine live, plate-only id (a Codex/Gideon link): keeps and names it, does not jump to engine[0]', () => {
    const s = resolveSelection({
      selectedQ: 'grace:first-step',
      engineLive: true,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(s.selectedId).toBe('grace:first-step')
    expect(s.selectedName).toBe('The First Step')
  })

  it('offline, no id: defaults to the first shown plate pin', () => {
    const s = resolveSelection({
      selectedQ: null,
      engineLive: false,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(s.selectedId).toBe('grace:first-step')
    expect(s.selectedName).toBe('The First Step')
    expect(s.pin?.id).toBe('grace:first-step')
  })

  it('offline, empty shown: prompt, not an engine marker', () => {
    const s = resolveSelection({
      selectedQ: null,
      engineLive: false,
      platePins,
      shown: [],
      enginePins,
      engineList: enginePins,
    })
    expect(s.selectedId).toBeUndefined()
    expect(s.selectedName).toBe('Select a pin')
  })

  it('offline, engine-only id: keeps the id and labels it, does not bleed to a plate pin', () => {
    const s = resolveSelection({
      selectedQ: 'boss:unknown-thing',
      engineLive: false,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(s.selectedId).toBe('boss:unknown-thing')
    expect(s.selectedName).toBe('unknown thing')
  })

  it('invariant: the default id always belongs to the active view', () => {
    const live = resolveSelection({
      selectedQ: null,
      engineLive: true,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(enginePins.some((m) => m.id === live.selectedId)).toBe(true)
    const offline = resolveSelection({
      selectedQ: null,
      engineLive: false,
      platePins,
      shown: platePins,
      enginePins,
      engineList: enginePins,
    })
    expect(platePins.some((m) => m.id === offline.selectedId)).toBe(true)
  })
})
