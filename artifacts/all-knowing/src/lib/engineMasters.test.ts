import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MASTER_ORDER,
  SOTE_UNDERGROUND_AREAS,
  resolveMasterPreference,
  visibleMasterIds,
  withUndergroundBadge,
  type MasterMap,
} from './engineMasters'

const manifest = { M00: {}, M01: {}, M10: {}, M11: { hidden: true } } as unknown as MasterMap

describe('engine master visibility (Task 128)', () => {
  it('excludes hidden masters from the switcher list', () => {
    expect(visibleMasterIds(manifest)).toEqual(['M00', 'M01', 'M10'])
    expect(MASTER_ORDER).toContain('M11')
    expect(visibleMasterIds(manifest)).not.toContain('M11')
  })

  it('excludes absent masters too', () => {
    expect(visibleMasterIds({ M00: {}, M10: {} })).toEqual(['M00', 'M10'])
    expect(visibleMasterIds(null)).toEqual([])
  })

  it('falls a stored M11 preference back to M10', () => {
    expect(resolveMasterPreference('M11', manifest)).toBe('M10')
    expect(resolveMasterPreference('M10', manifest)).toBe('M10')
    expect(resolveMasterPreference('M00', manifest)).toBe('M00')
    expect(resolveMasterPreference(undefined, manifest)).toBe('M10')
  })

  it('falls back to the first visible master when M10 is gone', () => {
    expect(resolveMasterPreference('M11', { M00: {}, M01: {} })).toBe('M00')
    expect(resolveMasterPreference('M11', {})).toBeNull()
  })
})

describe('SotE underground badge (Task 128)', () => {
  it('covers exactly the retired M11 areas', () => {
    expect([...SOTE_UNDERGROUND_AREAS].sort((a, b) => a - b)).toEqual([22, 25, 40, 41, 42, 43])
  })

  it('appends the badge once, only to underground areas', () => {
    expect(withUndergroundBadge('Stone Coffin Fissure', 22)).toBe('Stone Coffin Fissure · underground')
    expect(withUndergroundBadge('Bonny Gaol', 41)).toBe('Bonny Gaol · underground')
    expect(withUndergroundBadge('Bonny Gaol', 60)).toBe('Bonny Gaol')
    expect(withUndergroundBadge('Stone Coffin Fissure · underground', 22)).toBe('Stone Coffin Fissure · underground')
  })
})

/**
 * The regenerated engine feed (`scripts/export-engine-markers.mjs`). This is the
 * committed output of `build_markers.py` + `map:merge`, so it proves the
 * routing end to end: nothing left on M11, and every retired M11 marker back on
 * its M10 surface entrance with the badge.
 */
const engine = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/engine-markers.json', import.meta.url), 'utf8'),
) as { markers: { id: string; name: string; master: string }[] }

describe('engine marker feed — M11 retirement', () => {
  it('has no marker on the retired M11 master', () => {
    const onM11 = engine.markers.filter((m) => m.master === 'M11')
    expect(onM11.map((m) => m.id)).toEqual([])
  })

  it('puts the former M11 areas on M10 with the underground badge', () => {
    const ids = [
      'grace:220000', 'grace:220001', 'grace:220002', 'grace:220003', 'grace:220004',
      'grace:400200', 'grace:410100', 'grace:410200', 'grace:420000', 'grace:420200',
      'grace:430100', 'grace:430101',
      'boss:22000800', 'boss:41010800', 'boss:41020800', 'boss:43010800',
      'poi:220000', 'poi:220001', 'poi:400200', 'poi:410100', 'poi:410200',
      'poi:420000', 'poi:420200', 'poi:430100',
    ]
    const byId = new Map(engine.markers.map((m) => [m.id, m] as const))
    for (const id of ids) {
      const m = byId.get(id)
      expect(m, `${id} missing from engine feed`).toBeTruthy()
      expect(m?.master, `${id} master`).toBe('M10')
      expect(m?.name, `${id} badge`).toContain('underground')
    }
  })
})
