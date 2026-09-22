import { useEffect, useState } from 'react'

/**
 * Structured reference data ingested from FanAPI by `scripts/ingest-fanapi.mjs`
 * (Task 67). Only the fields FanAPI exposes as JSON are stored — armor
 * poise/negation/resistance, talisman effects, spell cost/slots/requirements,
 * Ash of War skill/affinity, spirit-ash FP/HP. No article bodies, no images, no
 * attack-rating numbers (those stay in the in-repo regulation data).
 */
export type ArmorRow = {
  name: string
  category: string
  weight: number
  poise: number
  dmgNegation: Record<string, number>
  resistance: Record<string, number>
}
export type TalismanRow = { name: string; effect: string }
export type SpellRow = {
  name: string
  type: string
  cost: number
  slots: number
  requires: Record<string, number>
  effect: string
}
export type AshRow = { name: string; affinity: string; skill: string }
export type SpiritRow = { name: string; fpCost: number; hpCost: number; effect: string }
export type ItemRow = { name: string; type: string; effect: string }
export type LocationRow = { name: string; region: string }
export type CreatureRow = { name: string; location: string; drops: string[] }
export type BossRow = { name: string; region: string; location: string; hp: number; drops: string[] }
export type NpcRow = { name: string; location: string; role: string }
export type AmmoRow = { name: string; type: string; passive: string }
export type ClassRow = { name: string; level: number; stats: Record<string, string> }
export type EquipmentRow = { name: string; category: string; weight: number }

export type FanapiData = {
  armors: ArmorRow[]
  talismans: TalismanRow[]
  spells: SpellRow[]
  ashes: AshRow[]
  spirits: SpiritRow[]
  items: ItemRow[]
  locations: LocationRow[]
  creatures: CreatureRow[]
  bosses: BossRow[]
  npcs: NpcRow[]
  ammos: AmmoRow[]
  classes: ClassRow[]
  weapons: EquipmentRow[]
  shields: EquipmentRow[]
}

const EMPTY: FanapiData = {
  armors: [], talismans: [], spells: [], ashes: [], spirits: [],
  items: [], locations: [], creatures: [], bosses: [], npcs: [],
  ammos: [], classes: [], weapons: [], shields: [],
}
const FILES = [
  'armors', 'talismans', 'spells', 'ashes', 'spirits',
  'items', 'locations', 'creatures', 'bosses', 'npcs',
  'ammos', 'classes', 'weapons', 'shields',
] as const

let cache: FanapiData | null = null

export function useFanapiData(): FanapiData {
  const [rows, setRows] = useState<FanapiData>(cache ?? EMPTY)
  useEffect(() => {
    if (cache) return
    let cancelled = false
    void Promise.all(
      FILES.map((f) => fetch(`/sourced/open/fanapi/${f}.json`).then((r) => r.json())),
    )
      .then((loaded) => {
        const next = {} as Record<string, unknown>
        FILES.forEach((f, i) => { next[f] = loaded[i] })
        cache = next as FanapiData
        if (!cancelled) setRows(cache)
      })
      .catch(() => {
        /* reference data is optional; leave the sections empty */
      })
    return () => {
      cancelled = true
    }
  }, [])
  return rows
}

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

function search<T extends { name: string }>(text: string, rows: T[], limit: number): T[] {
  const n = norm(text)
  if (n.length < 3) return []
  const hits = rows.filter((r) => norm(r.name).includes(n))
  return hits.slice(0, limit)
}

export const matchTalismans = (text: string, rows: TalismanRow[], limit = 8) => search(text, rows, limit)
export const matchSpells = (text: string, rows: SpellRow[], limit = 8) => search(text, rows, limit)
export const matchAshes = (text: string, rows: AshRow[], limit = 8) => search(text, rows, limit)
export const matchArmors = (text: string, rows: ArmorRow[], limit = 8) => search(text, rows, limit)
export const matchItems = (text: string, rows: ItemRow[], limit = 8) => search(text, rows, limit)
export const matchLocations = (text: string, rows: LocationRow[], limit = 8) => search(text, rows, limit)
export const matchCreatures = (text: string, rows: CreatureRow[], limit = 8) => search(text, rows, limit)
export const matchBosses = (text: string, rows: BossRow[], limit = 8) => search(text, rows, limit)
export const matchNpcs = (text: string, rows: NpcRow[], limit = 8) => search(text, rows, limit)
export const matchAmmos = (text: string, rows: AmmoRow[], limit = 8) => search(text, rows, limit)
export const matchClasses = (text: string, rows: ClassRow[], limit = 8) => search(text, rows, limit)
export const matchEquipment = (text: string, rows: EquipmentRow[], limit = 8) => search(text, rows, limit)

/** Talisman effect from FanAPI, or undefined when the name is not in the set. */
export function talismanEffect(rows: TalismanRow[], name: string): string | undefined {
  const n = norm(name)
  return rows.find((r) => norm(r.name) === n)?.effect || undefined
}

/** Real poise/negation for an armor piece, or undefined when not in the set. */
export function armorByName(rows: ArmorRow[], name: string): ArmorRow | undefined {
  const n = norm(name)
  return rows.find((r) => norm(r.name) === n)
}
