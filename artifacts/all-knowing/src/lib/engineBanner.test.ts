import { describe, expect, it } from 'vitest'
import { engineBanner, engineChipLabel, type EngineState } from './mapEngine'

function state(live?: { enabled: boolean; status: string }): EngineState {
  return {
    savePath: 'ER0000.sl2',
    characters: [],
    markerCount: 0,
    live,
    at: 0,
  }
}

describe('engineBanner', () => {
  it('calls offline “using static plates”, never an error', () => {
    const banner = engineBanner('offline', null)
    expect(banner.label).toMatch(/plates/i)
    expect(`${banner.label} ${banner.detail}`).not.toMatch(/error/i)
    expect(banner.tone).toBe('idle')
    expect(banner.liveMemory).toBe(false)
  })

  it('reports a connecting engine without alarm', () => {
    const banner = engineBanner('connecting', null)
    expect(banner.label).toMatch(/connecting/i)
    expect(`${banner.label} ${banner.detail}`).not.toMatch(/error/i)
  })

  it('reports connected once SSE is up', () => {
    const banner = engineBanner('live', state())
    expect(banner.label).toMatch(/connected/i)
    expect(banner.tone).toBe('ok')
  })

  it('only surfaces live-memory when the API exposes it enabled', () => {
    expect(engineBanner('live', state({ enabled: false, status: 'off' })).liveMemory).toBe(false)
    const on = engineBanner('live', state({ enabled: true, status: 'reading' }))
    expect(on.liveMemory).toBe(true)
    expect(on.detail).toMatch(/live player position/i)
    // Even offline, it must not claim live-memory unless the API said so.
    expect(engineBanner('offline', null).liveMemory).toBe(false)
  })

  it('has a compact chip label per state', () => {
    expect(engineChipLabel('live')).toBe('engine live')
    expect(engineChipLabel('connecting')).toBe('engine…')
    expect(engineChipLabel('offline')).toBe('plates')
  })
})
