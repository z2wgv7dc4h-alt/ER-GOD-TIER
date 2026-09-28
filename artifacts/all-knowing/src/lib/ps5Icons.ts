import { cropGray, otsuThreshold, resizeGray, type GrayImage } from './ps5Image'

/**
 * Task 134 §2 — icon matching for the equipment grid.
 *
 * A single equipment photo is a whole loadout, but most cells are icon-only: the
 * only way to name them is to compare the cropped cell against the item pictures
 * already cached in the repo (`src/data/image-index.json`). The descriptor centre-
 * crops, isolates the icon's bounding box (so scale/placement stop mattering),
 * downscales to 16x16 and compares with normalised cross-correlation. Matches are
 * reported with a confidence and never auto-applied.
 *
 * Honest status: on the real TV photos the exact-name accuracy is low (the icon is
 * photographed over the menu's stone texture, against clean WebP art). The class
 * of the top hit is usually right once restricted to the slot's class, which is
 * why the UI only offers a suggestion above a high confidence floor.
 */

export const ICON_DESCRIPTOR_SIZE = 16
const FEATURE_LENGTH = ICON_DESCRIPTOR_SIZE * ICON_DESCRIPTOR_SIZE

export type IconReference = {
  name: string
  klass: IconClass
  /** Base64 of the quantised descriptor. */
  d: string
}

export type IconClass = 'weapon' | 'shield' | 'armor' | 'talisman' | 'ammo' | 'item'

const CLASS_BY_PATH: Record<string, IconClass> = {
  weapons: 'weapon',
  shields: 'shield',
  armors: 'armor',
  talismans: 'talisman',
  ammos: 'ammo',
  items: 'item',
}

/** Map an `image-index.json` path to the slot class it belongs to. */
export function classFromImagePath(imagePath: string): IconClass | undefined {
  const parts = imagePath.split('/')
  return CLASS_BY_PATH[parts[3]]
}

/**
 * Isolate the icon's bounding box inside a cell/thumbnail so the descriptor is
 * invariant to how large the item is and where it sits. Falls back to the centre
 * square when the threshold finds nothing substantial.
 */
function iconBox(img: GrayImage): GrayImage {
  const clamped = cropGray(img, img.width * 0.08, img.height * 0.08, img.width * 0.92, img.height * 0.92)
  const bin = otsuThreshold(clamped)
  let minX = clamped.width
  let minY = clamped.height
  let maxX = 0
  let maxY = 0
  let count = 0
  for (let y = 0; y < clamped.height; y++) {
    for (let x = 0; x < clamped.width; x++) {
      if (bin.data[y * clamped.width + x] > 128) {
        count++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (count < clamped.width * clamped.height * 0.02 || maxX <= minX) return clamped
  const mx = (maxX - minX) * 0.12
  const my = (maxY - minY) * 0.12
  return cropGray(clamped, minX - mx, minY - my, maxX + mx, maxY + my)
}

/**
 * Descriptor: icon bounding box → 16x16 → zero-mean/unit-variance, followed by a
 * gradient-magnitude edge map so line-art weapons and flat-colour icons are both
 * separable.
 */
export function iconDescriptor(img: GrayImage, size = ICON_DESCRIPTOR_SIZE): Float32Array {
  const patch = resizeGray(iconBox(img), size)
  const out = new Float32Array(FEATURE_LENGTH * 2)
  let mean = 0
  for (const v of patch) mean += v
  mean /= patch.length
  let variance = 0
  for (const v of patch) variance += (v - mean) * (v - mean)
  const std = Math.sqrt(variance / patch.length) || 1
  for (let i = 0; i < patch.length; i++) out[i] = (patch[i] - mean) / std

  const edge = new Float32Array(patch.length)
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x
      const gx = patch[i + 1] - patch[i - 1]
      const gy = patch[i + size] - patch[i - size]
      edge[i] = Math.sqrt(gx * gx + gy * gy) / 255
    }
  }
  let edgeMean = 0
  for (const v of edge) edgeMean += v
  edgeMean /= edge.length
  let edgeVar = 0
  for (const v of edge) edgeVar += (v - edgeMean) * (v - edgeMean)
  const edgeStd = Math.sqrt(edgeVar / edge.length) || 1
  for (let i = 0; i < edge.length; i++) out[FEATURE_LENGTH + i] = (edge[i] - edgeMean) / edgeStd

  // L2-normalise so every component is small and the base64 quantiser loses nothing.
  let norm = 0
  for (const v of out) norm += v * v
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < out.length; i++) out[i] /= norm
  return out
}

/** Longest-common-subsequence-free cosine similarity of two descriptors. */
export function descriptorSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom ? dot / denom : 0
}

export type IconCandidate = { name: string; klass: IconClass; confidence: number }

/** Rank references against a query descriptor, best first. */
export function rankIconCandidates(query: Float32Array, refs: IconReference[], limit = 3): IconCandidate[] {
  const decoded = new Map<string, Float32Array>()
  const scored: IconCandidate[] = []
  for (const ref of refs) {
    let vec = decoded.get(ref.d)
    if (!vec) {
      vec = decodeDescriptor(ref.d)
      decoded.set(ref.d, vec)
    }
    scored.push({ name: ref.name, klass: ref.klass, confidence: descriptorSimilarity(query, vec) })
  }
  scored.sort((a, b) => b.confidence - a.confidence)
  return scored.slice(0, limit)
}

/** Quantise a descriptor to base64 (one signed byte per value). */
export function encodeDescriptor(vec: Float32Array): string {
  const bytes = new Uint8Array(vec.length)
  for (let i = 0; i < vec.length; i++) {
    const clamped = Math.max(-1, Math.min(1, vec[i]))
    bytes[i] = Math.round(((clamped + 1) / 2) * 255)
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64')
}

export function decodeDescriptor(encoded: string): Float32Array {
  const binary = typeof atob === 'function' ? atob(encoded) : Buffer.from(encoded, 'base64').toString('binary')
  const out = new Float32Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = (binary.charCodeAt(i) / 255) * 2 - 1
  return out
}
