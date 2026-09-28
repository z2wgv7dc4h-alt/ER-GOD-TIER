import { gaussianBlur, type GrayImage } from './ps5Image'

/**
 * Task 135 §1–2 — pure-TS feature detection, description, matching and homography.
 *
 * The PS5 world map is a phone photo of a TV: perspective skew, glare and moire,
 * but it is a picture of the *same* artwork the app draws, so geometry (coastlines,
 * lakes, mountain ridges) is the reliable signal — Task 134 established that OCR /
 * icon matching of the small map cells fails on these photos. Everything here is a
 * dependency-free ORB-like pipeline over an 8-bit grayscale buffer:
 *
 *   keypoints      FAST-9 corners, multi-scale, non-max suppressed
 *   orientation    intensity centroid (so BRIEF is rotation-observed)
 *   descriptor     256-bit BRIEF sampled on a rotated pattern
 *   matching       Hamming distance + Lowe ratio test
 *   geometry       normalised DLT homography inside RANSAC, refit on the inliers
 *
 * No SVD is needed: with exactly four points the DLT is an 8x8 linear solve, and the
 * refit uses the symmetric normal equations, both solved by Gaussian elimination.
 */

export type Keypoint = {
  /** Full-resolution pixel coordinates in the image it was detected on. */
  x: number
  y: number
  /** Pyramid scale (1, 2, 4 …): the level image was downscaled by this factor. */
  scale: number
  /** Orientation in radians (intensity centroid). */
  angle: number
  /** FAST corner strength, used for non-max suppression and ranking. */
  score: number
}

export type Feature = {
  kp: Keypoint
  /** 256 bits = 32 bytes, row-major. */
  bits: Uint8Array
}

export type Pt = [number, number]
/** Row-major 3x3 homography: [h11..h33]. */
export type Homography = number[]

const CIRCLE: Pt[] = [
  [0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 3],
  [0, 3], [-1, 3], [-2, 2], [-3, 1], [-3, 0], [-3, -1], [-2, -2], [-1, -3],
]

/** Bilinear resize to an arbitrary size (scale-pyramid building). */
export function resizeBilinear(img: GrayImage, nw: number, nh: number): GrayImage {
  const w = Math.max(1, Math.round(nw))
  const h = Math.max(1, Math.round(nh))
  if (w === img.width && h === img.height) return { width: w, height: h, data: img.data.slice() }
  const out = new Uint8Array(w * h)
  const sx = img.width / w
  const sy = img.height / h
  for (let y = 0; y < h; y++) {
    const y0 = Math.min(img.height - 1, Math.floor(y * sy))
    const y1 = Math.min(img.height - 1, y0 + 1)
    const wy = y * sy - y0
    for (let x = 0; x < w; x++) {
      const x0 = Math.min(img.width - 1, Math.floor(x * sx))
      const x1 = Math.min(img.width - 1, x0 + 1)
      const wx = x * sx - x0
      const top = img.data[y0 * img.width + x0] * (1 - wx) + img.data[y0 * img.width + x1] * wx
      const bot = img.data[y1 * img.width + x0] * (1 - wx) + img.data[y1 * img.width + x1] * wx
      out[y * w + x] = top * (1 - wy) + bot * wy
    }
  }
  return { width: w, height: h, data: out }
}

/**
 * Build a Gaussian pyramid, largest first, with a fine scale step. A fine step
 * (1.3x rather than 2x) matters because a phone photo is routinely captured at a
 * zoom the reference does not share exactly; BRIEF is not scale invariant, so the
 * relative scale has to land within ~10% of a level on one of the two sides.
 */
export function buildPyramid(img: GrayImage, maxDimension: number, levels = 6, step = 1.3): GrayImage[] {
  let base = img
  const factor = Math.max(1, Math.ceil(Math.max(img.width, img.height) / maxDimension))
  if (factor > 1) {
    base = resizeBilinear(img, img.width / factor, img.height / factor)
  }
  const out: GrayImage[] = [base]
  for (let i = 1; i < levels; i++) {
    const prev = out[out.length - 1]
    if (prev.width <= 48 || prev.height <= 48) break
    out.push(resizeBilinear(prev, prev.width / step, prev.height / step))
  }
  return out
}

