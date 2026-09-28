import {
  displayAttackRating,
  getWeaponAttack,
  statsToAttributes,
  type Weapon,
} from './ar'
import type { Character } from '../types'

/**
 * Task 137 §4 — the AR-at-my-stats helpers, split from `library/model.ts` so
 * `model` can be imported by eager UI without pulling the calculator in.
 */
export function weaponAr(weapon: Weapon, character: Character, upgradeLevel?: number): number {
  const level = upgradeLevel ?? 0
  const result = getWeaponAttack({
    weapon,
    attributes: statsToAttributes(character.stats),
    upgradeLevel: level,
  })
  return displayAttackRating(result.attackPower)
}

export function weaponArAtMax(weapon: Weapon, character: Character): number {
  return weaponAr(weapon, character, Math.max(0, weapon.attack.length - 1))
}
