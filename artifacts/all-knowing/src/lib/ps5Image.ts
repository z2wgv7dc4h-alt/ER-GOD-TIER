/**
 * Task 134 — image preprocessing for real PS5 captures.
 *
 * Phone photos of a TV are the way most PS5 players will feed the app: perspective
 * skew, glare, moire, softness, cropped edges. Tesseract alone reads almost nothing
 * off them (the raw status fixture comes back at ~44% with half the stats missing).
 * Everything here is dependency-free, pure maths over an 8-bit grayscale buffer so
 * the same code runs in the browser, in Node tests, and in the offline eval.
 *
 * The one trick that matters: the console UI is bright text on a dark, unevenly lit
 * panel, so we invert to dark-on-light and run an adaptive (moving-average) threshold.
 * That cancels the glare gradient and the moire, after which Tesseract reads the
 * fixture at ~79% with every label intact.
 */

export type GrayImage = { width: number; height: number; data: Uint8Array }

export function isGrayImage(value: unknown): value is GrayImage {
  const v = value as GrayImage | null
  return Boolean(v && typeof v.width === 'number' && typeof v.height === 'number' && v.data instanceof Uint8Array)
}

/** Rec. 601 luma from packed RGBA (canvas ImageData order). */
export function rgbaToGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): GrayImage {
  const out = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) | 0
  }
  return { width, height, data: out }
}

export function invert(img: GrayImage): GrayImage {
  const out = new Uint8Array(img.data.length)
  for (let i = 0; i < out.length; i++) out[i] = 255 - img.data[i]
  return { width: img.width, height: img.height, data: out }
}

/** Separable Gaussian blur. `radius` is the half-width of the kernel. */
export function gaussianBlur(img: GrayImage, radius = 2): GrayImage {
  const { width: w, height: h, data } = img
  const r = Math.max(0, Math.round(radius))
  if (r === 0) return { width: w, height: h, data: data.slice() }
  const kernel = new Float64Array(2 * r + 1)
  let sum = 0
  const sigma = Math.max(0.6, r * 0.7)
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel[i + r] = v
    sum += v
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum

  const tmp = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let i = -r; i <= r; i++) acc += data[row + Math.min(w - 1, Math.max(0, x + i))] * kernel[i + r]
      tmp[row + x] = acc
    }
  }
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * kernel[i + r]
      out[y * w + x] = acc < 0 ? 0 : acc > 255 ? 255 : acc
    }
  }
  return { width: w, height: h, data: out }
}

/** 3x3 (or r) median filter — strips the salt-and-pepper moire from a screen photo. */
export function medianBlur(img: GrayImage, radius = 1): GrayImage {
  const { width: w, height: h, data } = img
  const r = Math.max(1, Math.round(radius))
  const out = new Uint8Array(w * h)
  const window: number[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      window.length = 0
      for (let dy = -r; dy <= r; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy)) * w
        for (let dx = -r; dx <= r; dx++) window.push(data[yy + Math.min(w - 1, Math.max(0, x + dx))])
      }
      window.sort((a, b) => a - b)
      out[y * w + x] = window[window.length >> 1]
    }
  }
  return { width: w, height: h, data: out }
}

/** Global Otsu threshold. Foreground (dark) becomes 0, background 255. */
export function otsuThreshold(img: GrayImage): GrayImage {
  const { data } = img
  const hist = new Int32Array(256)
  for (let i = 0; i < data.length; i++) hist[data[i]]++
  const total = data.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let best = 0
  let threshold = 127
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += i * hist[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) {
      best = between
      threshold = i
    }
  }
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = data[i] > threshold ? 255 : 0
  return { width: img.width, height: img.height, data: out }
}

/**
 * Adaptive threshold with an integral image (mean of a `block`x`block` window).
 * `c` biases toward foreground: a pixel is ink when it is at least `c` darker than
 * its local mean. Handles the TV's uneven lighting far better than Otsu.
 */
export function adaptiveThreshold(img: GrayImage, block = 101, c = 12): GrayImage {
  const { width: w, height: h, data } = img
  const integral = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += data[y * w + x]
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum
    }
  }
  const r = Math.max(1, block >> 1)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const y0 = Math.max(0, y - r)
      const x1 = Math.min(w, x + r + 1)
      const y1 = Math.min(h, y + r + 1)
      const area = (x1 - x0) * (y1 - y0)
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0]
      const mean = sum / area
      out[y * w + x] = data[y * w + x] > mean - c ? 255 : 0
    }
  }
  return { width: w, height: h, data: out }
}

