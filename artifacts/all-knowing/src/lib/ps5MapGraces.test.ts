import { describe, expect, it } from 'vitest'
import { detectGraceBlobs, isGoldPixel, snapGraces, type ColorImage } from './ps5MapGraces'
import type { MapReference } from './ps5MapReference'

function scene(width = 200, height = 160): ColorImage {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = 120
    rgba[i * 4 + 1] = 110
    rgba[i * 4 + 2] = 95
    rgba[i * 4 + 3] = 255
  }
  return { width, height, rgba }
}

function disc(img: ColorImage, cx: number, cy: number, r: number, r0: number, g0: number, b0: number) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue
      const p = (y * img.width + x) * 4
      img.rgba[p] = r0
      img.rgba[p + 1] = g0
      img.rgba[p + 2] = b0
    }
  }
}

describe('isGoldPixel', () => {
  it('accepts warm gold and rejects terrain reds, parchment and blue', () => {
    expect(isGoldPixel(232, 184, 96)).toBe(true)
    expect(isGoldPixel(196, 150, 70)).toBe(true)
    expect(isGoldPixel(150, 60, 50)).toBe(false) // Caelid rust
    expect(isGoldPixel(200, 195, 185)).toBe(false) // pale parchment
    expect(isGoldPixel(90, 130, 180)).toBe(false) // Liurnia water
  })
})

describe('detectGraceBlobs', () => {
  it('finds gold discs and ignores same-sized red discs', () => {
    const img = scene(240, 200)
    disc(img, 60, 60, 3, 240, 190, 90)
    disc(img, 170, 120, 3, 220, 70, 55)
    const blobs = detectGraceBlobs(img)
    expect(blobs.length).toBe(1)
    expect(blobs[0].x).toBeCloseTo(60, 0)
    expect(blobs[0].y).toBeCloseTo(60, 0)
  })
})

describe('snapGraces', () => {
  const ref: MapReference = { world: 'overworld', width: 4096, height: 3880, features: [] }

  it('snaps a blob to the nearest known grace and dedupes per grace', () => {
    // The First Step is 35.05%, 70.05% of plate width -> (1435.6, 2869.2).
    const blobs = [
      { x: 1436, y: 2869, radius: 12, area: 450, fill: 0.9, strength: 0.9 },
      { x: 1438, y: 2871, radius: 12, area: 450, fill: 0.85, strength: 0.8 },
    ]
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const snaps = snapGraces(blobs, identity, ref, 'overworld', { tolerancePercent: 1 })
    expect(snaps).toHaveLength(1)
    expect(snaps[0].graceId).toBe('grace:first-step')
    expect(snaps[0].confidence).toBeGreaterThan(0.5)
  })

  it('does not snap a blob with no known grace inside the tolerance', () => {
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    const far = [{ x: 100, y: 100, radius: 12, area: 450, fill: 0.9, strength: 0.9 }]
    expect(snapGraces(far, identity, ref, 'overworld', { tolerancePercent: 0.5 })).toHaveLength(0)
  })
})
