import { describe, expect, it } from 'vitest'
import { askGideonRouter, isFastLookup } from './gideon'
import { emptyCharacter } from '../data/seed'
import type { NpcPlacement } from './npcPlacements'

// A name the authored tables and storylines do not know, so only the placed-NPC
// fallback can answer it.
const placements: NpcPlacement[] = [
  { npc: 990001, name: 'Test Speaker', map: 'm60_44_34_00', x: 0, y: 0, z: 0 },
  { npc: 990001, name: 'Test Speaker', map: 'm11_00_00_00', x: 0, y: 0, z: 0 },
]

describe('Gideon placed-NPC fallback', () => {
  it('reports maps for an NPC not in the authored locator', () => {
    const act = askGideonRouter('where is Test Speaker', emptyCharacter, {}, [], undefined, placements)
    expect(act.say).toContain('Test Speaker')
    expect(act.say).toContain('2 maps')
    expect(act.say).toContain('m11_00_00_00')
  })

  it('keeps the answer deterministic', () => {
    expect(isFastLookup('where is Test Speaker', {}, [], placements)).toBe(true)
  })
})
