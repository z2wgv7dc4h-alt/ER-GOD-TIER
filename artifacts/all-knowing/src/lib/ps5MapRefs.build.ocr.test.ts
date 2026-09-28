import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'vitest'
import { grayViaTesseract } from './ps5Capture.node'
import { buildMapReference, emptyReferenceFile, MAP_PLATES } from './ps5MapReference'

/**
 * Task 135 §1 — one-time generator for the committed reference keypoints.
 *
 * It is a test only so it can import the TypeScript pipeline directly and reuse
 * the Node Tesseract decode that the rest of the PS5 work uses. It is skipped
 * unless `BUILD_MAP_REFS=1` is set, because it decodes two 4096x3880 plates and
 * writes a generated file:
 *
 *   BUILD_MAP_REFS=1 npm run test:ocr -- src/lib/ps5MapRefs.build.ocr.test.ts
 */
const ENABLED = process.env.BUILD_MAP_REFS === '1'

describe.skipIf(!ENABLED)('build committed map reference keypoints', () => {
  it('generates public/sourced/maps/map-ref-keypoints.json', async () => {
    const worker = await (await import('./ps5Capture.node')).createNodeWorker()
    const file = emptyReferenceFile()
    for (const world of ['overworld', 'underground'] as const) {
      const plate = MAP_PLATES[world]
      const gray = await grayViaTesseract(worker, path.resolve(process.cwd(), 'public', plate.src.replace(/^\//, '')))
      const ref = buildMapReference(world, gray)
      ref.width = plate.width
      ref.height = plate.height
      file.worlds[world] = ref
    }
    await worker.terminate()
    const out = path.resolve(process.cwd(), 'public/sourced/maps/map-ref-keypoints.json')
    writeFileSync(out, JSON.stringify(file))
    console.log(`wrote ${out}`)
  }, 600_000)
})
