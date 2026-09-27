import { detectBuild, type Archetype } from '../lib/advisor'
import { SOFT_CAPS, type StatKey } from '../lib/softCaps'
import type { Character, Stats } from '../types'

/**
 * Task 110 §3 — the level-up / rune calculator.
 *
 * Rune costs are the published level table (Eldenpedia "Level"): the first
 * eleven levels are the fixed 673→847 sequence and every level from the twelfth
 * on follows the game's cubic — `0.02·t³ + 3.06·t² + 105.6·t − 895`, where t is
 * the level being reached. The allocation suggestion is the advisor's read of
 * the build (archetype + soft caps): it puts points where they keep doing work
 * rather than spreading them thin.
 */

/** Runes to reach target levels 2..12; from 13 on the cubic takes over. */
export const LOW_LEVEL_COSTS: readonly number[] = [673, 689, 706, 723, 740, 757, 775, 793, 811, 829, 847]

/** Runes required to go from `level` to `level + 1`. */
export function runeCostToNext(level: number): number {
  const current = Math.max(0, Math.floor(Number.isFinite(level) ? level : 0))
  const target = current + 1
  if (target <= 1) return 0
  const low = LOW_LEVEL_COSTS[target - 2]
  if (low !== undefined) return low
  return Math.floor(0.02 * target ** 3 + 3.06 * target ** 2 + 105.6 * target - 895)
}

/** Total runes to gain exactly `levels` levels from `level`. */
export function totalRunesForLevels(level: number, levels: number): number {
  let total = 0
  for (let i = 0; i < Math.max(0, Math.floor(levels)); i++) total += runeCostToNext(level + i)
  return total
}

/** How many whole levels a rune balance affords, spending greedily from `level`. */
export function affordableLevels(level: number, runes: number): number {
  let remaining = Math.max(0, Math.floor(Number.isFinite(runes) ? runes : 0))
  let gained = 0
  let current = Math.max(1, Math.floor(level))
  // 1,000 levels is far past the game cap; the loop is bounded regardless.
  while (gained < 1000) {
    const cost = runeCostToNext(current)
    if (cost <= 0 || cost > remaining) break
    remaining -= cost
    current += 1
    gained += 1
  }
  return gained
}

const PRIMARY: Record<Archetype, StatKey[]> = {
  strength: ['strength'],
  dexterity: ['dexterity'],
  quality: ['strength', 'dexterity'],
  intelligence: ['intelligence'],
  faith: ['faith'],
  arcane: ['arcane'],
  bleed: ['arcane', 'dexterity'],
  hybrid: ['intelligence', 'faith'],
}

const CASTERS: Archetype[] = ['intelligence', 'faith', 'hybrid']

export type LevelUpAllocation = {
  key: StatKey
  label: string
  points: number
  from: number
  to: number
  /** Why the advisor put points here. */
  why: string
}

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

type Priority = { key: StatKey; cap: number; why: string }

/**
 * The advisor's point order: survive first, then the build's offensive stats to
 * their soft caps, then a little Endurance/Mind, then finish the damage stat.
 */
export function allocationPriority(character: Character): Priority[] {
  const archetype = detectBuild(character).archetype
  const primary = PRIMARY[archetype]
  const order: Priority[] = []
  if (character.stats.vigor < 40) order.push({ key: 'vigor', cap: 40, why: 'Vigor to 40 — the first HP soft cap.' })
  for (const key of primary) order.push({ key, cap: 60, why: `${LABELS[key]} to 60 — the damage soft cap.` })
  if (character.stats.endurance < 30) order.push({ key: 'endurance', cap: 30, why: 'Endurance to 30 — stamina and equip load.' })
  if (CASTERS.includes(archetype) && character.stats.mind < 30) {
    order.push({ key: 'mind', cap: 30, why: 'Mind to 30 — FP for casts and skills.' })
  }
  order.push({ key: 'vigor', cap: 60, why: 'Vigor to 60 — the second HP soft cap.' })
  for (const key of primary) order.push({ key, cap: 80, why: `${LABELS[key]} to 80 — the last scaling tier.` })
  return order
}

/** Distribute `levels` points across the eight stats by the priority above. */
export function suggestAllocation(character: Character, levels: number): LevelUpAllocation[] {
  const count = Math.max(0, Math.floor(levels))
  const stats: Stats = { ...character.stats }
  const priority = allocationPriority(character)
  const added = new Map<StatKey, number>()

  for (let i = 0; i < count; i++) {
    let target = priority.find((p) => stats[p.key] < Math.min(p.cap, SOFT_CAPS[p.key][SOFT_CAPS[p.key].length - 1] ?? 99))
    if (!target) target = priority[priority.length - 1]
    if (stats[target.key] >= 99) {
      const fallback = priority.find((p) => stats[p.key] < 99)
      if (!fallback) break
      target = fallback
    }
    stats[target.key] += 1
    added.set(target.key, (added.get(target.key) ?? 0) + 1)
  }

  const whyByKey = new Map<StatKey, string>()
  for (const p of priority) if (!whyByKey.has(p.key)) whyByKey.set(p.key, p.why)

  return [...added.entries()].map(([key, points]) => ({
    key,
    label: LABELS[key],
    points,
    from: character.stats[key],
    to: character.stats[key] + points,
    why: whyByKey.get(key) ?? 'A fill point.',
  }))
}

export type LevelUpPlan = {
  affordable: number
  targetLevel: number
  cost: number
  leftover: number
  allocations: LevelUpAllocation[]
}

/** "Input current runes → how many levels, and where the advisor puts them." */
export function levelUpPlan(character: Character, runes: number): LevelUpPlan {
  const affordable = affordableLevels(character.level, runes)
  const cost = totalRunesForLevels(character.level, affordable)
  const leftover = Math.max(0, Math.floor(Number.isFinite(runes) ? runes : 0)) - cost
  return {
    affordable,
    targetLevel: character.level + affordable,
    cost,
    leftover,
    allocations: suggestAllocation(character, affordable),
  }
}
