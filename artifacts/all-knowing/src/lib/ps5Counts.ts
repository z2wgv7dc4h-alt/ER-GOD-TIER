import type { GrayImage } from './ps5Image'

/**
 * Task 175 — reading the small stack-count numerals in a menu cell.
 *
 * The counts are near-white digits drawn over the cell's stone texture, and the
 * icon's line work plus the panel seam glow run right through them, so OCRing the
 * whole corner is hopeless. Instead we threshold just below the region's white
 * level, label connected components and keep only solid, digit-sized blobs in the
 * right half of the cell; then we walk left from the right-most blob to collect
 * the whole number and hand back a clean black-on-white crop for the OCR engine.
 * Working from the glyphs' own size and fill (not a fixed pixel crop) is what
 * makes it survive the photo's angle, glare and scale.
 */

type Blob = { minX: number; minY: number; maxX: number; maxY: number; n: number }

/** 4-connected components of a binary mask, as bounding boxes. */
function labelBlobs(mask: Uint8Array, w: number, h: number): Blob[] {
  const seen = new Uint8Array(w * h)
  const out: Blob[] = []
  const stack: number[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (seen[i] || !mask[i]) continue
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let n = 0
      stack.length = 0
      stack.push(i)
      seen[i] = 1
      while (stack.length) {
        const j = stack.pop() as number
        const jy = (j / w) | 0
        const jx = j - jy * w
        n++
        if (jx < minX) minX = jx
        if (jx > maxX) maxX = jx
        if (jy < minY) minY = jy
        if (jy > maxY) maxY = jy
        if (jx + 1 < w && !seen[j + 1] && mask[j + 1]) { seen[j + 1] = 1; stack.push(j + 1) }
        if (jx > 0 && !seen[j - 1] && mask[j - 1]) { seen[j - 1] = 1; stack.push(j - 1) }
        if (jy + 1 < h && !seen[j + w] && mask[j + w]) { seen[j + w] = 1; stack.push(j + w) }
        if (jy > 0 && !seen[j - w] && mask[j - w]) { seen[j - w] = 1; stack.push(j - w) }
      }
      out.push({ minX, minY, maxX, maxY, n })
    }
  }
  return out
}

/**
 * Isolate the stack-count numerals inside a cell's bottom-right region and return
 * a clean black-on-white crop, or `undefined` when the cell holds no number.
 */
export function locateCountGlyphs(region: GrayImage): GrayImage | undefined {
  const { width: w, height: h, data } = region
  if (w <= 6 || h <= 6) return undefined
  // Threshold just under the region's white level (1st percentile from the top).
  // The floor stops an empty/textured cell from manufacturing glyphs from noise.
  const hist = new Int32Array(256)
  for (const v of data) hist[v]++
  let acc = 0
  let white = 255
  const target = w * h * 0.01
  for (let i = 255; i >= 0; i--) {
    acc += hist[i]
    if (acc >= target) {
      white = i
      break
    }
  }
  const thr = Math.max(185, Math.min(245, Math.round(white * 0.72)))
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i] >= thr ? 1 : 0
  const blobs = labelBlobs(mask, w, h)
  // Digits are solid, roughly 18–46% of the cell height, and sit in the right half.
  const digits = blobs.filter((b) => {
    const bw = b.maxX - b.minX + 1
    const bh = b.maxY - b.minY + 1
    const fill = b.n / (bw * bh)
    const cx = (b.minX + b.maxX) / 2
    return bh >= h * 0.18 && bh <= h * 0.46 && bw >= 2 && bw <= w * 0.45 && fill >= 0.25 && cx >= w * 0.28
  })
  if (!digits.length) return undefined
  // Start at the right-most digit, then absorb neighbours (the rest of the number)
  // that share its baseline.
  let minX = digits[0].minX
  let maxX = digits[0].maxX
  let minY = digits[0].minY
  let maxY = digits[0].maxY
  for (const b of digits) {
    if (b.maxX > maxX) {
      minX = b.minX
      maxX = b.maxX
      minY = b.minY
      maxY = b.maxY
    }
  }
  let changed = true
  while (changed) {
    changed = false
    for (const b of digits) {
      if (b.minX >= minX) continue
      const gap = b.maxX - minX
      const overlap = Math.min(b.maxY, maxY) - Math.max(b.minY, minY)
      const ref = Math.min(b.maxY - b.minY + 1, maxY - minY + 1)
      if (gap >= -w * 0.06 && gap <= w * 0.16 && overlap > ref * 0.45) {
        minX = b.minX
        minY = Math.min(minY, b.minY)
        maxY = Math.max(maxY, b.maxY)
        changed = true
      }
    }
  }
  const pad = 5
  const cx0 = Math.max(0, minX - pad)
  const cy0 = Math.max(0, minY - pad)
  const cx1 = Math.min(w, maxX + pad + 1)
  const cy1 = Math.min(h, maxY + pad + 1)
  const cw = cx1 - cx0
  const ch = cy1 - cy0
  const clean = new Uint8Array(cw * ch).fill(255)
  for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) if (mask[y * w + x]) clean[(y - cy0) * cw + (x - cx0)] = 0
  return { width: cw, height: ch, data: clean }
}

/** Parse a digit run from OCR text; `undefined` when implausible. */
export function parseCountText(text: string | null | undefined): number | undefined {
  const n = Number((text ?? '').replace(/\D/g, ''))
  if (!Number.isFinite(n) || n < 1 || n > 999) return undefined
  return n
}
