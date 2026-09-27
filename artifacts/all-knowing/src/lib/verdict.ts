import {
  attackRatingForSlot,
  displayAttackRating,
  getWeaponAttack,
  statsToAttributes,
  type Attribute,
  type Weapon,
} from './ar'
import { ARCHETYPE_LABELS, detectBuild, GEAR_TAGS } from './advisor'
import type { Character } from '../types'

/**
 * Task 100 §3 — the one-line "is this good for me" verdict (Usage model moment 5).
 *
 * Pure and threshold-driven so the cut-offs are unit-tested: a weapon must beat
 * the character's best equipped armament by `UPGRADE_GAIN_PCT` to be an upgrade
 * and must fall that far behind to be "not for you"; anything between is a
 * side-grade. A weapon whose requirements are not met is always "not for you",
 * regardless of AR.
 */

export type VerdictKind = 'upgrade' | 'side-grade' | 'not-for-you' | 'usable'

export type Verdict = {
  kind: VerdictKind
  /** The one-line sentence shown on the entity page. */
  line: string
  meets: boolean
  /** Percent gain over the best equipped armament (undefined when nothing equipped). */
  gainPct?: number
}

const ATTR_LABELS: Record<Attribute, string> = { str: 'STR', dex: 'DEX', int: 'INT', fai: 'FAI', arc: 'ARC' }

/** AR must exceed the current best by this much to count as a real upgrade. */
export const UPGRADE_GAIN_PCT = 5

/** Within ±this band the candidate is a side-grade, not a win or a loss. */
export const SIDE_GRADE_BAND_PCT = 5

export type VerdictInput = {
  meets: boolean
  /** Human string, e.g. "needs 20 INT (you have 9)". */
  requirement: string
  candidateAr: number
  /** Best armament the character currently has equipped. 0 when nothing equipped. */
  currentBestAr: number
  /** Name of the compared current armament, for the sentence. */
  currentName?: string
}

/** The threshold decision, isolated so it can be tested without loading regulation data. */
export function verdictFromAr(input: VerdictInput): Verdict {
  if (!input.meets) {
    return { kind: 'not-for-you', line: `Not for you: ${input.requirement}`, meets: false }
  }
  if (!input.currentBestAr || input.currentBestAr <= 0) {
    return { kind: 'upgrade', line: 'Upgrade: nothing better is equipped at your stats.', meets: true }
  }
  const gainPct = Math.round(((input.candidateAr - input.currentBestAr) / input.currentBestAr) * 1000) / 10
  const over = input.currentName ? ` your ${input.currentName}` : ' your current kit'
  if (gainPct >= UPGRADE_GAIN_PCT) {
    return { kind: 'upgrade', line: `Upgrade: +${gainPct}% AR over${over} at your stats.`, meets: true, gainPct }
  }
  if (gainPct <= -SIDE_GRADE_BAND_PCT) {
    return { kind: 'not-for-you', line: `Not for you: ${Math.abs(gainPct)}% below${over} at your stats.`, meets: true, gainPct }
  }
  return { kind: 'side-grade', line: `Side-grade: about even with${over} at your stats.`, meets: true, gainPct }
}

function requirementOf(character: Character, weapon: Weapon): { meets: boolean; requirement: string } {
  const attrs = statsToAttributes(character.stats)
  const missing = (Object.entries(weapon.requirements) as [Attribute, number][])
    .filter(([a, req]) => attrs[a] < (req ?? 0))
    .map(([a, req]) => `${req} ${ATTR_LABELS[a]} (you have ${attrs[a]})`)
  return { meets: missing.length === 0, requirement: missing.length ? `needs ${missing.join(', ')}` : '' }
}

/** The best AR across the character's equipped armaments at their current upgrades. */
export function bestEquippedAr(character: Character, weapons: Weapon[]): { ar: number; name?: string } {
  let best = 0
  let name: string | undefined
  for (const slot of character.loadout) {
    if (slot.kind !== 'armament') continue
    const rating = attackRatingForSlot(weapons, slot, character.stats, false)
    if (rating.status === 'ok' && rating.total > best) {
      best = rating.total
      name = slot.name
    }
  }
  return { ar: best, name }
}

const normName = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Verdict for an armor/talisman row: it is an upgrade when the advisor's
 * archetype gear table names it, otherwise a neutral side-grade. There is no
 * AR comparison for armor, so this never invents a number.
 */
export function gearVerdict(character: Character, name: string, kind: 'armor' | 'talisman'): Verdict {
  const build = detectBuild(character)
  const match = GEAR_TAGS[build.archetype].find((g) => g.kind === kind && normName(g.name) === normName(name))
  if (match) return { kind: 'upgrade', line: `For you: ${match.why}`, meets: true }
  return {
    kind: 'side-grade',
    line: `Side-grade: not a standout pick for a ${ARCHETYPE_LABELS[build.archetype]} build.`,
    meets: true,
  }
}

/**
 * Verdict for one candidate weapon at the character's stats. The candidate is
 * rated at its own max upgrade so the sentence answers "is this worth building
 * toward", not "is the +0 I just picked up better".
 */
export function weaponVerdict(character: Character, weapons: Weapon[], weapon: Weapon): Verdict {
  const { meets, requirement } = requirementOf(character, weapon)
  const attrs = statsToAttributes(character.stats)
  const upgrade = Math.max(0, weapon.attack.length - 1)
  const result = getWeaponAttack({ weapon, attributes: attrs, upgradeLevel: upgrade })
  const candidateAr = displayAttackRating(result.attackPower)
  const current = bestEquippedAr(character, weapons)
  // Task 110 §5: with nothing equipped there is no baseline to call something
  // an upgrade. The requirements are the whole answer — "Usable" or "Needs …".
  if (meets && current.ar <= 0) {
    return {
      kind: 'usable',
      line: 'Usable: your stats meet its requirements and nothing better is equipped yet.',
      meets: true,
    }
  }
  return verdictFromAr({
    meets,
    requirement,
    candidateAr,
    currentBestAr: current.ar,
    currentName: current.name,
  })
}
