import { describe, expect, it } from 'vitest'
import { MAP_ENGINE_BASE, resolveEngineStatus } from './mapEngine'

/**
 * Task 159 — the engine ships as static app assets, so "are the files there?"
 * decides the live map. The PC save reader (SSE) is an optional extra and must
 * not be able to downgrade a shipped engine to the static plate.
 */
describe('engine availability (Task 159)', () => {
  it('serves the engine from the app origin in every build', () => {
    expect(MAP_ENGINE_BASE).toBe('/engine')
  })

  it('is live when the engine files load but no save reader is connected', () => {
    expect(resolveEngineStatus({ probed: true, staticUp: true, sseUp: false })).toBe('live')
  })

  it('is live when only the save reader is up (external engine)', () => {
    expect(resolveEngineStatus({ probed: true, staticUp: false, sseUp: true })).toBe('live')
  })

  it('never downgrades a live static engine when the SSE stream fails', () => {
    expect(resolveEngineStatus({ probed: true, staticUp: true, sseUp: false })).toBe('live')
  })

  it('is connecting until the probe answers', () => {
    expect(resolveEngineStatus({ probed: false, staticUp: false, sseUp: false })).toBe('connecting')
  })

  it('falls back to the plates only when the engine files are absent', () => {
    expect(resolveEngineStatus({ probed: true, staticUp: false, sseUp: false })).toBe('offline')
  })
})
