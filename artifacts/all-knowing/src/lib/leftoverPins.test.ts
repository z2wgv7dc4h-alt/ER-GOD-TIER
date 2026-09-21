import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { warpGraces } from '../knowledge/graces'
import type { CoordPin } from './coords'
import { leftoverPins, resolveLeftover } from './leftoverPins'
import type { Character } from '../types'

function character(over: Partial<Character>): Character {
  return { ...emptyCharacter, ...over }
}

const coord = (over: Partial<CoordPin>): CoordPin => ({
  id: 'x',
  name: 'x',
  kind: 'item',
  world: 'overworld',
  x: 0,
  y: 0,
  ...over,
})

describe('resolveLeftover', () => {
  it('prefers the loot row’s grace pin (existing frame)', () => {
    const pos = resolveLeftover(
      { id: 'loot:g', name: 'Whatever', aliases: [], kind: 'item', region: 'R', campaign: 'base', grace: 'grace:elleh', how: '' },
      [],
    )
    const g = warpGraces.find((x) => x.id === 'grace:elleh')!
    expect(pos).toEqual({ x: g.x, y: g.y, world: g.world })
  })

  it('falls back to an exact name match in coords.json', () => {
    const pos = resolveLeftover(
      { id: 'loot:m', name: 'Moonveil', aliases: [], kind: 'weapon', region: 'Gael Tunnel', campaign: 'base', how: '' },
      [coord({ id: 'weapon-moonveil', name: 'Moonveil', x: 12.5, y: 34.5 })],
    )
    expect(pos).toEqual({ x: 12.5, y: 34.5, world: 'overworld' })
  })

  it('drops rows with no position rather than inventing one', () => {
    const pos = resolveLeftover(
      { id: 'loot:z', name: 'Unplaced Thing', aliases: [], kind: 'item', region: 'R', campaign: 'base', how: '' },
      [],
    )
    expect(pos).toBeNull()
  })
})

describe('leftoverPins', () => {
  it('produces the expected pin set for a character with known-missing facts', () => {
    const c = character({ discoveredGraces: ['grace:rotview'] })
    const pins = leftoverPins(c, [
      coord({ id: 'sorcery-stars-of-ruin', name: 'Stars of Ruin', x: 45.99, y: 60.42 }),
    ])
    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({
      id: 'loot:stars-of-ruin',
      name: 'Stars of Ruin',
      kind: 'item',
      region: 'Caelid',
      campaign: 'base',
      x: 45.99,
      y: 60.42,
      leftover: true,
    })
  })

  it('excludes facts the character already has', () => {
    const c = character({
      discoveredGraces: ['grace:rotview'],
      collectedItems: ['loot:stars-of-ruin'],
    })
    const pins = leftoverPins(c, [coord({ name: 'Stars of Ruin' })])
    expect(pins).toEqual([])
  })

  it('resolves a grace-anchored leftover and maps spirit loot to spirit-ash', () => {
    const c = character({ answers: { lastRegion: 'Nokron' } })
    const pins = leftoverPins(c, [])
    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({ id: 'loot:mimic', kind: 'spirit-ash', leftover: true })
  })

  it('limits pins to the world being viewed', () => {
    const c = character({ answers: { lastRegion: 'Nokron' } })
    expect(leftoverPins(c, [], { world: 'underground' })).toHaveLength(1)
    expect(leftoverPins(c, [], { world: 'overworld' })).toEqual([])
  })

  it('skips region leftovers that cannot be placed', () => {
    const c = character({})
    expect(leftoverPins(c, [], { region: 'craft' })).toEqual([])
  })

  it('binds watched loot, and drops watched loot that is already known', () => {
    const c = character({ answers: { watch: 'loot:moonveil' } })
    const coords = [coord({ id: 'weapon-moonveil', name: 'Moonveil', x: 5, y: 6 })]
    const pins = leftoverPins(c, coords)
    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({ id: 'loot:moonveil', x: 5, y: 6, leftover: true })

    const known = character({ answers: { watch: 'loot:moonveil' }, collectedItems: ['loot:moonveil'] })
    expect(leftoverPins(known, coords)).toEqual([])
  })

  it('does not duplicate a watched item that is also a current-region leftover', () => {
    const c = character({ discoveredGraces: ['grace:rotview'], answers: { watch: 'loot:stars-of-ruin' } })
    const pins = leftoverPins(c, [coord({ name: 'Stars of Ruin' })])
    expect(pins).toHaveLength(1)
  })
})
