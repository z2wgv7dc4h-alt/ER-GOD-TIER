import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eldenringMapPins } from './eldenringMapPins'
import type { EldenringMap } from './packs'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/eldenringmap.json', import.meta.url), 'utf8'),
) as EldenringMap

describe('eldenringMapPins', () => {
  it('turns overworld dungeons into percent pins on the plate frame', () => {
    const pins = eldenringMapPins(doc, 'overworld')
    const cave = pins.find((p) => p.name === 'Coastal Cave')
    expect(cave).toBeTruthy()
    expect(cave!.kind).toBe('dungeon')
    expect(cave!.x).toBeCloseTo((3491 / 10496) * 100, 3)
    expect(cave!.campaign).toBe('base')
  })

  it('keeps worlds apart', () => {
    const over = eldenringMapPins(doc, 'overworld')
    const shadow = eldenringMapPins(doc, 'shadow')
    expect(over.every((p) => p.campaign === 'base')).toBe(true)
    expect(shadow.some((p) => p.campaign === 'sote')).toBe(true)
    // scadutree is DLC-only, so it appears in shadow and not overworld
    expect(over.some((p) => p.id.startsWith('erm:scadutree:'))).toBe(false)
    expect(shadow.some((p) => p.id.startsWith('erm:scadutree:'))).toBe(true)
  })

  it('includes merchants, night bosses and collectibles', () => {
    const pins = eldenringMapPins(doc, 'overworld')
    expect(pins.some((p) => p.kind === 'npc')).toBe(true)
    expect(pins.some((p) => p.kind === 'boss')).toBe(true)
    expect(pins.some((p) => p.id.startsWith('erm:golden_seed:'))).toBe(true)
  })
})
