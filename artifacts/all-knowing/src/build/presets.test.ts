import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData, type Weapon } from '../lib/ar'
import { emptyCharacter } from '../data/seed'
import {
  applyPreset,
  currentSummary,
  deletePreset,
  parsePresets,
  presetSummary,
  renamePreset,
  rightHandSlot,
  savePreset,
} from './presets'
import type { Character, LoadoutSlot } from '../types'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

const gear: LoadoutSlot[] = [
  { id: 'u', name: 'Uchigatana', kind: 'armament', upgrade: 10, slot: 'right-1' },
  { id: 'a', name: 'Vagabond Knight Helm', kind: 'armor', slot: 'head' },
  { id: 't', name: 'Claw Talisman', kind: 'talisman', slot: 'talisman-1' },
]

const info = (slot: LoadoutSlot) => {
  if (slot.kind === 'armor') return { weight: 5.1, poise: 7 }
  if (slot.kind === 'armament') return { weight: 5.5 }
  return {}
}

describe('loadout presets (Task 110 §1)', () => {
  it('saves, parses, renames, applies and deletes', () => {
    const saved = savePreset(emptyCharacter, 'Boss', gear, 'p1')
    const presets = parsePresets(saved)
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('Boss')
    expect(presets[0].loadout).toHaveLength(3)

    const renamed = renamePreset(saved, 'p1', 'PvE boss')
    expect(parsePresets(renamed)[0].name).toBe('PvE boss')

    const applied = applyPreset(renamed, 'p1')
    expect(applied.loadout.map((s) => s.name)).toContain('Uchigatana')

    expect(parsePresets(deletePreset(applied, 'p1'))).toHaveLength(0)
  })

  it('survives corrupt stored data', () => {
    const broken: Character = { ...emptyCharacter, answers: { buildPresets: 'not json' } }
    expect(parsePresets(broken)).toEqual([])
  })

  it('summarises a preset with AR, equip load and poise', () => {
    const saved = savePreset(emptyCharacter, 'Boss', gear, 'p1')
    const preset = parsePresets(saved)[0]
    const summary = presetSummary(preset, emptyCharacter.stats, weapons, info)
    expect(summary.rightHand).toBe('Uchigatana')
    expect(summary.ar).toBeGreaterThan(0)
    expect(summary.poise).toBe(7)
    expect(summary.weight).toBe(10.6)
    expect(summary.load.loadClass).toBe('light')
  })

  it('summarises the current loadout through the same path', () => {
    const character = { ...emptyCharacter, loadout: gear }
    const summary = currentSummary(character, weapons, info)
    expect(summary.ar).toBeGreaterThan(0)
    expect(rightHandSlot(character.loadout)?.name).toBe('Uchigatana')
  })
})
