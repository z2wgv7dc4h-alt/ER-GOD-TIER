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
  /**
   * 0..1 roundness of the outer boundary: 1 when the radius from the centroid is
   * constant around the blob (a circular emblem or a ring), near 0 for ragged
   * gold-terrain patches. Callers that build blobs by hand may omit it.
   */
  circularity?: number
}

export type DetectGraceOptions = {
  /** Icon radius as a fraction of the photo's shorter side. */
  minRadiusFraction?: number
  maxRadiusFraction?: number
  maxBlobs?: number
  /**
   * Bounding-box fill below which a blob is gold terrain, not an emblem. A grace
   * icon fills most of its box; plateaus and gold beaches do not.
   */
  minFill?: number
  /** Mean goldness below which a blob is dull terrain gold, not the icon's metal. */
  minStrength?: number
  /**
   * Fraction of a blob's neighbourhood that may be near-black before the blob is
   * treated as an artefact of the TV bezel / letterbox rather than a map icon.
   * Phone photos frame the screen with a black border; gold pixels appear where
   * that border meets the bright map, and those false blobs sit within a few
   * icon-radii of pure black. Genuine graces on dark terrain are surrounded by
   * grey/dark paint, not the ~0-luma bezel.
   */
  maxDarkFraction?: number
}

const GOLD_DEFAULTS: Required<DetectGraceOptions> = {
  minRadiusFraction: 0.004,
  maxRadiusFraction: 0.02,
  maxBlobs: 400,
  minFill: 0.45,
  minStrength: 0.21,
  maxDarkFraction: 0.3,
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

/**
 * Fraction of a square window (half-side `3*radius`) around a candidate that is
 * near-black (luma < 40). High values mark the TV bezel/letterbox, not map art.
 */
function darkFraction(rgba: Uint8ClampedArray, w: number, h: number, cx: number, cy: number, radius: number): number {
  const r = Math.max(6, Math.round(radius * 3))
  let dark = 0
  let n = 0
  const x0 = Math.max(0, Math.round(cx - r))
  const x1 = Math.min(w - 1, Math.round(cx + r))
  const y0 = Math.max(0, Math.round(cy - r))
  const y1 = Math.min(h - 1, Math.round(cy + r))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = (y * w + x) * 4
      if (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2] < 40) dark++
      n++
    }
  }
  return n ? dark / n : 0
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
  const pixels: number[] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] >= 0) continue
    const id = blobs.length
    stack.length = 0
    pixels.length = 0
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
      pixels.push(i)
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
    if (fill < o.minFill) continue
    if (sumStrength / area < o.minStrength) continue
    const cx = sumX / area
    const cy = sumY / area
    // Outer radius sampled in 24 angular bins: a circular emblem (solid disc or
    // ring) has the same radius all the way round, gold terrain does not.
    const BINS = 24
    const binR = new Float64Array(BINS).fill(-1)
    for (const i of pixels) {
      const x = i % w
      const y = (i / w) | 0
      const dx = x - cx
      const dy = y - cy
      let bin = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * BINS)
      if (bin < 0) bin = 0
      else if (bin >= BINS) bin = BINS - 1
      const rr = Math.sqrt(dx * dx + dy * dy)
      if (rr > binR[bin]) binR[bin] = rr
    }
    let filled = 0
    let meanR = 0
    for (const v of binR) if (v >= 0) {
      filled++
      meanR += v
    }
    meanR = filled ? meanR / filled : 0
    let varR = 0
    for (const v of binR) if (v >= 0) varR += (v - meanR) * (v - meanR)
    const cv = filled > 1 && meanR > 0 ? Math.sqrt(varR / filled) / meanR : 1
    const circularity = Math.max(0, Math.min(1, 1 - cv))
    if (o.maxDarkFraction < 1 && darkFraction(rgba, w, h, cx, cy, radius) > o.maxDarkFraction) continue
    blobs.push({
      x: cx,
      y: cy,
      radius,
      area,
      fill,
      strength: sumStrength / area,
      circularity,
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

/** A known grace position in map-percent space, with the region it belongs to. */
export type GraceIndexEntry = {
  id: string
  name: string
  region: string
  world: MapWorld
  xPercent: number
  yPercent: number
}

export type EngineGrace = { name: string; px: number; py: number; /** Engine master id (M00/M01/M10), when known. */ master?: string }

const MOSAIC = 10496

/**
 * Engine-frame → committed static-plate calibration, per world.
 *
 * The engine markers are percent = px / 10496 of the square 10496px tile
 * masters, but the committed plates (`public/sourced/maps/m*.jpg`, 4096x3880)
 * render that art at a different scale and origin (`registerToWorld`/the plate
 * keypoints are exact, so the *markers*, not the registration, carry the
 * offset). The plate is a uniform downscale of a plate-space rectangle, so the
 * calibrated coordinate is an affine map of the engine percent:
 *
 *     platePercent = enginePercent * scale + offset
 *
 * measured by aligning the detected grace icons in the owner's photos to the
 * nearest engine grace (see docs/PHOTO-EVAL.md §Map). A uniform 1.09 lifts
 * overworld snaps from ~15% to ~70%; the underground plate is a differently
 * cropped patch, so it calibrates separately. This is plate geometry, not a
 * per-photo fudge: the two overworld photos give the same value independently.
 */
export const PLATE_FRAME_CALIBRATION: Record<MapWorld, { scale: number; dx: number; dy: number }> = {
  overworld: { scale: 1.09, dx: -1, dy: -1 },
  underground: { scale: 1.02, dx: 2, dy: 3 },
}

/** The engine master a grace lives on; undefined when the caller did not say. */
function masterWorld(master: string | undefined): MapWorld | 'shadow' | undefined {
  if (!master) return undefined
  return master === 'M01' ? 'underground' : master === 'M10' ? 'shadow' : 'overworld'
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** The curated list also carries ashen/shadow; registration only knows these two. */
function toMapWorld(world: string): MapWorld {
  return world === 'underground' ? 'underground' : 'overworld'
}

function curatedWorldGraces(): KnownGrace[] {
  return warpGraces
    .filter((g) => g.world === 'overworld' || g.world === 'underground')
    .map((g) => ({ id: g.id, name: g.name, region: g.region, world: toMapWorld(g.world), x: g.x, y: g.y }))
}

/**
 * Build the full known-grace index from the engine's 413 named graces.
 *
 * The engine frame is shared by every master, so an overworld grace and an
 * underground one can sit at the same (x, y) — `warpGraces` nearest-neighbour
 * alone therefore mis-assigns a grace's world (Shadow graces leaked into the
 * overworld index, and overworld graces like "Inner Aeonia" into the underground
 * one). When the caller passes each grace's engine `master` (M00 overworld,
 * M01 underground, M10 Shadow) the world is taken from that directly and the
 * curated region is looked up only among graces of the same world.
 *
 * The curated list alone is only ~40 rows, so snapping against it finds almost
 * nothing; the engine entity index is what the task means by "nearest known
 * grace (grace-xyz)".
 */
export function buildGraceIndex(engineGraces: EngineGrace[]): GraceIndexEntry[] {
  const out: GraceIndexEntry[] = []
  for (const g of engineGraces) {
    // The curated `warpGraces` list is in the raw engine frame, so the region
    // lookup uses the raw percents; the stored entry is calibrated to the plate.
    const engineX = (g.px / MOSAIC) * 100
    const engineY = (g.py / MOSAIC) * 100
    const expectedWorld = masterWorld(g.master)
    if (expectedWorld === 'shadow') continue
    let nearest: (typeof warpGraces)[number] | undefined
    let best = Infinity
    for (const w of warpGraces) {
      if (w.world !== 'overworld' && w.world !== 'underground') continue
      // A known master confines the curated lookup to that world, so the region
      // comes from a grace the player can actually reach on the same map.
      if (expectedWorld && toMapWorld(w.world) !== expectedWorld) continue
      const d = Math.hypot(w.x - engineX, w.y - engineY)
      if (d < best) {
        best = d
        nearest = w
      }
    }
    if (!nearest) continue
    const warp = warpGraces.find((w) => slug(w.name) === slug(g.name))
    const world = expectedWorld ?? toMapWorld(warp?.world ?? nearest.world)
    if (world !== 'overworld' && world !== 'underground') continue
    const cal = PLATE_FRAME_CALIBRATION[world]
    out.push({
      id: warp?.id ?? `grace:${slug(g.name)}`,
      name: g.name,
      region: warp?.region ?? nearest.region,
      world,
      xPercent: engineX * cal.scale + cal.dx,
      yPercent: engineY * cal.scale + cal.dy,
    })
  }
  return out
}

export type KnownGrace = { id: string; name: string; region: string; world: MapWorld; x: number; y: number }

export type SnappedGrace = {
  graceId: string
  name: string
  region: string
  confidence: number
  /** Detected photo-centre (for the overlay). */
  photoX: number
  photoY: number
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
  /** Full known-grace index; falls back to the curated `warpGraces` when absent. */
  index?: GraceIndexEntry[]
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
  const known: KnownGrace[] = opts.index?.length
    ? opts.index
      .filter((e) => e.world === world)
      .map((e) => ({ id: e.id, name: e.name, region: e.region, world: e.world, x: e.xPercent, y: e.yPercent }))
    : curatedWorldGraces().filter((g) => g.world === world)
  const best = new Map<string, SnappedGrace>()
  for (const blob of blobs) {
    const [rx, ry] = applyH(H, blob.x, blob.y)
    // The committed plates (4096x3880) are a *uniform* downscale of the square
    // 10496 engine frame (4096x3880 = 10496x9940 scaled by 4096/10496), so both
    // axes take the width scale. Using `ref.height` for y made every known grace
    // sit ~5% too high and is why most blobs missed a snap.
    const px = (rx / ref.width) * 100
    const py = (ry / ref.width) * 100
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
      photoX: blob.x,
      photoY: blob.y,
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