/** FAST-9 corners on one grayscale image, non-max suppressed and capped. */
export function detectFast(img: GrayImage, opts: { threshold?: number; maxFeatures?: number } = {}): Keypoint[] {
  const threshold = opts.threshold ?? 22
  const maxFeatures = opts.maxFeatures ?? 1500
  const { width: w, height: h, data } = img
  const scores: number[] = []
  const xs: number[] = []
  const ys: number[] = []
  const offsets = CIRCLE.map((c) => c[1] * w + c[0])
  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const i = y * w + x
      const p = data[i]
      const hi = p + threshold
      const lo = p - threshold
      let nBright = 0
      let nDark = 0
      for (let k = 0; k < 16; k++) {
        const v = data[i + offsets[k]]
        if (v > hi) nBright++
        else if (v < lo) nDark++
      }
      if (nBright < 9 && nDark < 9) continue
      // Verify a contiguous 9-arc exists (the count above can be split).
      const bright = new Uint8Array(16)
      const dark = new Uint8Array(16)
      for (let k = 0; k < 16; k++) {
        const v = data[i + offsets[k]]
        if (v > hi) bright[k] = 1
        else if (v < lo) dark[k] = 1
      }
      let ok = false
      for (let start = 0; start < 16 && !ok; start++) {
        let run = 0
        for (let k = 0; k < 16; k++) {
          const idx = (start + k) & 15
          if (bright[idx]) run++
          else run = 0
          if (run >= 9) { ok = true; break }
        }
      }
      for (let start = 0; start < 16 && !ok; start++) {
        let run = 0
        for (let k = 0; k < 16; k++) {
          const idx = (start + k) & 15
          if (dark[idx]) run++
          else run = 0
          if (run >= 9) { ok = true; break }
        }
      }
      if (!ok) continue
      let score = 0
      for (let k = 0; k < 16; k++) {
        const d = Math.abs(data[i + offsets[k]] - p)
        if (d > threshold) score += d
      }
      xs.push(x)
      ys.push(y)
      scores.push(score)
    }
  }
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a])
  const taken = new Uint8Array(w * h)
  const out: Keypoint[] = []
  const radius = 3
  for (const idx of order) {
    if (out.length >= maxFeatures) break
    const x = xs[idx]
    const y = ys[idx]
    if (taken[y * w + x]) continue
    out.push({ x, y, scale: 1, angle: 0, score: scores[idx] })
    for (let dy = -radius; dy <= radius; dy++) {
      const yy = y + dy
      if (yy < 0 || yy >= h) continue
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = x + dx
        if (xx < 0 || xx >= w) continue
        taken[yy * w + xx] = 1
      }
    }
  }
  return out
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fixed 256-pair BRIEF sampling pattern (seeded, so photo and reference agree). */
const BRIEF_PATTERN = (() => {
  const rnd = mulberry32(0x13579bdf)
  const out = new Int8Array(256 * 4)
  for (let i = 0; i < 256; i++) {
    out[i * 4] = Math.round((rnd() * 2 - 1) * 10)
    out[i * 4 + 1] = Math.round((rnd() * 2 - 1) * 10)
    out[i * 4 + 2] = Math.round((rnd() * 2 - 1) * 10)
    out[i * 4 + 3] = Math.round((rnd() * 2 - 1) * 10)
  }
  return out
})()

/** Intensity-centroid orientation over a radius-7 disc. */
function orientation(img: GrayImage, x: number, y: number): number {
  const { width: w, height: h, data } = img
  let m10 = 0
  let m01 = 0
  for (let dy = -7; dy <= 7; dy++) {
    const yy = y + dy
    if (yy < 0 || yy >= h) continue
    for (let dx = -7; dx <= 7; dx++) {
      const xx = x + dx
      if (xx < 0 || xx >= w) continue
      if (dx * dx + dy * dy > 49) continue
      const v = data[yy * w + xx]
      m10 += dx * v
      m01 += dy * v
    }
  }
  return Math.atan2(m01, m10)
}

