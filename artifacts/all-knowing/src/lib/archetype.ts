import { statsToAttributes, type Attribute } from './attackPower'
import type { Stats } from '../types'

/**
 * Task 137 §4 — the stat-only half of build detection, with no attack-rating
 * dependency. Eager UI (area hub "good for my build", remembrance ranking) reads
 * this; the full `detectBuild` in `advisor.ts` adds equipped-weapon evidence.
 */

export type Archetype =
  | 'strength'
  | 'dexterity'
  | 'quality'
  | 'intelligence'
  | 'faith'
  | 'arcane'
  | 'bleed'
  | 'hybrid'

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  quality: 'Quality (Str/Dex)',
  intelligence: 'Intelligence',
  faith: 'Faith',
  arcane: 'Arcane',
  bleed: 'Bleed / Arcane',
  hybrid: 'Int/Faith hybrid',
}

export const ARCHETYPE_ATTRS: Record<Archetype, Attribute[]> = {
  strength: ['str'],
  dexterity: ['dex'],
  quality: ['str', 'dex'],
  intelligence: ['int'],
  faith: ['fai'],
  arcane: ['arc'],
  bleed: ['arc', 'dex'],
  hybrid: ['int', 'fai'],
}

export type BuildRead = {
  archetype: Archetype
  label: string
  /** 0..1 — a heuristic, not a probability. */
  confidence: number
  reason: string
  /** Offensive attributes, highest first. */
  attributes: { attr: Attribute; value: number }[]
}

export function buildReason(archetype: Archetype, attrs: Record<Attribute, number>): string {
  switch (archetype) {
    case 'bleed':
      return `Arc ${attrs.arc} with a bleed weapon equipped — Hemorrhage is the plan.`
    case 'hybrid':
      return `Int ${attrs.int} / Fai ${attrs.fai} — one spread feeds both a catalyst and its incantations.`
    case 'quality':
      return `Str ${attrs.str} / Dex ${attrs.dex} — a level quality spread, so both scale.`
    case 'strength':
      return `Str ${attrs.str} is your highest offensive stat.`
    case 'dexterity':
      return `Dex ${attrs.dex} is your highest offensive stat.`
    case 'intelligence':
      return `Int ${attrs.int} is your highest offensive stat.`
    case 'faith':
      return `Fai ${attrs.fai} is your highest offensive stat.`
    default:
      return `Arc ${attrs.arc} is your highest offensive stat, without a bleed weapon equipped.`
  }
}

/**
 * Detect the archetype from stats alone. `hasBleedWeapon` is the one
 * weapon-derived signal the full detector adds; callers that have no weapon
 * table (or do not need it) get the stat read.
 */
export function detectArchetype(stats: Stats, hasBleedWeapon = false): Archetype {
  const attrs = statsToAttributes(stats)
  const ranked = (['str', 'dex', 'int', 'fai', 'arc'] as Attribute[])
    .map((a) => ({ attr: a, value: attrs[a] }))
    .sort((x, y) => y.value - x.value)
  const highest = ranked[0]

  const intAndFaith = attrs.int >= 20 && attrs.fai >= 20 && Math.abs(attrs.int - attrs.fai) <= 15
  const qualitySpread =
    attrs.str >= 20 && attrs.dex >= 20 && Math.abs(attrs.str - attrs.dex) <= 10 &&
    (highest.attr === 'str' || highest.attr === 'dex')

  if (hasBleedWeapon && (attrs.arc >= 15 || attrs.dex >= 20)) return 'bleed'
  if (intAndFaith) return 'hybrid'
  if (qualitySpread) return 'quality'
  if (highest.attr === 'str') return 'strength'
  if (highest.attr === 'dex') return 'dexterity'
  if (highest.attr === 'int') return 'intelligence'
  if (highest.attr === 'fai') return 'faith'
  return 'arcane'
}
