import { describe, expect, it } from 'vitest'
import {
  applyH,
  bitsFromBase64,
  bitsToBase64,
  detectFeatures,
  hamming,
  homography4,
  invert3,
  matchFeatures,
  mul3,
  ransacHomography,
  type Pt,
} from './ps5MapFeatures'
import type { GrayImage } from './ps5Image'

function checkerboard(width = 160, height = 120): GrayImage {
  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = (Math.floor(x / 10) + Math.floor(y / 10)) % 2
      const ring = (x - 40) * (x - 40) + (y - 60) * (y - 60) < 30 * 30 ? 40 : 0
      data[y * width + x] = cell ? 40 + ring : 220 - ring
    }
  }
  return { width, height, data }
}

describe('bits base64', () => {
  it('round-trips a descriptor', () => {
    const bits = new Uint8Array(32)
    for (let i = 0; i < bits.length; i++) bits[i] = (i * 37) & 0xff
    expect(Array.from(bitsFromBase64(bitsToBase64(bits)))).toEqual(Array.from(bits))
  })
})

describe('homography algebra', () => {
  const src: Pt[] = [[10, 12], [200, 15], [210, 180], [8, 160]]
  const dst: Pt[] = [[30, 40], [260, 30], [245, 230], [20, 210]]

  it('exactly maps the four correspondences', () => {
    const H = homography4(src, dst)
    expect(H).not.toBeNull()
    for (let i = 0; i < 4; i++) {
      const [u, v] = applyH(H!, src[i][0], src[i][1])
      expect(u).toBeCloseTo(dst[i][0], 3)
      expect(v).toBeCloseTo(dst[i][1], 3)
    }
  })

  it('inverts consistently', () => {
    const H = homography4(src, dst)!
    const Hinv = invert3(H)!
    const I = mul3(H, Hinv)
    expect(I[0]).toBeCloseTo(1, 6)
    expect(I[4]).toBeCloseTo(1, 6)
    expect(I[8]).toBeCloseTo(1, 6)
    expect(I[1]).toBeCloseTo(0, 6)
  })
})

describe('ransacHomography', () => {
  it('recovers a transform from mostly-outlier correspondences', () => {
    const Htrue = [1.1, 0.05, 30, -0.04, 0.95, 20, 0.00002, 0.00001, 1]
    const from: Pt[] = []
    const to: Pt[] = []
    for (let i = 0; i < 40; i++) {
      const x = (i * 37) % 280
      const y = (i * 53) % 190
      from.push([x, y])
      to.push(applyH(Htrue, x, y))
    }
    for (let i = 0; i < 60; i++) to.push([(i * 91) % 300, (i * 61) % 200])
    for (let i = 40; i < 100; i++) from.push([(i * 29) % 280, (i * 17) % 190])
    const r = ransacHomography(from, to, [], { maxIterations: 4000, threshold: 1.5, seed: 7 })
    expect(r).not.toBeNull()
    expect(r!.inliers).toBeGreaterThanOrEqual(35)
    expect(r!.error).toBeLessThan(1.5)
  })
})

describe('detectFeatures + matchFeatures', () => {
  it('finds features and matches an image to its shift', () => {
    const img = checkerboard()
    const shifted: GrayImage = { width: img.width, height: img.height, data: new Uint8Array(img.width * img.height) }
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const sx = Math.max(0, Math.min(img.width - 1, x - 3))
        shifted.data[y * img.width + x] = img.data[y * img.width + sx]
      }
    }
    const a = detectFeatures(img, { maxDimension: 160, levels: 1, maxFeaturesPerLevel: 200, threshold: 20 })
    const b = detectFeatures(shifted, { maxDimension: 160, levels: 1, maxFeaturesPerLevel: 200, threshold: 20 })
    expect(a.length).toBeGreaterThan(10)
    const matches = matchFeatures(b, a, { ratio: 0.9, maxDistance: 40 })
    expect(matches.length).toBeGreaterThan(3)
    for (const m of matches.slice(0, 5)) {
      expect(hamming(b[m.query].bits, a[m.ref].bits)).toBeLessThanOrEqual(40)
    }
  })
})
