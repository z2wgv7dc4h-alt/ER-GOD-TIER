import { ARCHETYPE_LABELS, detectArchetype } from './archetype'
import { GEAR_TAGS } from './gearTags'
import type { Character } from '../types'

/**
 * Task 100 §3 — the one-line "is this good for me" verdict (Usage model moment 5).
 *
 * Pure and threshold-driven so the cut-offs are unit-tested: a weapon must beat
 * the character's best equipped armament by `UPGRADE_GAIN_PCT` to be an upgrade
 * and must fall that far behind to be "not for you"; anything between is a
 * side-grade. A weapon whose requirements are not met is always "not for you",
 * regardless of AR.
 *
 * Task 137 §4 — the AR-dependent weapon verdict was moved to `weaponVerdict.ts`
 * so this module (imported by the eagerly-mounted entity overlay) no longer
 * drags the attack-rating calculator into the main entry chunk.
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

const normName = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Verdict for an armor/talisman row: it is an upgrade when the advisor's
 * archetype gear table names it, otherwise a neutral side-grade. There is no
 * AR comparison for armor, so this never invents a number.
 */
export function gearVerdict(character: Character, name: string, kind: 'armor' | 'talisman'): Verdict {
  const archetype = detectArchetype(character.stats)
  const match = GEAR_TAGS[archetype].find((g) => g.kind === kind && normName(g.name) === normName(name))
  if (match) return { kind: 'upgrade', line: `For you: ${match.why}`, meets: true }
  return {
    kind: 'side-grade',
    line: `Side-grade: not a standout pick for a ${ARCHETYPE_LABELS[archetype]} build.`,
    meets: true,
  }
}
