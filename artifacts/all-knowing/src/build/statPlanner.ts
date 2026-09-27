import { attackRatingForSlot, type Weapon } from '../lib/ar'
import { maxEquipLoad, loadClass, type LoadClass } from '../knowledge/equipLoad'
import { STAT_KEYS, levelFromStats } from '../lib/level'
import { SOFT_CAPS, type StatKey } from '../lib/softCaps'
import { rightHandSlot } from './presets'
import { fpFromMind, hpFromVigor, staminaFromEndurance } from './playerCurves'
import type { Character, Stats } from '../types'

/**
 * Task 110 §2 — the stat planner.
 *
 * Pure projection of a target spread: the derived HP/FP/stamina readouts, the
 * equip-load result at the target Endurance, the equipped weapon's attack
 * rating at the target stats, and the soft-cap markers per stat. Applying the
 * target produces a `CustomRespec` (the change list plus the Larval Tear /
 * Rennala facts the respec advisor already owns).
 */

const LABELS: Record<StatKey, string> = {
  vigor: 'Vig',
  mind: 'Mind',
  endurance: 'End',
  strength: 'Str',
  dexterity: 'Dex',
  intelligence: 'Int',
  faith: 'Fai',
  arcane: 'Arc',
}

export function statLabel(key: StatKey): string {
  return LABELS[key]
}

export function clampStat(value: number): number {
  return Math.max(1, Math.min(99, Math.round(Number.isFinite(value) ? value : 1)))
}

export type StatPlanRow = {
  key: StatKey
  label: string
  current: number
  planned: number
  caps: number[]
  /** How many soft-cap breakpoints the planned value reaches. */
  reached: number
}

export type StatPlanner = {
  target: Stats
  level: number
  levelDelta: number
  hp: number
  fp: number
  stamina: number
  maxLoad: number
  equipLoadPct: number
  loadClass: LoadClass
  /** AR of the right-hand weapon at the target stats, or null. */
  ar: number | null
  arWeapon: string | null
  rows: StatPlanRow[]
}

export function planStats(
  character: Character,
  target: Stats,
  weapons?: Weapon[] | null,
  weight = 0,
  twoHanding = false,
): StatPlanner {
  const maxLoad = maxEquipLoad(target.endurance)
  const ratio = maxLoad > 0 ? weight / maxLoad : 0
  const right = rightHandSlot(character.loadout)
  let ar: number | null = null
  if (right && weapons?.length) {
    const rating = attackRatingForSlot(weapons, right, target, twoHanding)
    ar = rating.status === 'ok' ? rating.total : null
  }
  const level = levelFromStats(target)
  return {
    target,
    level,
    levelDelta: level - character.level,
    hp: hpFromVigor(target.vigor),
    fp: fpFromMind(target.mind),
    stamina: staminaFromEndurance(target.endurance),
    maxLoad,
    equipLoadPct: Math.round(ratio * 100),
    loadClass: loadClass(ratio),
    ar,
    arWeapon: right?.name ?? null,
    rows: STAT_KEYS.map((key) => ({
      key,
      label: LABELS[key],
      current: character.stats[key],
      planned: target[key],
      caps: SOFT_CAPS[key],
      reached: SOFT_CAPS[key].filter((cap) => target[key] >= cap).length,
    })),
  }
}

/** A spread moved by per-stat deltas, clamped to 1..99. */
export function statsFromDeltas(current: Stats, deltas: Partial<Record<StatKey, number>>): Stats {
  const next = { ...current }
  for (const key of STAT_KEYS) {
    const delta = deltas[key]
    if (delta) next[key] = clampStat(next[key] + delta)
  }
  return next
}

/** Commit the target spread (and its implied level) to the character. */
export function applyTarget(character: Character, target: Stats): Character {
  return { ...character, stats: { ...target }, level: levelFromStats(target) }
}

export type CustomRespec = {
  changes: { key: StatKey; label: string; from: number; to: number }[]
  levelDelta: number
  /** One Larval Tear when any stat actually moves. */
  larvalTears: number
  rennalaAvailable: boolean
  rennalaNote: string
}

/**
 * The respec plan for a free-form target spread. Mirrors `planRespec`'s Larval
 * Tear / Rennala facts but takes stats rather than a named build.
 */
export function customRespec(character: Character, target: Stats): CustomRespec {
  const changes = STAT_KEYS.map((key) => ({ key, label: LABELS[key], from: character.stats[key], to: target[key] })).filter(
    (d) => d.from !== d.to,
  )
  const rennalaAvailable = character.defeatedBosses.includes('boss:rennala')
  return {
    changes,
    levelDelta: levelFromStats(target) - character.level,
    larvalTears: changes.length ? 1 : 0,
    rennalaAvailable,
    rennalaNote: rennalaAvailable
      ? 'Rennala is available at Raya Lucaria — a respec costs one Larval Tear.'
      : 'Beat Rennala first; respec unlocks after her.',
  }
}
