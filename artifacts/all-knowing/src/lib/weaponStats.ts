import { damageTypeLabels, loadWeapons, type AttackPowerType, type Weapon } from './ar'

/**
 * Numeric weapon params, surfaced. The repo already holds the full vanilla 1.17
 * weapon table (`regulation-vanilla-v1.17.json` -> `ar.ts` decodes it for the
 * AR calculator); the Codex only ever showed FanAPI's weight/category. This
 * formats the same decoded data into requirements, scaling letters and base
 * attack, so the numbers are visible without a second extraction.
 *
 * One row per weapon: the Standard affinity (0) when it exists, else unique
 * (-1), else the lowest affinity — the base a player sees before infusing.
 */
const ATTR_LABELS: Record<string, string> = {
  str: 'Str',
  dex: 'Dex',
  int: 'Int',
  fai: 'Fai',
  arc: 'Arc',
}

const STATUS_LABELS: Record<number, string> = {
  5: 'Poison',
  6: 'Scarlet Rot',
  7: 'Bleed',
  8: 'Frost',
  9: 'Sleep',
  10: 'Madness',
  11: 'Death Blight',
}

export type WeaponStatRow = {
  name: string
  weaponName: string
  requirements: { attr: string; value: number }[]
  scaling: { attr: string; letter: string }[]
  attack: { label: string; value: number }[]
}

/** Highest tier whose threshold the value meets. `tiers` is descending (S first). */
export function scalingLetter(tiers: [number, string][], value: number): string {
  if (!value) return '–'
  for (const [min, letter] of tiers) {
    if (value >= min) return letter
  }
  return '–'
}

function affinityRank(affinityId: number): number {
  if (affinityId === 0) return 0
  if (affinityId === -1) return 1
  return 2 + affinityId
}

export function toWeaponStatRow(weapon: Weapon): WeaponStatRow {
  const scaling = weapon.attributeScaling[0] ?? {}
  const attack = weapon.attack[0] ?? {}
  return {
    name: weapon.name,
    weaponName: weapon.weaponName,
    requirements: Object.entries(weapon.requirements)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([attr, value]) => ({ attr: ATTR_LABELS[attr] ?? attr, value: value as number })),
    scaling: Object.entries(scaling)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([attr, value]) => ({
        attr: ATTR_LABELS[attr] ?? attr,
        letter: scalingLetter(weapon.scalingTiers, value as number),
      })),
    attack: (Object.keys(attack) as unknown as number[])
      .filter((k) => (attack[k as AttackPowerType] ?? 0) > 0)
      .map((k) => ({
        label: damageTypeLabels[k] ?? STATUS_LABELS[k] ?? String(k),
        value: attack[k as AttackPowerType] as number,
      })),
  }
}

/** One representative row per weapon name (Standard affinity preferred). */
export function baseWeaponRows(weapons: Weapon[]): WeaponStatRow[] {
  const best = new Map<string, Weapon>()
  for (const w of weapons) {
    const cur = best.get(w.weaponName)
    if (!cur || affinityRank(w.affinityId) < affinityRank(cur.affinityId)) best.set(w.weaponName, w)
  }
  return [...best.values()].map(toWeaponStatRow).sort((a, b) => a.name.localeCompare(b.name))
}

let cache: WeaponStatRow[] | null = null

export async function weaponStatRows(): Promise<WeaponStatRow[]> {
  if (cache) return cache
  cache = baseWeaponRows(await loadWeapons())
  return cache
}

export function matchWeaponStats(query: string, rows: WeaponStatRow[], limit = 12): WeaponStatRow[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, limit)
}
