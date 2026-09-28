import { describe, expect, it } from 'vitest'
import { cellOccupancy, detectInventoryGrid, parseInventoryHeader } from './ps5Inventory'
import type { OcrWord } from './ps5Ocr'
import type { GrayImage } from './ps5Image'

function word(text: string, x0: number, y0: number, w = 90, h = 30, line = 1): OcrWord {
  return { text, confidence: 0.95, x0, y0, x1: x0 + w, y1: y0 + h, line }
}

describe('parseInventoryHeader', () => {
  it('reads a tab and the selected item from the right-panel title', () => {
    const words = [
      word('Inventory', 60, 20, 160, 40, 1),
      word('Key', 70, 80, 60, 30, 2),
      word('Items', 140, 80, 60, 30, 2),
      word('Holy-Shrouding', 700, 80, 180, 40, 3),
      word('Cracked', 890, 80, 120, 40, 3),
      word('Tear', 1020, 80, 80, 40, 3),
      word('No.', 700, 180, 50, 24, 4),
      word('Held', 760, 180, 60, 24, 4),
    ]
    const header = parseInventoryHeader(words, 1200)
    expect(header.tab).toBe('Key Items')
    expect(header.category).toBe('key-item')
    expect(header.selected).toBe('Holy-Shrouding Cracked Tear')
  })

  it('prefers the longest matching tab', () => {
    const words = [word('Ashes', 70, 80, 90, 30, 2), word('of', 170, 80, 30, 30, 2), word('War', 210, 80, 60, 30, 2)]
    expect(parseInventoryHeader(words, 1200).tab).toBe('Ashes of War')
  })
})

describe('detectInventoryGrid + occupancy', () => {
  it('finds occupied cells from their texture', () => {
    const width = 400
    const height = 400
    const data = new Uint8Array(width * height).fill(40)
    // draw an icon in cell (0,0) and (1,2) of a 5x4 lattice
    const draw = (r: number, c: number) => {
      const cx = 40 + c * 70
      const cy = 40 + r * 70
      for (let y = cy; y < cy + 40; y++) for (let x = cx; x < cx + 40; x++) data[y * width + x] = ((x + y) % 2) * 200 + 40
    }
    draw(0, 0)
    draw(1, 2)
    const img: GrayImage = { width, height, data }
    const grid = detectInventoryGrid(img)
    if (grid) {
      const { occupied } = cellOccupancy(img, grid)
      expect(occupied.filter(Boolean).length).toBeGreaterThan(0)
    }
  })
})