/** Percentile contrast stretch (a cheap CLAHE alternative for flat TV whites). */
export function contrastStretch(img: GrayImage, lowPct = 2, highPct = 98): GrayImage {
  const { data } = img
  const hist = new Int32Array(256)
  for (let i = 0; i < data.length; i++) hist[data[i]]++
  const total = data.length
  let acc = 0
  let lo = 0
  let hi = 255
  const lowTarget = (total * lowPct) / 100
  const highTarget = (total * highPct) / 100
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= lowTarget) {
      lo = i
      break
    }
  }
  acc = 0
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= highTarget) {
      hi = i
      break
    }
  }
  const range = Math.max(1, hi - lo)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(((data[i] - lo) * 255) / range)))
  return { width: img.width, height: img.height, data: out }
}

/**
 * CLAHE-style local equalisation (per-tile clipped histogram, LUT per tile).
 * Kept for completeness/contrast of low-contrast captures; the adaptive threshold
 * is what the pipeline actually leans on.
 */
export function clahe(img: GrayImage, tiles = 8, clip = 2.0): GrayImage {
  const { width, height, data } = img
  const tw = Math.ceil(width / tiles)
  const th = Math.ceil(height / tiles)
  const luts: Uint8Array[] = []
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x0 = tx * tw
      const y0 = ty * th
      const x1 = Math.min(width, x0 + tw)
      const y1 = Math.min(height, y0 + th)
      const hist = new Int32Array(256)
      let n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { hist[data[y * width + x]]++; n++ }
      const limit = Math.max(1, Math.floor((clip * n) / 256))
      let excess = 0
      for (let i = 0; i < 256; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit
          hist[i] = limit
        }
      }
      const lut = new Uint8Array(256)
      let acc = 0
      for (let i = 0; i < 256; i++) {
        acc += hist[i] + excess / 256
        lut[i] = Math.max(0, Math.min(255, Math.round((acc * 255) / n)))
      }
      luts.push(lut)
    }
  }
  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const ty = Math.min(tiles - 1, Math.floor(y / th))
    for (let x = 0; x < width; x++) {
      const tx = Math.min(tiles - 1, Math.floor(x / tw))
      out[y * width + x] = luts[ty * tiles + tx][data[y * width + x]]
    }
  }
  return { width, height, data: out }
}

/** Bilinear upscale (integer factor). Nearest-neighbour confuses Tesseract on JPEGs. */
export function upscale(img: GrayImage, factor = 2): GrayImage {
  const { width: w, height: h, data } = img
  const f = Math.max(1, Math.round(factor))
  if (f === 1) return { width: w, height: h, data: data.slice() }
  const nw = w * f
  const nh = h * f
  const out = new Uint8Array(nw * nh)
  for (let y = 0; y < nh; y++) {
    const sy = y / f
    const y0 = Math.floor(sy)
    const y1 = Math.min(h - 1, y0 + 1)
    const wy = sy - y0
    for (let x = 0; x < nw; x++) {
      const sx = x / f
      const x0 = Math.floor(sx)
      const x1 = Math.min(w - 1, x0 + 1)
      const wx = sx - x0
      const top = data[y0 * w + x0] * (1 - wx) + data[y0 * w + x1] * wx
      const bot = data[y1 * w + x0] * (1 - wx) + data[y1 * w + x1] * wx
      out[y * nw + x] = top * (1 - wy) + bot * wy
    }
  }
  return { width: nw, height: nh, data: out }
}

/** Downscale by an integer factor (box average) when a capture is huge. */
export function downscale(img: GrayImage, factor = 2): GrayImage {
  const { width: w, height: h, data } = img
  const f = Math.max(1, Math.round(factor))
  if (f === 1) return { width: w, height: h, data: data.slice() }
  const nw = Math.max(1, Math.floor(w / f))
  const nh = Math.max(1, Math.floor(h / f))
  const out = new Uint8Array(nw * nh)
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      let acc = 0
      for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) acc += data[Math.min(h - 1, y * f + dy) * w + Math.min(w - 1, x * f + dx)]
      out[y * nw + x] = acc / (f * f)
    }
  }
  return { width: nw, height: nh, data: out }
}

/**
 * Estimate page skew by the variance of the horizontal projection profile: at the
 * true angle the text rows line up and the profile is sharpest. Runs on a small
 * downscaled copy so a full photo is cheap to test.
 */