/** 256-bit BRIEF on the (already smoothed) image, rotated by the keypoint angle. */
function brief(img: GrayImage, x: number, y: number, angle: number): Uint8Array {
  const { width: w, height: h, data } = img
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const bits = new Uint8Array(32)
  for (let i = 0; i < 256; i++) {
    const ax = BRIEF_PATTERN[i * 4]
    const ay = BRIEF_PATTERN[i * 4 + 1]
    const bx = BRIEF_PATTERN[i * 4 + 2]
    const by = BRIEF_PATTERN[i * 4 + 3]
    const axr = Math.round(cos * ax - sin * ay) + x
    const ayr = Math.round(sin * ax + cos * ay) + y
    const bxr = Math.round(cos * bx - sin * by) + x
    const byr = Math.round(sin * bx + cos * by) + y
    const va = axr < 0 || ayr < 0 || axr >= w || ayr >= h ? 255 : data[ayr * w + axr]
    const vb = bxr < 0 || byr < 0 || bxr >= w || byr >= h ? 255 : data[byr * w + bxr]
    if (va < vb) bits[i >> 3] |= 1 << (i & 7)
  }
  return bits
}

export type DetectOptions = {
  threshold?: number
  maxFeaturesPerLevel?: number
  levels?: number
  maxDimension?: number
  step?: number
}

/**
 * Multi-scale keypoints with descriptors. Coordinates are projected back to the
 * full-resolution frame (`scale` records the divisor), so a homography estimated
 * from matches across levels is a single full-res transform.
 */
export function detectFeatures(img: GrayImage, opts: DetectOptions = {}): Feature[] {
  const levels = opts.levels ?? 6
  const maxDimension = opts.maxDimension ?? 1024
  const step = opts.step ?? 1.3
  const pyramid = buildPyramid(img, maxDimension, levels, step)
  const out: Feature[] = []
  for (const level of pyramid) {
    const scale = img.width / level.width
    const smooth = gaussianBlur(level, 2)
    for (const kp of detectFast(level, { threshold: opts.threshold, maxFeatures: opts.maxFeaturesPerLevel })) {
      const angle = orientation(level, kp.x, kp.y)
      out.push({
        kp: { x: kp.x * scale, y: kp.y * scale, scale, angle, score: kp.score },
        bits: brief(smooth, kp.x, kp.y, angle),
      })
    }
  }
  return out
}

const POPCOUNT = (() => {
  const t = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    let v = i
    let n = 0
    while (v) { n += v & 1; v >>= 1 }
    t[i] = n
  }
  return t
})()

export function hamming(a: Uint8Array, b: Uint8Array, limit = 256): number {
  let d = 0
  for (let i = 0; i < a.length; i++) {
    d += POPCOUNT[a[i] ^ b[i]]
    if (d > limit) return d
  }
  return d
}

/** Base64-encode a 32-byte BRIEF descriptor (works in Node and the browser). */
export function bitsToBase64(bits: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bits.length; i++) binary += String.fromCharCode(bits[i])
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(bits).toString('base64')
}

export function bitsFromBase64(encoded: string): Uint8Array {
  const binary = typeof atob === 'function' ? atob(encoded) : Buffer.from(encoded, 'base64').toString('binary')
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export type Match = { query: number; ref: number; distance: number }

/**
 * Brute-force descriptor match with Lowe's ratio test plus an absolute distance
 * ceiling. Returns query→reference index pairs.
 */
export function matchFeatures(
  query: Feature[],
  ref: Feature[],
  opts: { ratio?: number; maxDistance?: number; crossCheck?: boolean } = {},
): Match[] {
  const ratio = opts.ratio ?? 0.78
  const maxDistance = opts.maxDistance ?? 72
  const out: Match[] = []
  for (let q = 0; q < query.length; q++) {
    let best = -1
    let bestD = 257
    let secondD = 257
    const qb = query[q].bits
    for (let r = 0; r < ref.length; r++) {
      const d = hamming(qb, ref[r].bits)
      if (d < bestD) {
        secondD = bestD
        bestD = d
        best = r
      } else if (d < secondD) {
        secondD = d
      }
    }
    if (best < 0 || bestD > maxDistance) continue
    if (secondD < 257 && bestD > ratio * secondD) continue
    out.push({ query: q, ref: best, distance: bestD })
  }
  return out
}

/** Row-major 3x3 multiply (`A*B`). */
export function mul3(A: number[], B: number[]): number[] {
  const C = new Array<number>(9)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]
    }
  }
  return C
}

