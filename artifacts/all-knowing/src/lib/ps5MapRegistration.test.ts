import { describe, expect, it } from 'vitest'
import type { GrayImage } from './ps5Image'
import { applyH, invert3, type Homography } from './ps5MapFeatures'
import { detectFeatures } from './ps5MapFeatures'
import { buildMapReference } from './ps5MapReference'
import { registerToWorld, regionsInBounds } from './ps5MapRegistration'

/** A texture with plenty of unique corners, so detection/description has something to chew. */
function texture(width = 320, height = 260): GrayImage {
  const data = new Uint8Array(width * height).fill(110)
  let seed = 0x51ed270b
  const rnd = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  for (let i = 0; i < 90; i++) {
    const cx = Math.floor(rnd() * (width - 30)) + 15
    const cy = Math.floor(rnd() * (height - 30)) + 15
    const r = 5 + Math.floor(rnd() * 10)
    const v = rnd() > 0.5 ? 20 + Math.floor(rnd() * 40) : 190 + Math.floor(rnd() * 55)
    for (let y = cy - r; y <= cy + r; y++) {
      if (y < 0 || y >= height) continue
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || x >= width) continue
        const dx = x - cx
        const dy = y - cy
        const shape = rnd() > 0.5 ? dx * dx + dy * dy <= r * r : Math.abs(dx) + Math.abs(dy) <= r
        if (shape) data[y * width + x] = v
      }
    }
  }
  return { width, height, data }
}

/** Resample `src` through `H` (from output coords to input coords) into a new image. */
function warp(src: GrayImage, HoutToIn: Homography, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height).fill(128)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [sx, sy] = applyH(HoutToIn, x, y)
      const xi = Math.round(sx)
      const yi = Math.round(sy)
      if (xi < 0 || yi < 0 || xi >= src.width || yi >= src.height) continue
      data[y * width + x] = src.data[yi * src.width + xi]
    }
  }
  return { width, height, data }
}

describe('registerToWorld (synthetic geometry)', () => {
  it('recovers a mild perspective warp from keypoint matches', () => {
    const ref = buildMapReference('overworld', texture(), { maxDimension: 320, levels: 4, maxFeaturesPerLevel: 400, threshold: 18 })
    ref.width = 320
    ref.height = 260
    // The photo is a scaled + slightly perspective view of the reference.
    const HphotoToRef: Homography = [1.08, 0.02, 22, -0.015, 1.05, -14, 0.00003, 0.00002, 1]
    const HrefToPhoto = invert3(HphotoToRef)!
    const photo = warp(texture(), HrefToPhoto, 340, 280)
    const photoF = detectFeatures(photo, { maxDimension: 340, levels: 4, maxFeaturesPerLevel: 400, threshold: 18 })
    const reg = registerToWorld(photoF, ref)
    expect(reg).not.toBeNull()
    expect(reg!.inliers).toBeGreaterThan(20)
    expect(reg!.error).toBeLessThan(2)
    // The photo pixel → reference pixel truth is the inverse used to build it.
    const truth = HrefToPhoto
    for (const p of [[60, 60], [250, 40], [260, 220], [50, 210]] as const) {
      const [u, v] = applyH(reg!.H, p[0], p[1])
      const [tu, tv] = applyH(truth, p[0], p[1])
      expect(Math.hypot(u - tu, v - tv)).toBeLessThan(3)
    }
  })

  it('reports regions whose graces fall in the frame bounds', () => {
    const ref = buildMapReference('overworld', texture(), { maxDimension: 320, levels: 2, maxFeaturesPerLevel: 50, threshold: 20 })
    ref.width = 4096
    ref.height = 3880
    // Limgrave first-step is at 35.05%, 70.05% -> about (1436, 2718).
    const regions = regionsInBounds('overworld', [1200, 2400, 1700, 3000], ref)
    expect(regions).toContain('Limgrave')
    expect(regions).not.toContain('Siofra')
  })
})
