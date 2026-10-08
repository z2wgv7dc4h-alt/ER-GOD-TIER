import { warpGraces } from '../knowledge/graces'
import {
  applyH,
  invert3,
  matchFeatures,
  ransacHomography,
  type Feature,
  type Homography,
  type Pt,
} from './ps5MapFeatures'
import { fromRefFeatures, type MapReference, type MapWorld } from './ps5MapReference'

/**
 * Task 135 §2 — register a photo to a reference map and say what is in frame.
 *
 * Matching is objective: a homography only exists when geometric structure
 * agrees. The caller runs both worlds and keeps the better fit, which is also how
 * overworld-vs-underground is decided (the underground photo additionally carries
 * a darkened overlay and the "Show above ground" hint, but geometry is the test
 * that cannot be faked).
 */

export type Registration = {
  world: MapWorld
  /** Photo pixel → reference plate pixel. */
  H: Homography
  /** Photo pixel → reference plate pixel, inverted, for projecting known points back. */
  Hinv: Homography
  matches: number
  inliers: number
  /** RMS reprojection error over the inliers, in reference pixels. */
  error: number
  /** 0..1; 1 means a dense, tight match. */
  confidence: number
  /** Reference-space bounding box of the matched photo frame [left, top, right, bottom]. */
  bounds: [number, number, number, number]
  /** Regions with at least one known grace inside the frame, most covered first. */
  regions: string[]
}

export type RegisterOptions = {
  ratio?: number
  maxDistance?: number
  inlierThreshold?: number
  maxIterations?: number
  minInliers?: number
  maxError?: number
}

const DEFAULTS: Required<RegisterOptions> = {
  ratio: 0.85,
  maxDistance: 80,
  inlierThreshold: 5,
  maxIterations: 40000,
  minInliers: 12,
  maxError: 6,
}

/** Mosaic percent (px/10496) → reference plate pixel. The plate is a uniform
 *  downscale of the square engine frame, so both axes use the width scale. */
export function regionPlatePoint(xPercent: number, yPercent: number, ref: MapReference): Pt {
  return [(xPercent / 100) * ref.width, (yPercent / 100) * ref.width]
}

/** Register against one reference. Returns null when geometry cannot be trusted. */
export function registerToWorld(photoFeatures: Feature[], ref: MapReference, opts: RegisterOptions = {}): Registration | null {
  const o = { ...DEFAULTS, ...opts }
  const refFeatures: Feature[] = fromRefFeatures(ref)
  const matches = matchFeatures(photoFeatures, refFeatures, { ratio: o.ratio, maxDistance: o.maxDistance })
  if (matches.length < o.minInliers) return null
  const from: Pt[] = matches.map((m) => [photoFeatures[m.query].kp.x, photoFeatures[m.query].kp.y])
  const to: Pt[] = matches.map((m) => [refFeatures[m.ref].kp.x, refFeatures[m.ref].kp.y])
  const r = ransacHomography(from, to, matches.map((m) => m.distance), {
    threshold: o.inlierThreshold,
    maxIterations: o.maxIterations,
  })
  if (!r || r.inliers < o.minInliers || r.error > o.maxError) return null
  const Hinv = invert3(r.H)
  if (!Hinv) return null

  // Frame bounds from the inlier photo points only, so stray matches cannot inflate it.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let inlierCount = 0
  for (let i = 0; i < from.length; i++) {
    const [u, v] = applyH(r.H, from[i][0], from[i][1])
    if (Math.hypot(u - to[i][0], v - to[i][1]) >= o.inlierThreshold) continue
    inlierCount++
    if (u < minX) minX = u
    if (v < minY) minY = v
    if (u > maxX) maxX = u
    if (v > maxY) maxY = v
  }

  const confidence = Math.max(0, Math.min(1, (inlierCount / 40) * Math.exp(-r.error / 6)))
  return {
    world: ref.world,
    H: r.H,
    Hinv,
    matches: matches.length,
    inliers: inlierCount,
    error: r.error,
    confidence,
    bounds: [minX, minY, maxX, maxY],
    regions: regionsInBounds(ref.world, [minX, minY, maxX, maxY], ref),
  }
}

/** Regions whose known graces fall inside the reference-space frame rectangle. */
export function regionsInBounds(world: MapWorld, bounds: [number, number, number, number], ref: MapReference): string[] {
  const [left, top, right, bottom] = bounds
  const marginX = (right - left) * 0.04
  const marginY = (bottom - top) * 0.04
  const counts = new Map<string, number>()
  for (const g of warpGraces) {
    if (g.world !== world) continue
    const [u, v] = regionPlatePoint(g.x, g.y, ref)
    if (u < left - marginX || u > right + marginX || v < top - marginY || v > bottom + marginY) continue
    counts.set(g.region, (counts.get(g.region) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([region]) => region)
}

/** Try every supplied reference, keep the tightest fit. */
export function registerPhoto(photoFeatures: Feature[], refs: MapReference[], opts: RegisterOptions = {}): Registration | null {
  let best: Registration | null = null
  for (const ref of refs) {
    const reg = registerToWorld(photoFeatures, ref, opts)
    if (!reg) continue
    const better = !best || reg.inliers > best.inliers || (reg.inliers === best.inliers && reg.error < best.error)
    if (better) best = reg
  }
  return best
}
