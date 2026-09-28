import {
  attackRatingForSlot,
  displayAttackRating,
  getWeaponAttack,
  statsToAttributes,
  type Attribute,
  type Weapon,
} from './ar'
import { verdictFromAr, type Verdict } from './verdict'
import type { Character } from '../types'

/**
 * Task 137 §4 — the attack-rating-dependent weapon verdict, split from
 * `verdict.ts` so only the AR views import the calculator. `verdict.ts` keeps
 * the pure threshold logic.
 */

const ATTR_LABELS: Record<Attribute, string> = { str: 'STR', dex: 'DEX', int: 'INT', fai: 'FAI', arc: 'ARC' }

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
