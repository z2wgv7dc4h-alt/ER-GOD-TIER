/**
 * Task 110 §2 — the player's derived stat curves.
 *
 * The in-repo regulation extract only computes attack rating (see `ar.ts`), so
 * the game's player-param HP / FP / stamina rows are not vendored. This module
 * provides the widely published community anchor values and interpolates
 * linearly between them. It is a labelled estimate, in the same spirit as the
 * `softCaps.ts` Vigor/Mind/Endurance breakpoints — never presented as extracted
 * regulation data.
 *
 * The anchors that matter for build advice are the ones players actually plan
 * around: Vigor 40 and 60, Endurance 30 and 50. Tests pin those.
 */

type Knot = readonly [level: number, value: number]

const MAX_STAT = 99

function interpolate(knots: readonly Knot[], value: number): number {
  const raw = Number.isFinite(value) ? value : 1
  const v = Math.max(1, Math.min(MAX_STAT, Math.floor(raw)))
  const first = knots[0]
  const last = knots[knots.length - 1]
  if (v <= first[0]) return first[1]
  if (v >= last[0]) return last[1]
  for (let i = 1; i < knots.length; i++) {
    const [x1, y1] = knots[i - 1]
    const [x2, y2] = knots[i]
    if (v <= x2) {
      const t = (v - x1) / (x2 - x1)
      return Math.round(y1 + (y2 - y1) * t)
    }
  }
  return last[1]
}

/** Community HP anchors: 40 Vigor 1450, 60 Vigor 1900, 99 Vigor 2100. */
export const HP_KNOTS: readonly Knot[] = [
  [1, 300],
  [25, 800],
  [40, 1450],
  [60, 1900],
  [99, 2100],
]

/** Community FP anchors; casters plan around 40 Mind. */
export const FP_KNOTS: readonly Knot[] = [
  [1, 50],
  [20, 115],
  [40, 220],
  [60, 340],
  [99, 450],
]

/** Community stamina anchors: Endurance 30 (first cap) and 50. */
export const STAMINA_KNOTS: readonly Knot[] = [
  [1, 80],
  [30, 130],
  [50, 155],
  [99, 170],
]

export function hpFromVigor(vigor: number): number {
  return interpolate(HP_KNOTS, vigor)
}

export function fpFromMind(mind: number): number {
  return interpolate(FP_KNOTS, mind)
}

export function staminaFromEndurance(endurance: number): number {
  return interpolate(STAMINA_KNOTS, endurance)
}