export function invert3(H: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = H
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null
  const id = 1 / det
  return [
    A * id, -(b * i - c * h) * id, (b * f - c * e) * id,
    B * id, (a * i - c * g) * id, -(a * f - c * d) * id,
    C * id, -(a * h - b * g) * id, (a * e - b * d) * id,
  ]
}

export function applyH(H: number[], x: number, y: number): Pt {
  const d = H[6] * x + H[7] * y + H[8]
  return [(H[0] * x + H[1] * y + H[2]) / d, (H[3] * x + H[4] * y + H[5]) / d]
}

/** Solve an n x n system `M x = b` by Gaussian elimination with partial pivoting. */
function solveLinear(M: Float64Array, b: Float64Array, n: number): Float64Array | null {
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) if (Math.abs(M[row * n + col]) > Math.abs(M[pivot * n + col])) pivot = row
    if (Math.abs(M[pivot * n + col]) < 1e-12) return null
    if (pivot !== col) {
      for (let k = 0; k < n; k++) {
        const t = M[col * n + k]
        M[col * n + k] = M[pivot * n + k]
        M[pivot * n + k] = t
      }
      const tb = b[col]
      b[col] = b[pivot]
      b[pivot] = tb
    }
    const diag = M[col * n + col]
    for (let row = col + 1; row < n; row++) {
      const factor = M[row * n + col] / diag
      if (factor === 0) continue
      for (let k = col; k < n; k++) M[row * n + k] -= factor * M[col * n + k]
      b[row] -= factor * b[col]
    }
  }
  const x = new Float64Array(n)
  for (let row = n - 1; row >= 0; row--) {
    let acc = b[row]
    for (let k = row + 1; k < n; k++) acc -= M[row * n + k] * x[k]
    x[row] = acc / M[row * n + row]
  }
  return x
}

/** Hartley similarity normalisation: mean at origin, mean distance sqrt(2). */
function normalizePoints(pts: Pt[]): { T: number[]; norm: Pt[] } {
  let cx = 0
  let cy = 0
  for (const p of pts) { cx += p[0]; cy += p[1] }
  cx /= pts.length
  cy /= pts.length
  let dist = 0
  for (const p of pts) dist += Math.hypot(p[0] - cx, p[1] - cy)
  const scale = dist === 0 ? 1 : (Math.SQRT2 * pts.length) / dist
  const T = [scale, 0, -scale * cx, 0, scale, -scale * cy, 0, 0, 1]
  const norm = pts.map((p): Pt => [(p[0] - cx) * scale, (p[1] - cy) * scale])
  return { T, norm }
}

/** Exact 4-point DLT homography `from → to` (null when degenerate). */
export function homography4(from: Pt[], to: Pt[]): Homography | null {
  if (from.length !== 4) return null
  const A = normalizePoints(from)
  const B = normalizePoints(to)
  const M = new Float64Array(64)
  const rhs = new Float64Array(8)
  for (let i = 0; i < 4; i++) {
    const [x, y] = A.norm[i]
    const [u, v] = B.norm[i]
    const r0 = i * 2
    const r1 = i * 2 + 1
    M[r0 * 8] = x; M[r0 * 8 + 1] = y; M[r0 * 8 + 2] = 1
    M[r0 * 8 + 6] = -u * x; M[r0 * 8 + 7] = -u * y
    rhs[r0] = u
    M[r1 * 8 + 3] = x; M[r1 * 8 + 4] = y; M[r1 * 8 + 5] = 1
    M[r1 * 8 + 6] = -v * x; M[r1 * 8 + 7] = -v * y
    rhs[r1] = v
  }
  const h = solveLinear(M, rhs, 8)
  if (!h) return null
  const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
  const Binv = invert3(B.T)
  if (!Binv) return null
  return mul3(Binv, mul3(Hn, A.T))
}

