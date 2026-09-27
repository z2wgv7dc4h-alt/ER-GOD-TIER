import type { CategoryId } from '../library/model'
import { isOwned, type LibraryEntity } from '../library/model'
import type { Character, GearSlot, LoadoutSlot } from '../types'
import { loadClass, maxEquipLoad, type LoadClass } from '../knowledge/equipLoad'

/**
 * Task 94 — the Gear sheet's pure model. Slot order, the legacy-loadout
 * auto-arrangement, the replace-slot operation, owned-inventory grouping and
 * the equip-load arithmetic. No React and no fetching, so the sheet and the
 * tests share one source of truth.
 */

export type GearSlotGroup = 'armament' | 'armor' | 'talisman' | 'spell'

export type GearSlotMeta = {
  id: GearSlot
  label: string
  group: GearSlotGroup
  /** Loadout kinds that may occupy this slot. */
  kinds: LoadoutSlot['kind'][]
  /** Whichever the picker should offer first, then everything. */
  categories: CategoryId[]
}

/** Left-hand armament slots also hold catalysts (staffs/seals) and shields. */
const ARMAMENT_KINDS: LoadoutSlot['kind'][] = ['armament', 'catalyst', 'shield']
const ARMAMENT_CATEGORIES: CategoryId[] = ['weapons', 'shields']
const ARMOR_CATEGORIES: CategoryId[] = ['armor']
const TALISMAN_CATEGORIES: CategoryId[] = ['talismans']
const SPELL_CATEGORIES: CategoryId[] = ['sorceries', 'incantations']

export const GEAR_SLOTS: GearSlotMeta[] = [
  { id: 'right-1', label: 'Right 1', group: 'armament', kinds: ARMAMENT_KINDS, categories: ARMAMENT_CATEGORIES },
  { id: 'right-2', label: 'Right 2', group: 'armament', kinds: ARMAMENT_KINDS, categories: ARMAMENT_CATEGORIES },
  { id: 'right-3', label: 'Right 3', group: 'armament', kinds: ARMAMENT_KINDS, categories: ARMAMENT_CATEGORIES },
  { id: 'left-1', label: 'Left 1', group: 'armament', kinds: ARMAMENT_KINDS, categories: ARMAMENT_CATEGORIES },
  { id: 'left-2', label: 'Left 2', group: 'armament', kinds: ARMAMENT_KINDS, categories: ARMAMENT_CATEGORIES },
  { id: 'left-3', label: 'Left 3', group: 'armament', kinds: ARMAMENT_KINDS, categories: ARMAMENT_CATEGORIES },
  { id: 'head', label: 'Head', group: 'armor', kinds: ['armor'], categories: ARMOR_CATEGORIES },
  { id: 'chest', label: 'Chest', group: 'armor', kinds: ['armor'], categories: ARMOR_CATEGORIES },
  { id: 'arms', label: 'Arms', group: 'armor', kinds: ['armor'], categories: ARMOR_CATEGORIES },
  { id: 'legs', label: 'Legs', group: 'armor', kinds: ['armor'], categories: ARMOR_CATEGORIES },
  { id: 'talisman-1', label: 'Talisman 1', group: 'talisman', kinds: ['talisman'], categories: TALISMAN_CATEGORIES },
  { id: 'talisman-2', label: 'Talisman 2', group: 'talisman', kinds: ['talisman'], categories: TALISMAN_CATEGORIES },
  { id: 'talisman-3', label: 'Talisman 3', group: 'talisman', kinds: ['talisman'], categories: TALISMAN_CATEGORIES },
  { id: 'talisman-4', label: 'Talisman 4', group: 'talisman', kinds: ['talisman'], categories: TALISMAN_CATEGORIES },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map<GearSlotMeta>((n) => ({
    id: `spell-${n}` as GearSlot,
    label: `Spell ${n}`,
    group: 'spell',
    kinds: ['spell'],
    categories: SPELL_CATEGORIES,
  })),
]

export const GEAR_SLOT_COUNT = GEAR_SLOTS.length

export function gearSlotMeta(id: GearSlot): GearSlotMeta {
  return GEAR_SLOTS.find((s) => s.id === id) ?? GEAR_SLOTS[0]
}

export type ArrangedGear = Partial<Record<GearSlot, LoadoutSlot>>

/**
 * Place a loadout into the sheet. Rows with an explicit `slot` win; the rest
 * auto-fill the earliest open slot that accepts their kind, in loadout order.
 * A save dump or OP kit therefore still renders and still computes AR.
 */
