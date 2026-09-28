import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import imageIndex from '../data/image-index.json'
import { createNodeWorker, grayViaTesseract, type NodeOcrWorker } from './ps5Capture.node'
import { cellImage, detectSlotGrid } from './ps5Equipment'
import { classFromImagePath, encodeDescriptor, iconDescriptor, rankIconCandidates, type IconClass, type IconReference } from './ps5Icons'

/**
 * Task 134 §3 — icon-match accuracy over the real equipment photo. This builds the
 * reference descriptors from the cached WebP icons, matches every populated grid
 * cell (restricted to its slot class) and prints the top-3 with confidence. The
 * accuracy is reported, not gated: on phone photos of a TV the exact-name rate is
 * low, which is exactly why the UI never auto-applies a match.
 */

const CELL_CLASSES: [number, number, string, IconClass][] = [
  [0, 0, 'right armament', 'weapon'], [0, 1, 'right armament', 'weapon'], [0, 2, 'right armament', 'weapon'],
  [0, 3, 'arrows x25', 'ammo'], [0, 4, 'fire arrows x36', 'ammo'],
  [1, 0, 'left armament', 'weapon'], [1, 1, 'offhand', 'shield'], [1, 2, 'offhand', 'shield'],
  [1, 3, 'bolts x70', 'ammo'], [1, 4, 'bolts x99', 'ammo'],
  [2, 0, 'helm', 'armor'], [2, 1, 'chest', 'armor'], [2, 2, 'arms', 'armor'], [2, 3, 'legs', 'armor'],
  [3, 0, 'talisman', 'talisman'], [3, 1, 'talisman', 'talisman'], [3, 2, 'talisman', 'talisman'], [3, 3, 'talisman', 'talisman'],
  [4, 0, 'crimson flask', 'item'], [4, 1, 'cerulean flask', 'item'], [4, 2, 'physick', 'item'], [4, 3, 'rune arc', 'item'], [4, 4, 'throwing knives', 'item'],
  [5, 0, 'pots', 'item'],
]

describe('icon matching (slow OCR eval)', () => {
  let worker: NodeOcrWorker
  beforeAll(async () => { worker = await createNodeWorker() }, 120_000)
  afterAll(async () => { await worker?.terminate() })

  it('prints top-3 candidates per grid cell', async () => {
    const idx = imageIndex as Record<string, string>
    const classes: IconClass[] = ['weapon', 'shield', 'armor', 'talisman', 'ammo', 'item']
    const refs: IconReference[] = []
    const started = Date.now()
    for (const [name, imagePath] of Object.entries(idx)) {
      const klass = classFromImagePath(imagePath)
      if (!klass || !classes.includes(klass)) continue
      const file = path.resolve(process.cwd(), 'public', imagePath.replace(/^\//, ''))
      try {
        const gray = await grayViaTesseract(worker, file)
        refs.push({ name, klass, d: encodeDescriptor(iconDescriptor(gray)) })
      } catch { /* icon not decodable, skip */ }
    }
    console.log(`[ps5] icon refs: ${refs.length} decoded in ${Date.now() - started}ms`)

    const gray = await grayViaTesseract(worker, path.resolve(__dirname, '__fixtures__/ps5/equipment-photo-01.jpg'))
    const grid = detectSlotGrid(gray)
    expect(grid).toBeTruthy()
    let classHits = 0
    for (const [r, c, label, klass] of CELL_CLASSES) {
      const top = rankIconCandidates(iconDescriptor(cellImage(gray, grid!, r, c)), refs.filter((x) => x.klass === klass), 3)
      if (top[0]?.klass === klass) classHits++
      console.log(`[ps5] cell ${r},${c} ${label} → ${top.map((t) => `${t.name} (${t.confidence.toFixed(2)})`).join(' · ')}`)
    }
    // Candidates are restricted to the slot's class, so classHits is 24/24 by
    // construction; the meaningful output is the top-3 list itself, printed above.
    console.log(`[ps5] icon candidates printed for ${CELL_CLASSES.length} cells (reported, not gated; class-restricted ${classHits}/${CELL_CLASSES.length})`)
  }, 900_000)
})
