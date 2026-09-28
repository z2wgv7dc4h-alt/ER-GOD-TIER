import type { Attribute } from './attackPower'
import type { Weapon } from './ar'

/**
 * Task 137 §4 — the attribute a weapon scales with most at base upgrade. Split
 * from `upgradeAdvice.ts` so build detection can read it without importing the
 * attack-rating calculator.
 */
export function primaryScaling(weapon: Weapon): Attribute | null {
  const scaling = weapon.attributeScaling[0] ?? {}
  let best: Attribute | null = null
  let bestVal = 0
  for (const a of ['str', 'dex', 'int', 'fai', 'arc'] as Attribute[]) {
    const v = scaling[a] ?? 0
    if (v > bestVal) {
      bestVal = v
      best = a
    }
  }
  return best
}
