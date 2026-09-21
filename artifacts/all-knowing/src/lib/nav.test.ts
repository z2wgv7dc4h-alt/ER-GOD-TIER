import { describe, expect, it } from 'vitest'
import { layerOrder, modules } from './nav'
import type { MarkerKind, ModuleId } from '../types'

const allRooms: ModuleId[] = ['reckon', 'map', 'build', 'quests', 'codex']
const allLayers: MarkerKind[] = ['grace', 'boss', 'item', 'npc', 'fragment', 'spirit-ash', 'dungeon']

describe('room nav model', () => {
  it('covers all five rooms exactly once', () => {
    expect(modules.map((m) => m.id).sort()).toEqual([...allRooms].sort())
  })

  it('keeps the desktop label and gives the tab bar a short one', () => {
    for (const m of modules) {
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.short.length).toBeGreaterThan(0)
      expect(m.short.length).toBeLessThanOrEqual(8)
    }
    expect(modules.find((m) => m.id === 'build')?.label).toBe('Build lab')
    expect(modules.find((m) => m.id === 'quests')?.label).toBe('Quest graph')
  })
})

describe('atlas layer model', () => {
  it('lists every marker kind exactly once', () => {
    expect([...layerOrder].sort()).toEqual([...allLayers].sort())
    expect(new Set(layerOrder).size).toBe(layerOrder.length)
  })
})
