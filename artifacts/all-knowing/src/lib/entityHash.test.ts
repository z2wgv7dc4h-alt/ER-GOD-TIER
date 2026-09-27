import { describe, expect, it } from 'vitest'
import { hashToLocation } from './sections'
import { buildEntityHash, parseEntityHash } from './entityHash'

describe('entity overlay hash (Task 97)', () => {
  it('round-trips a fact id through the hash', () => {
    const hash = buildEntityHash('#/journey/map', 'boss:godrick')
    expect(hash).toBe('#/journey/map?e=boss%3Agodrick')
    expect(parseEntityHash(hash)).toBe('boss:godrick')
  })

  it('clears back to the bare location', () => {
    expect(buildEntityHash('#/journey/map?e=boss%3Agodrick', null)).toBe('#/journey/map')
    expect(parseEntityHash('#/journey/map')).toBeNull()
  })

  it('leaves the shell location parser untouched', () => {
    expect(hashToLocation('#/journey/map?e=boss%3Agodrick')).toEqual({ section: 'journey', sub: 'map' })
  })
})
