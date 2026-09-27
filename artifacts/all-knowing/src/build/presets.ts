import { attackRatingForSlot, type Weapon } from '../lib/ar'
import { equipLoad, type EquipLoad } from '../lib/gearSheet'
import type { Character, LoadoutSlot, Stats } from '../types'

/**
 * Task 110 §1 — loadout presets.
 *
 * A preset is a named snapshot of the gear slots (weapons, armor, talismans,
 * spells) that can be re-applied in one tap. Presets live in the vault via
 * `character.answers.buildPresets` (a JSON string), so they travel with the
 * active profile and need no new persistence layer.
 *
 * Everything here is pure: parse/save/rename/delete/apply all return a new
 * `Character`, and `presetSummary` computes the at-a-glance numbers the preset
 * card shows (right-hand AR, equip-load %, class and poise) from data the
 * caller already has.
 */

export type LoadoutPreset = {
  id: string
  name: string
  /** The saved gear, in loadout order. */
  loadout: LoadoutSlot[]
  createdAt: number
}

export const PRESETS_KEY = 'buildPresets'

const ARMAMENT: LoadoutSlot['kind'][] = ['armament', 'catalyst', 'shield']

export type GearInfo = { weight?: number; poise?: number }

export type PresetSummary = {
  /** Name of the right-hand 1 armament (or the first armament when unset). */
  rightHand: string | null
  /** Attack rating for that weapon at the character's stats, or null. */
  ar: number | null
  weight: number
  load: EquipLoad
  poise: number
}

function asPreset(value: unknown): LoadoutPreset | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.name !== 'string' || !Array.isArray(o.loadout)) return null
  const loadout = (o.loadout as unknown[]).filter(
    (s): s is LoadoutSlot => Boolean(s) && typeof (s as LoadoutSlot).name === 'string',
  )
  return {
    id: o.id,
    name: o.name,
    loadout,
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : 0,
  }
}

/** Read the presets saved on a character. Corrupt/absent data yields []. */
export function parsePresets(character: Character): LoadoutPreset[] {
  const raw = character.answers[PRESETS_KEY]
  if (typeof raw !== 'string' || !raw) return []
  try {
    const doc: unknown = JSON.parse(raw)
    if (!Array.isArray(doc)) return []
    return doc.map(asPreset).filter((p): p is LoadoutPreset => p !== null)
  } catch {
    return []
  }
}

function write(character: Character, presets: LoadoutPreset[]): Character {
  return { ...character, answers: { ...character.answers, [PRESETS_KEY]: JSON.stringify(presets) } }
}

/** Save the given loadout as a named preset, or replace the one with `id`. */
export function savePreset(character: Character, name: string, loadout: LoadoutSlot[], id?: string): Character {
  const presets = parsePresets(character)
  const trimmed = name.trim() || 'Loadout'
  if (id && presets.some((p) => p.id === id)) {
    return write(character, presets.map((p) => (p.id === id ? { ...p, name: trimmed, loadout: loadout.map((s) => ({ ...s })) } : p)))
  }
  const preset: LoadoutPreset = {
    id: id ?? `preset-${Date.now().toString(36)}-${presets.length}`,
    name: trimmed,
    loadout: loadout.map((s) => ({ ...s })),
    createdAt: Date.now(),
  }
  return write(character, [...presets, preset])
}

export function deletePreset(character: Character, id: string): Character {
  return write(character, parsePresets(character).filter((p) => p.id !== id))
}

export function renamePreset(character: Character, id: string, name: string): Character {
  const trimmed = name.trim()
  if (!trimmed) return character
  return write(character, parsePresets(character).map((p) => (p.id === id ? { ...p, name: trimmed } : p)))
}

/** Swap the character's loadout for the preset's gear. Unknown ids are a no-op. */
export function applyPreset(character: Character, id: string): Character {
  const preset = parsePresets(character).find((p) => p.id === id)
  if (!preset) return character
  return { ...character, loadout: preset.loadout.map((s) => ({ ...s })) }
}

/** The right-hand 1 armament, or the first equipable weapon, or null. */
export function rightHandSlot(loadout: LoadoutSlot[]): LoadoutSlot | null {
  return loadout.find((s) => s.slot === 'right-1') ?? loadout.find((s) => ARMAMENT.includes(s.kind)) ?? null
}

/**
 * The numbers a preset card shows. `gearInfo` resolves each slot to its real
 * weight/poise (from the catalogue); when it cannot, the slot simply does not
 * contribute rather than inventing a number.
 */
export function presetSummary(
  preset: LoadoutPreset,
  stats: Stats,
  weapons: Weapon[] | null | undefined,
  gearInfo: (slot: LoadoutSlot) => GearInfo = () => ({}),
): PresetSummary {
  const right = rightHandSlot(preset.loadout)
  let ar: number | null = null
  if (right && weapons?.length) {
    const rating = attackRatingForSlot(weapons, right, stats, false)
    ar = rating.status === 'ok' ? rating.total : null
  }
  let weight = 0
  let poise = 0
  for (const slot of preset.loadout) {
    const info = gearInfo(slot)
    weight += info.weight ?? 0
    poise += info.poise ?? 0
  }
  weight = Math.round(weight * 10) / 10
  return { rightHand: right?.name ?? null, ar, weight, load: equipLoad(weight, stats.endurance), poise }
}

/** The same summary for the character's current loadout (the "current" card). */
export function currentSummary(
  character: Character,
  weapons: Weapon[] | null | undefined,
  gearInfo: (slot: LoadoutSlot) => GearInfo = () => ({}),
): PresetSummary {
  return presetSummary(
    { id: '__current', name: 'Current', loadout: character.loadout, createdAt: 0 },
    character.stats,
    weapons,
    gearInfo,
  )
}
