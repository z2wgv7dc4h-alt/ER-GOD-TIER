import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import groundTruth from './__fixtures__/ps5/ground-truth.json'
import { createNodeWorker, grayViaTesseract, readWords, type NodeOcrWorker } from './ps5Capture.node'
import { preprocessVariants } from './ps5Image'
import { setEntityIndex, type EntityRecord } from './entityIndex'
import { extractScanObservation, InventoryStabilizer, normalizeItemName } from './ps5Scanner'

/**
 * Task 136 §4 — the scanner engine on the real inventory fixtures. A still photo
 * is treated as a single frame, but each frame runs the full Task 134 ladder, so
 * its reads vote exactly as successive video frames would. Gates the recovered
 * highlighted-item name and the category-restricted fact id; the tab title is
 * gated too.
 */

type Truth = { tab: string; category?: string; selectedItem: string }

const CASES = [
  { fixture: 'inventory-spirit-ashes-01.jpg', factId: 'item:putrid-corpse-ashes' },
  { fixture: 'inventory-bolstering-01.jpg', factId: 'item:grave-glovewort-1' },
  { fixture: 'inventory-key-items-01.jpg', factId: 'item:holy-shrouding-cracked-tear' },
  { fixture: 'inventory-sorceries-01.jpg', factId: 'item:ambush-shard' },
  { fixture: 'inventory-ashes-of-war-01.jpg', factId: 'item:ash-of-war-spinning-slash' },
  { fixture: 'inventory-tools-01.jpg', factId: 'item:blue-cipher-ring' },
] as const

describe('PS5 live inventory scanner (slow OCR eval)', () => {
  let worker: NodeOcrWorker
  beforeAll(async () => {
    const doc = JSON.parse(
      readFileSync(path.resolve(__dirname, '../../public/sourced/entity-index.json'), 'utf8'),
    ) as { records?: Record<string, EntityRecord> }
    const map = new Map<string, EntityRecord>()
    for (const [id, record] of Object.entries(doc.records ?? {})) map.set(id, record)
    setEntityIndex(map)
    worker = await createNodeWorker()
  }, 120_000)
  afterAll(async () => { await worker?.terminate() })

  for (const testCase of CASES) {
    it(`recovers ${testCase.fixture}`, async () => {
      const truth = (groundTruth as Record<string, unknown>)[testCase.fixture] as Truth
      const gray = await grayViaTesseract(worker, path.resolve(__dirname, '__fixtures__/ps5', testCase.fixture))
      const stabilizer = new InventoryStabilizer()
      for (const variant of preprocessVariants(gray).map((v) => v.image)) {
        for (const psm of ['6', '4']) {
          stabilizer.observe(extractScanObservation(await readWords(worker, variant, psm), gray.width, gray.height))
        }
      }
      const result = stabilizer.result()
      const names = [...result.items, ...result.pending]
      const found = names.find((item) => normalizeItemName(item.name) === normalizeItemName(truth.selectedItem))
      console.log(`[scan] ${testCase.fixture} tab=${result.tab} name=${JSON.stringify(found?.name)} fact=${found?.factId} reads=${JSON.stringify(names.map((n) => n.name))}`)
      expect(result.tab).toBe(truth.tab)
      expect(found, `no read matched "${truth.selectedItem}"`).toBeDefined()
      expect(found?.factId).toBe(testCase.factId)
    }, 600_000)
  }
})
