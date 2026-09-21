import { useEffect, useState } from 'react'

export type ArmoryWeapon = {
  name: string
  type: string
  dlc: boolean
  skill: string
  weight: string
  req: Record<string, string>
  where: string
}

export type ArmoryBoss = {
  name: string
  region: string
  type: string
  phase: number
  notes: string
  parryable: boolean | null
}

export type HuntRow = {
  id: string
  name: string
  place: string
  region: string
  flag: number
  campaign: 'base' | 'sote'
}

let weaponsCache: ArmoryWeapon[] | null = null
let bossesCache: ArmoryBoss[] | null = null
let huntsCache: HuntRow[] | null = null

export function useHunts() {
  const [hunts, setHunts] = useState<HuntRow[]>(huntsCache || [])
  useEffect(() => {
    if (huntsCache) return
    void fetch('/sourced/checklists/hunts.json').then((r) => r.json()).then((rows: HuntRow[]) => {
      huntsCache = rows
      setHunts(rows)
    })
  }, [])
  return hunts
}

export function useArmory() {
  const [weapons, setWeapons] = useState<ArmoryWeapon[]>(weaponsCache || [])
  const [bosses, setBosses] = useState<ArmoryBoss[]>(bossesCache || [])
  useEffect(() => {
    if (!weaponsCache) {
      void fetch('/sourced/armory-weapons.json').then((r) => r.json()).then((rows: ArmoryWeapon[]) => {
        weaponsCache = rows
        setWeapons(rows)
      })
    }
    if (!bossesCache) {
      void fetch('/sourced/armory-bosses.json').then((r) => r.json()).then((rows: ArmoryBoss[]) => {
        bossesCache = rows
        setBosses(rows)
      })
    }
  }, [])
  return { weapons, bosses }
}
