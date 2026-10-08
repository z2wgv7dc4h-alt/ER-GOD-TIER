import { describe, expect, it } from 'vitest'
import { locateCountGlyphs, parseCountText } from './ps5Counts'
import type { GrayImage } from './ps5Image'

/**
 * Task 175 — the stack-count glyph isolator that both the Node eval and the
 * browser equipment reader share. These are synthetic cells, so they pin the
 * shape rules (solid, digit-sized, right-hand side) without needing OCR.
 */

function blank(width: number, height: number, value = 80): GrayImage {
  return { width, height, data: new Uint8Array(width * height).fill(value) }
}

function fillRect(img: GrayImage, x0: number, y0: number, w: number, h: number, value = 240) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.data[y * img.width + x] = value
}

describe('locateCountGlyphs', () => {
  it('returns a crop spanning two digit-sized glyphs on the right', () => {
    const img = blank(120, 60)
    fillRect(img, 70, 25, 10, 24)
    fillRect(img, 84, 25, 10, 24)
    const crop = locateCountGlyphs(img)
    expect(crop).toBeDefined()
    expect(crop!.width).toBeGreaterThanOrEqual(24)
    // The isolate must not swallow the whole region.
    expect(crop!.width).toBeLessThan(50)
  })

  it('ignores a large icon blob in the left half', () => {
    const img = blank(120, 60)
    fillRect(img, 10, 10, 40, 40)
    expect(locateCountGlyphs(img)).toBeUndefined()
  })

  it('ignores an over-tall blob in the right half (icon, not a digit)', () => {
    const img = blank(120, 60)
    fillRect(img, 80, 4, 18, 52)
    expect(locateCountGlyphs(img)).toBeUndefined()
  })

  it('returns undefined for a flat, empty cell', () => {
    expect(locateCountGlyphs(blank(120, 60))).toBeUndefined()
  })
})

describe('parseCountText', () => {
  it('accepts plausible stack sizes and rejects noise', () => {
    expect(parseCountText(' 70 ')).toBe(70)
    expect(parseCountText('bo7o')).toBe(7)
    expect(parseCountText('0')).toBeUndefined()
    expect(parseCountText('')).toBeUndefined()
    expect(parseCountText('12345')).toBeUndefined()
  })
})
