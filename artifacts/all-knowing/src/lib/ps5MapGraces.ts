import { warpGraces } from '../knowledge/graces'
import { applyH, type Homography } from './ps5MapFeatures'
import type { MapReference, MapWorld } from './ps5MapReference'

/**
 * Task 135 §3 — detect the gold circular grace icons and snap them to known graces.
 *
 * The map draws discovered Sites of Grace as a warm gold ring/burst, distinct from
 * every terrain palette (Caelid's rust, Liurnia's blue, Altus' ochre). Colour is
 * therefore the cheap, robust signal: mask gold, take circular blobs in the icon
 * size band, project each centroid through the registration homography and snap to
 * the nearest known grace. The registration's own scale sets the snap tolerance, so
 * a zoomed-in photo is not forced through a full-map tolerance.
 */

export type ColorImage = { width: number; height: number; rgba: Uint8ClampedArray }

export type GraceBlob = {
  /** Photo pixel centroid. */
  x: number
  y: number
  radius: number
  area: number
  /** Fraction of the bounding box the blob fills (1 = perfect square/disc). */
  fill: number
  /** Mean goldness (1 when every masked pixel is fully gold). */
  strength: number
}

export type DetectGraceOptions = {
  /** Icon radius as a fraction of the photo's shorter side. */
  minRadiusFraction?: number
  maxRadiusFraction?: number
  maxBlobs?: number
}

const GOLD_DEFAULTS: Required<DetectGraceOptions> = {
  minRadiusFraction: 0.004,
  maxRadiusFraction: 0.02,
  maxBlobs: 400,
}

/** Warm gold: high red, green well above blue, not the red-brown or parchment terrain. */
export function isGoldPixel(r: number, g: number, b: number): boolean {
  if (r < 135 || g < 90) return false
  if (g - b < 26) return false
  if (r - b < 45) return false
  if (r - g < 8 || r - g > 105) return false
  if (b > g - 18) return false
  if (r > g * 1.95) return false
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max - min >= 38
}

export function detectGraceBlobs(img: ColorImage, opts: DetectGraceOptions = {}): GraceBlob[] {
  const o = { ...GOLD_DEFAULTS, ...opts }
  const { width: w, height: h, rgba } = img
  const short = Math.min(w, h)
  const minRadius = o.minRadiusFraction * short
  const maxRadius = o.maxRadiusFraction * short
  const minArea = Math.PI * minRadius * minRadius
  const maxArea = Math.PI * maxRadius * maxRadius
  const mask = new Uint8Array(w * h)
  let goldCount = 0
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (isGoldPixel(rgba[p], rgba[p + 1], rgba[p + 2])) {
      mask[i] = 1
      goldCount++
    }
  }
  const labels = new Int32Array(w * h).fill(-1)
  const blobs: GraceBlob[] = []
  const stack: number[] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] >= 0) continue
    const id = blobs.length
    stack.length = 0
    stack.push(start)
    labels[start] = id
    let area = 0
    let sumX = 0
    let sumY = 0
    let minX = w
    let minY = h
    let maxX = -1
    let maxY = -1
    let sumStrength = 0
    while (stack.length) {
      const i = stack.pop()!
      const x = i % w
      const y = (i / w) | 0
      area++
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      const p = i * 4
      const r = rgba[p]
      const g = rgba[p + 1]
      const b = rgba[p + 2]
      sumStrength += Math.min(1, Math.max(0, (g - b) / 90) * Math.min(1, (r - b) / 90))
      // 8-connectivity so the thin gold ring stays one blob.
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          const j = yy * w + xx
          if (mask[j] && labels[j] < 0) {
            labels[j] = id
            stack.push(j)
          }
        }
      }
    }
    const bw = maxX - minX + 1
    const bh = maxY - minY + 1
    const radius = Math.sqrt(area / Math.PI)
    if (area < minArea || area > maxArea) continue
    if (radius < minRadius || radius > maxRadius) continue
    if (bw < 2 || bh < 2) continue
    const aspect = bw / bh
    if (aspect < 0.45 || aspect > 2.2) continue
    const fill = area / (bw * bh)
    if (fill < 0.42) continue
    blobs.push({
      x: sumX / area,
      y: sumY / area,
      radius,
      area,
      fill,
      strength: sumStrength / area,
    })
  }
  // The console draws every map icon at one screen size, so genuine grace icons
  // cluster at a common radius while glare and terrain patches are either much
  // larger or tiny. Keep the band around the median and drop the rest.
  const radii = blobs.map((b) => b.radius).sort((a, b) => a - b)
  const median = radii.length ? radii[radii.length >> 1] : 0
  const kept = median > 0 ? blobs.filter((b) => b.radius >= median * 0.6 && b.radius <= median * 1.7) : blobs
  // Brightest, roundest first when a cap is needed.
  kept.sort((a, b) => b.area * b.fill * b.strength - a.area * a.fill * a.strength)
  return kept.slice(0, o.maxBlobs)
}

