import { describe, expect, it } from 'vitest'
import { analyzeMapPhoto } from './ps5MapCapture'
import { buildMapReference } from './ps5MapReference'
import type { ColorImage } from './ps5MapGraces'
import type { GrayImage } from './ps5Image'

function texture(width = 260, height = 220): GrayImage {
  const data = new Uint8Array(width * height).fill(120)
  let seed = 0x1234567
  const rnd = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  for (let i = 0; i < 70; i++) {
    const cx = Math.floor(rnd() * (width - 24)) + 12
    const cy = Math.floor(rnd() * (height - 24)) + 12
    const r = 4 + Math.floor(rnd() * 8)
    const v = rnd() > 0.5 ? 30 : 220
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) data[y * width + x] = v
      }
    }
  }
  return { width, height, data }
}

function toColor(gray: GrayImage): ColorImage {
  const rgba = new Uint8ClampedArray(gray.width * gray.height * 4)
  for (let i = 0; i < gray.data.length; i++) {
    rgba[i * 4] = gray.data[i]
    rgba[i * 4 + 1] = gray.data[i]
    rgba[i * 4 + 2] = gray.data[i]
    rgba[i * 4 + 3] = 255
  }
  return { width: gray.width, height: gray.height, rgba }
}

describe('analyzeMapPhoto', () => {
  it('registers a photo against a matching reference and reports dimensions', () => {
    const gray = texture()
    const ref = buildMapReference('overworld', gray, { maxDimension: 260, levels: 3, maxFeaturesPerLevel: 200, threshold: 20 })
    const result = analyzeMapPhoto({ gray, color: toColor(gray) }, [ref])
    expect(result.width).toBe(gray.width)
    expect(result.height).toBe(gray.height)
    expect(result.registration).not.toBeNull()
    expect(result.registration!.inliers).toBeGreaterThan(5)
  })
})
