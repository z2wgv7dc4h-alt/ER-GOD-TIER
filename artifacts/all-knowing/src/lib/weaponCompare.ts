import type { AttackRating, Weapon } from './ar'
import { attackRatingForSlot } from './ar'
import type { CombatStats } from './enemy'
import { effectiveDamage } from './enemy'
import type { LoadoutSlot, Stats } from '../types'

/**
 * Side-by-side weapon comparison (Task 48). Additive only: this is a thin wrapper
 * around the real `attackRatingForSlot` (Task 10's ported Clark calculator), so a
 * comparison never computes a second, parallel AR. Each side is just a
 * `LoadoutSlot` plus its own two-handing flag, so one side's toggle cannot affect
 * the other. When a combat target is chosen, both sides also get `effectiveDamage`
 * against it (the same function the single-weapon matchup panel uses).
 */
export type CompareSide = {
  slot: LoadoutSlot
  twoHanding: boolean
}

export type CompareSideResult = {
  rating: AttackRating
  /** Effective damage vs the selected target, when one is chosen. */
  effective?: { total: number; byType: Partial<Record<number, number>> }
}

export type CompareOutcome = {
  a: CompareSideResult
  b: CompareSideResult
  winner: 'a' | 'b' | 'tie'
}

export function compareWeaponAr(
  weapons: Weapon[],
  stats: Stats,
  a: CompareSide,
  b: CompareSide,
  target?: CombatStats | null,
): CompareOutcome {
  const resolve = (rating: AttackRating): CompareSideResult => {
    if (rating.status !== 'ok' || !target) return { rating }
    const dealt = effectiveDamage(rating.breakdown, target)
    return { rating, effective: { total: dealt.total, byType: dealt.byType } }
  }

  const ra = resolve(attackRatingForSlot(weapons, a.slot, stats, a.twoHanding))
  const rb = resolve(attackRatingForSlot(weapons, b.slot, stats, b.twoHanding))
  const score = (r: CompareSideResult) =>
    r.effective?.total ?? (r.rating.status === 'ok' ? r.rating.total : -1)
  const sa = score(ra)
  const sb = score(rb)
  return { a: ra, b: rb, winner: sa === sb ? 'tie' : sa > sb ? 'a' : 'b' }
}