export type GraceCandidate = { graceId: string; name: string; region: string; distancePercent: number }

export type SnappedGrace = {
  graceId: string
  name: string
  region: string
  confidence: number
  /** Detected photo-centre projected into reference plate pixels. */
  mapX: number
  mapY: number
  /** Distance from the known grace, in percent of the map. */
  distancePercent: number
  /** True when two known graces sit within the tolerance of the same blob. */
  ambiguous: boolean
  candidates: GraceCandidate[]
}

export type SnapOptions = {
  /** Snap tolerance in percent of the map (default scales with registration error). */
  tolerancePercent?: number
  /** A second grace this much closer than the tolerance makes the snap ambiguous. */
  ambiguityPercent?: number
  minConfidence?: number
}

/**
 * Project each blob through the homography, convert to percent of the plate and
 * keep the nearest known grace in the same world. Deduped per grace id, keeping
 * the closest sighting.
 */
export function snapGraces(blobs: GraceBlob[], H: Homography, ref: MapReference, world: MapWorld, opts: SnapOptions = {}): SnappedGrace[] {
  const tolerance = opts.tolerancePercent ?? 1.1
  const ambiguity = opts.ambiguityPercent ?? tolerance * 1.6
  const minConfidence = opts.minConfidence ?? 0
  const known = warpGraces.filter((g) => g.world === world)
  const best = new Map<string, SnappedGrace>()
  for (const blob of blobs) {
    const [rx, ry] = applyH(H, blob.x, blob.y)
    const px = (rx / ref.width) * 100
    const py = (ry / ref.height) * 100
    if (px < -5 || px > 105 || py < -5 || py > 105) continue
    const scored = known
      .map((g) => ({ g, d: Math.hypot(g.x - px, g.y - py) }))
      .sort((a, b) => a.d - b.d)
    const nearest = scored[0]
    if (!nearest || nearest.d > tolerance) continue
    const confidence = Math.max(0, Math.min(1, blob.strength * blob.fill * Math.exp(-nearest.d / (tolerance * 0.8))))
    if (confidence < minConfidence) continue
    const candidates: GraceCandidate[] = scored
      .filter((s) => s.d <= ambiguity)
      .slice(0, 3)
      .map((s) => ({ graceId: s.g.id, name: s.g.name, region: s.g.region, distancePercent: s.d }))
    const snap: SnappedGrace = {
      graceId: nearest.g.id,
      name: nearest.g.name,
      region: nearest.g.region,
      confidence,
      mapX: rx,
      mapY: ry,
      distancePercent: nearest.d,
      ambiguous: candidates.length > 1,
      candidates,
    }
    const prev = best.get(snap.graceId)
    if (!prev || snap.confidence > prev.confidence) best.set(snap.graceId, snap)
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence)
}