export function arrangeLoadout(loadout: LoadoutSlot[]): ArrangedGear {
  const out: ArrangedGear = {}
  const used = new Set<number>()
  loadout.forEach((row, i) => {
    if (!row.slot) return
    if (!GEAR_SLOTS.some((s) => s.id === row.slot)) return
    if (out[row.slot]) return
    out[row.slot] = row
    used.add(i)
  })
  for (const meta of GEAR_SLOTS) {
    if (out[meta.id]) continue
    const idx = loadout.findIndex((row, i) => !used.has(i) && meta.kinds.includes(row.kind))
    if (idx >= 0) {
      out[meta.id] = loadout[idx]
      used.add(idx)
    }
  }
  return out
}

/**
 * Put `item` in `slot` (or clear the slot when `item` is null). Any row already
 * pinned to the slot is replaced; a display-only legacy row shown in the slot is
 * removed too, so auto-arrangement does not resurrect it.
 */
export function equipSlot(
  loadout: LoadoutSlot[],
  slot: GearSlot,
  item: LoadoutSlot | null,
  previous?: LoadoutSlot,
): LoadoutSlot[] {
  let next = loadout.filter((row) => row.slot !== slot)
  if (previous && previous.slot !== slot) next = next.filter((row) => row !== previous)
  if (item) next = [...next, { ...item, slot }]
  return next
}

export function clearSlot(loadout: LoadoutSlot[], slot: GearSlot, previous?: LoadoutSlot): LoadoutSlot[] {
  return equipSlot(loadout, slot, null, previous)
}

export type EquipLoad = {
  max: number
  total: number
  ratio: number
  pct: number
  loadClass: LoadClass
}

/** Total weight / max equip load for the character's Endurance. */
export function equipLoad(totalWeight: number, endurance: number): EquipLoad {
  const max = maxEquipLoad(endurance)
  const total = Number.isFinite(totalWeight) ? Math.max(0, totalWeight) : 0
  const ratio = max > 0 ? total / max : 0
  return { max, total, ratio, pct: Math.round(ratio * 100), loadClass: loadClass(ratio) }
}

export type OwnedGroup = {
  category: CategoryId
  label: string
  items: LibraryEntity[]
  count: number
}

/** Categories the Owned shelf shows, in rail order. */
export const OWNED_CATEGORIES: CategoryId[] = [
  'weapons',
  'shields',
  'armor',
  'talismans',
  'sorceries',
  'incantations',
  'ashes',
  'spirits',
  'items',
]

const CATEGORY_LABELS: Record<string, string> = {
  weapons: 'Weapons',
  shields: 'Shields',
  armor: 'Armor',
  talismans: 'Talismans',
  sorceries: 'Sorceries',
  incantations: 'Incantations',
  ashes: 'Ashes of War',
  spirits: 'Spirit Ashes',
  items: 'Items',
}

/**
 * The character's owned items, grouped by category and filtered by a search
 * query. Only rows the character actually owns count, so the shelf is a true
 * inventory rather than the whole catalogue.
 */
export function ownedInventory(
  entities: LibraryEntity[],
  character: Character,
  query = '',
): OwnedGroup[] {
  const q = query.trim().toLowerCase()
  return OWNED_CATEGORIES.map((category) => {
    const items = entities
      .filter((e) => e.category === category && isOwned(e, character))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { category, label: CATEGORY_LABELS[category] ?? category, items, count: items.length }
  }).filter((g) => g.count > 0)
}

/** Candidates for a slot's picker: owned first, then the rest. */
export function pickerCandidates(
  entities: LibraryEntity[],
  character: Character,
  slot: GearSlot,
): LibraryEntity[] {
  const meta = gearSlotMeta(slot)
  const rows = entities.filter((e) => meta.categories.includes(e.category))
  const owned = rows.filter((e) => isOwned(e, character))
  const rest = rows.filter((e) => !isOwned(e, character))
  return [...owned, ...rest]
}

/** The `LoadoutSlot.kind` a catalogue entity becomes when equipped. */
export function kindForEntity(entity: LibraryEntity): LoadoutSlot['kind'] {
  if (entity.category === 'armor') return 'armor'
  if (entity.category === 'talismans') return 'talisman'
  if (entity.category === 'sorceries' || entity.category === 'incantations') return 'spell'
  if (entity.category === 'shields') return 'shield'
  return 'armament'
}

export function slotFromEntity(entity: LibraryEntity, slot: GearSlot): LoadoutSlot {
  return { id: entity.factId || entity.id, name: entity.name, kind: kindForEntity(entity), slot }
}
