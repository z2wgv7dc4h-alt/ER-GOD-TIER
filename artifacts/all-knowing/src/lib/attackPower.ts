import type { Stats } from '../types'

/**
 * Task 137 §4 — the tiny, dependency-free half of the AR model: attribute keys,
 * the attack-power enum and the stat mapping. It lives apart from `ar.ts` so
 * eagerly-loaded UI (build detection, gear scanning) can read these constants
 * without pulling the whole attack-rating calculator into the main entry chunk.
 */

export const allAttributes = ['str', 'dex', 'int', 'fai', 'arc'] as const
export type Attribute = (typeof allAttributes)[number]
export type Attributes = Record<Attribute, number>

export const AttackPowerType = {
  PHYSICAL: 0,
  MAGIC: 1,
  FIRE: 2,
  LIGHTNING: 3,
  HOLY: 4,
  POISON: 5,
  SCARLET_ROT: 6,
  BLEED: 7,
  FROST: 8,
  SLEEP: 9,
  MADNESS: 10,
  DEATH_BLIGHT: 11,
} as const
export type AttackPowerType = (typeof AttackPowerType)[keyof typeof AttackPowerType]

export const allDamageTypes: AttackPowerType[] = [
  AttackPowerType.PHYSICAL,
  AttackPowerType.MAGIC,
  AttackPowerType.FIRE,
  AttackPowerType.LIGHTNING,
  AttackPowerType.HOLY,
]

export const allStatusTypes: AttackPowerType[] = [
  AttackPowerType.POISON,
  AttackPowerType.SCARLET_ROT,
  AttackPowerType.BLEED,
  AttackPowerType.FROST,
  AttackPowerType.SLEEP,
  AttackPowerType.MADNESS,
  AttackPowerType.DEATH_BLIGHT,
]

export const damageTypeLabels: Record<number, string> = {
  [AttackPowerType.PHYSICAL]: 'Physical',
  [AttackPowerType.MAGIC]: 'Magic',
  [AttackPowerType.FIRE]: 'Fire',
  [AttackPowerType.LIGHTNING]: 'Lightning',
  [AttackPowerType.HOLY]: 'Holy',
}

export function statsToAttributes(stats: Stats): Attributes {
  return {
    str: stats.strength,
    dex: stats.dexterity,
    int: stats.intelligence,
    fai: stats.faith,
    arc: stats.arcane,
  }
}
