import { useCallback, useMemo } from 'react'
import { useArmory } from '../lib/armory'
import { useFanapiData } from '../lib/fanapiData'
import type { LoadoutSlot } from '../types'
import type { GearInfo } from './presets'

/**
 * Task 110 — resolve a gear slot to its real weight and poise.
 *
 * Weapon/shield weights come from the armory dump first, then FanAPI; armor
 * weight and poise come from FanAPI's armor table. Anything not found simply
 * contributes nothing (no invented numbers). Shared by the preset cards, the
 * stat planner's equip-load readout and the current-loadout summary.
 */

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

function num(value: unknown): number {
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

export function useGearInfo(): { gearInfo: (slot: LoadoutSlot) => GearInfo } {
  const { weapons } = useArmory()
  const fan = useFanapiData()

  const weaponWeight = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of weapons) {
      const key = norm(w.name)
      const weight = num(w.weight)
      if (weight && !map.has(key)) map.set(key, weight)
    }
    for (const w of fan.weapons) {
      const key = norm(w.name)
      if (w.weight && !map.has(key)) map.set(key, w.weight)
    }
    for (const s of fan.shields) {
      const key = norm(s.name)
      if (s.weight && !map.has(key)) map.set(key, s.weight)
    }
    return map
  }, [weapons, fan])

  const armor = useMemo(() => {
    const map = new Map<string, { weight: number; poise: number }>()
    for (const a of fan.armors) map.set(norm(a.name), { weight: a.weight, poise: a.poise })
    return map
  }, [fan])

  const gearInfo = useCallback(
    (slot: LoadoutSlot): GearInfo => {
      const key = norm(slot.name)
      if (slot.kind === 'armor') {
        const a = armor.get(key)
        return a ? { weight: a.weight, poise: a.poise } : {}
      }
      const weight = weaponWeight.get(key)
      return weight ? { weight } : {}
    },
    [armor, weaponWeight],
  )

  return { gearInfo }
}