export function estimateSkew(img: GrayImage, maxDeg = 8, stepDeg = 0.5): number {
  const small = img.width > 600 ? downscale(img, Math.ceil(img.width / 600)) : img
  const { width: w, height: h, data } = small
  let bestAngle = 0
  let bestScore = -Infinity
  for (let deg = -maxDeg; deg <= maxDeg + 1e-9; deg += stepDeg) {
    const rad = (deg * Math.PI) / 180
    const tan = Math.tan(rad)
    const rows = new Int32Array(h + Math.ceil(Math.abs(tan) * w) + 2)
    const offset = tan < 0 ? Math.ceil(-tan * w) : 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[y * w + x] < 128) {
          const yy = Math.round(y + tan * x) + offset
          if (yy >= 0 && yy < rows.length) rows[yy]++
        }
      }
    }
    let mean = 0
    for (let i = 0; i < rows.length; i++) mean += rows[i]
    mean /= rows.length
    let score = 0
    for (let i = 0; i < rows.length; i++) score += (rows[i] - mean) * (rows[i] - mean)
    if (score > bestScore) {
      bestScore = score
      bestAngle = deg
    }
  }
  return bestAngle
}

/** Bilinear rotation (positive radians = counter-clockwise in image space). */
export function rotate(img: GrayImage, radians: number): GrayImage {
  if (Math.abs(radians) < 1e-4) return { width: img.width, height: img.height, data: img.data.slice() }
  const { width: w, height: h, data } = img
  const nw = Math.ceil(Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians)))
  const nh = Math.ceil(Math.abs(h * Math.cos(radians)) + Math.abs(w * Math.sin(radians)))
  const out = new Uint8Array(nw * nh).fill(255)
  const cx = w / 2
  const cy = h / 2
  const ncx = nw / 2
  const ncy = nh / 2
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const dx = x - ncx
      const dy = y - ncy
      const sx = cos * dx + sin * dy + cx
      const sy = -sin * dx + cos * dy + cy
      if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) continue
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const wx = sx - x0
      const wy = sy - y0
      const top = data[y0 * w + x0] * (1 - wx) + data[y0 * w + x0 + 1] * wx
      const bot = data[(y0 + 1) * w + x0] * (1 - wx) + data[(y0 + 1) * w + x0 + 1] * wx
      out[y * nw + x] = top * (1 - wy) + bot * wy
    }
  }
  return { width: nw, height: nh, data: out }
}

/**
 * Crop a sub-rectangle. Coordinates are clamped, so an estimate from a slightly
 * different scale degrades instead of throwing.
 */
export function cropGray(img: GrayImage, x0: number, y0: number, x1: number, y1: number): GrayImage {
  const ax = Math.max(0, Math.min(img.width - 1, Math.floor(x0)))
  const ay = Math.max(0, Math.min(img.height - 1, Math.floor(y0)))
  const bx = Math.max(ax + 1, Math.min(img.width, Math.ceil(x1)))
  const by = Math.max(ay + 1, Math.min(img.height, Math.ceil(y1)))
  const w = bx - ax
  const h = by - ay
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) out.set(img.data.subarray((ay + y) * img.width + ax, (ay + y) * img.width + ax + w), y * w)
  return { width: w, height: h, data: out }
}

/** Resample to a fixed square (bilinear), used by the icon hasher. */
export function resizeGray(img: GrayImage, size: number): Uint8Array {
  const { width: w, height: h, data } = img
  const out = new Uint8Array(size * size)
  const sx = w / size
  const sy = h / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = Math.min(w - 1, Math.floor(x * sx))
      const y0 = Math.min(h - 1, Math.floor(y * sy))
      const x1 = Math.min(w - 1, x0 + 1)
      const y1 = Math.min(h - 1, y0 + 1)
      const wx = x * sx - x0
      const wy = y * sy - y0
      const top = data[y0 * w + x0] * (1 - wx) + data[y0 * w + x1] * wx
      const bot = data[y1 * w + x0] * (1 - wx) + data[y1 * w + x1] * wx
      out[y * size + x] = top * (1 - wy) + bot * wy
    }
  }
  return out
}

export type PreprocessVariant = { id: string; image: GrayImage }

/**
 * The status/equipment preprocessing ladder. Invert first (dark-on-light), then
 * smooth away the photo's noise, then local-threshold at a few window sizes — a
 * single window over-fits one capture, but the extraction step votes across them.
 */
export function preprocessVariants(gray: GrayImage): PreprocessVariant[] {
  const skew = estimateSkew(invert(gray))
  const base = Math.abs(skew) > 0.3 ? rotate(invert(gray), (-skew * Math.PI) / 180) : invert(gray)
  const smooth = gaussianBlur(medianBlur(base, 1), 2)
  return [
    { id: 'at101', image: adaptiveThreshold(smooth, 101, 12) },
    { id: 'at51', image: adaptiveThreshold(smooth, 51, 8) },
    { id: 'at151', image: adaptiveThreshold(smooth, 151, 15) },
    { id: 'otsu', image: otsuThreshold(gaussianBlur(medianBlur(base, 1), 1)) },
  ]
}
