import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { maxEquipLoad } from '../knowledge/equipLoad'
import type { LibraryEntity } from '../library/model'
import type { LoadoutSlot } from '../types'
import {
  arrangeLoadout,
  clearSlot,
  equipLoad,
  equipSlot,
  ownedInventory,
  slotFromEntity,
} from './gearSheet'

describe('gear slot arrangement', () => {
  it('auto-fills legacy loadouts by kind, in loadout order', () => {
    const loadout: LoadoutSlot[] = [
      { id: 'a', name: 'Uchigatana', kind: 'armament' },
      { id: 'b', name: 'Brass Shield', kind: 'shield' },
      { id: 'c', name: 'Knight Helm', kind: 'armor' },
      { id: 'd', name: 'Radagon Icon', kind: 'talisman' },
      { id: 'e', name: 'Glintstone Pebble', kind: 'spell' },
    ]
    const arranged = arrangeLoadout(loadout)
    expect(arranged['right-1']?.id).toBe('a')
    expect(arranged['right-2']?.id).toBe('b')
    expect(arranged.head?.id).toBe('c')
    expect(arranged['talisman-1']?.id).toBe('d')
    expect(arranged['spell-1']?.id).toBe('e')
  })

  it('respects an explicit slot over auto-arrangement', () => {
    const loadout: LoadoutSlot[] = [
      { id: 'a', name: 'Uchigatana', kind: 'armament', slot: 'left-3' },
    ]
    expect(arrangeLoadout(loadout)['left-3']?.id).toBe('a')
    expect(arrangeLoadout(loadout)['right-1']).toBeUndefined()
  })

  it('equips and clears a slot without resurrecting the legacy row', () => {
    const loadout: LoadoutSlot[] = [{ id: 'a', name: 'Uchigatana', kind: 'armament' }]
    const arranged = arrangeLoadout(loadout)
    const item: LoadoutSlot = { id: 'item:rivers-of-blood', name: 'Rivers of Blood', kind: 'armament' }
    const equipped = equipSlot(loadout, 'right-1', item, arranged['right-1'])
    expect(equipped).toEqual([{ ...item, slot: 'right-1' }])
    const cleared = clearSlot(equipped, 'right-1', equipped[0])
    expect(cleared).toEqual([])
  })
})

describe('equip load', () => {
  it('uses the real max-load table at the key breakpoints', () => {
    expect(maxEquipLoad(8)).toBeCloseTo(45.0)
    expect(maxEquipLoad(25)).toBeCloseTo(72.0)
    expect(maxEquipLoad(60)).toBeCloseTo(120.0)
    expect(maxEquipLoad(99)).toBeCloseTo(160.0)
    expect(maxEquipLoad(1)).toBeCloseTo(45.0)
    expect(maxEquipLoad(200)).toBeCloseTo(160.0)
  })

  it('labels the load class at the 30% and 70% cutoffs', () => {
    expect(equipLoad(20, 25).loadClass).toBe('light')
    expect(equipLoad(40, 25).loadClass).toBe('medium')
    expect(equipLoad(60, 25).loadClass).toBe('heavy')
    expect(equipLoad(80, 25).loadClass).toBe('overloaded')
    expect(equipLoad(36, 25).pct).toBe(50)
  })
})

describe('owned inventory', () => {
  const entities: LibraryEntity[] = [
    { id: 'weapons:uchi', factId: 'item:uchi', name: 'Uchigatana', category: 'weapons' },
    { id: 'armor:helm', factId: 'item:helm', name: 'Knight Helm', category: 'armor' },
    { id: 'weapons:claymore', factId: 'item:claymore', name: 'Claymore', category: 'weapons' },
  ]

  it('groups only owned rows and filters by query', () => {
    const character = { ...emptyCharacter, collectedItems: ['item:uchi', 'item:helm'] }
    const groups = ownedInventory(entities, character)
    expect(groups.map((g) => g.category)).toEqual(['weapons', 'armor'])
    expect(groups[0].items.map((i) => i.name)).toEqual(['Uchigatana'])
    const filtered = ownedInventory(entities, character, 'helm')
    expect(filtered.map((g) => g.category)).toEqual(['armor'])
  })
})

describe('slotFromEntity', () => {
  it('maps a catalogue category to a loadout kind', () => {
    expect(slotFromEntity({ id: 'armor:helm', factId: 'item:helm', name: 'Knight Helm', category: 'armor' }, 'head')).toEqual({
      id: 'item:helm', name: 'Knight Helm', kind: 'armor', slot: 'head',
    })
  })
})