/** Least-squares DLT refit over all correspondences (symmetric normal equations). */
export function homographyRefit(from: Pt[], to: Pt[]): Homography | null {
  if (from.length < 4) return null
  const A = normalizePoints(from)
  const B = normalizePoints(to)
  const M = new Float64Array(64)
  const c = new Float64Array(8)
  for (let i = 0; i < from.length; i++) {
    const [x, y] = A.norm[i]
    const [u, v] = B.norm[i]
    const rows: [number[], number][] = [
      [[x, y, 1, 0, 0, 0, -u * x, -u * y], u],
      [[0, 0, 0, x, y, 1, -v * x, -v * y], v],
    ]
    for (const [row, val] of rows) {
      for (let r = 0; r < 8; r++) {
        for (let s = 0; s < 8; s++) M[r * 8 + s] += row[r] * row[s]
        c[r] += row[r] * val
      }
    }
  }
  const h = solveLinear(M, c, 8)
  if (!h) return null
  const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
  const Binv = invert3(B.T)
  if (!Binv) return null
  return mul3(Binv, mul3(Hn, A.T))
}

function reprojectionError(H: Homography, from: Pt, to: Pt): number {
  const [u, v] = applyH(H, from[0], from[1])
  return Math.hypot(u - to[0], v - to[1])
}

export type RansacResult = {
  H: Homography
  /** Number of correspondences agreeing with the final transform. */
  inliers: number
  /** RMS reprojection error (pixels) over the inliers. */
  error: number
  /** Mean descriptor Hamming distance over the inliers, for confidence. */
  meanDistance: number
}

export type RansacOptions = {
  maxIterations?: number
  /** Inlier reprojection threshold in destination pixels. */
  threshold?: number
  seed?: number
}

/**
 * RANSAC homography from matched `from → to` point pairs. Degenerate four-point
 * samples (collinear / tiny area) are rejected before the count. The final
 * transform is refit on every inlier for an unbiased error.
 */
export function ransacHomography(from: Pt[], to: Pt[], distances: number[] = [], opts: RansacOptions = {}): RansacResult | null {
  const n = from.length
  if (n < 4) return null
  const maxIterations = opts.maxIterations ?? 3000
  const threshold = opts.threshold ?? 4
  let seed = opts.seed ?? 0x9e3779b9
  const rnd = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }
  let best = -1
  let bestH: Homography | null = null
  for (let iter = 0; iter < maxIterations; iter++) {
    const idx: number[] = []
    while (idx.length < 4) {
      const k = Math.floor(rnd() * n)
      if (!idx.includes(k)) idx.push(k)
    }
    const H = homography4(idx.map((i) => from[i]), idx.map((i) => to[i]))
    if (!H) continue
    let count = 0
    for (let i = 0; i < n; i++) if (reprojectionError(H, from[i], to[i]) < threshold) count++
    if (count > best) {
      best = count
      bestH = H
      if (count > 0.9 * n) break
    }
  }
  if (!bestH || best < 4) return null
  const inlierIdx: number[] = []
  for (let i = 0; i < n; i++) if (reprojectionError(bestH, from[i], to[i]) < threshold) inlierIdx.push(i)
  const refined = homographyRefit(inlierIdx.map((i) => from[i]), inlierIdx.map((i) => to[i])) ?? bestH
  let sumSq = 0
  let sumDist = 0
  for (const i of inlierIdx) {
    const e = reprojectionError(refined, from[i], to[i])
    sumSq += e * e
    sumDist += distances[i] ?? 0
  }
  return {
    H: refined,
    inliers: inlierIdx.length,
    error: Math.sqrt(sumSq / inlierIdx.length),
    meanDistance: sumDist / inlierIdx.length,
  }
}
