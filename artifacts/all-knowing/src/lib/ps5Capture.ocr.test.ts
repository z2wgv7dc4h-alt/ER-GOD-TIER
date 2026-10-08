import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import groundTruth from './__fixtures__/ps5/ground-truth.json'
import {
  createNodeWorker,
  equipmentFromPhoto,
  loadWeaponNamesFromTextDump,
  statusFromPhoto,
  type NodeOcrWorker,
} from './ps5Capture.node'
import { buildWeaponCatalogue } from './ps5Equipment'

/**
 * Task 134 §3 — the slow end-to-end eval over the real captures. It is excluded
 * from `npm test` (see vitest.config.ts) because WASM OCR takes seconds per photo;
 * run it with `npm run test:ocr`. The assertions here gate the documented
 * acceptance, while `console.log` lines print the values-vs-ground-truth table.
 */

const FIXTURE = path.resolve(__dirname, '__fixtures__/ps5')
const statusTruth = groundTruth['status-photo-01.jpg']
const equipmentTruth = groundTruth['equipment-photo-01.jpg']

describe('PS5 real captures (slow OCR eval)', () => {
  let worker: NodeOcrWorker
  beforeAll(async () => {
    worker = await createNodeWorker()
  }, 120_000)
  afterAll(async () => {
    await worker?.terminate()
  })

  it('reads the Status photo to the ground-truth numbers and base stats', async () => {
    const result = await statusFromPhoto(worker, path.join(FIXTURE, 'status-photo-01.jpg'))
    console.log('[ps5] status', JSON.stringify({
      name: result.name,
      level: result.level,
      runesHeld: result.runesHeld,
      runesNeeded: result.runesNeeded,
      displayed: result.displayedStats,
      base: result.baseStats,
      bonus: result.bonus.gear?.map((g) => g.name),
      ms: result.ms,
      words: result.words,
    }))
    expect(result.name).toBe(statusTruth.name)
    expect(result.level).toBe(statusTruth.level)
    expect(result.runesHeld).toBe(statusTruth.runesHeld)
    expect(result.runesNeeded).toBe(statusTruth.runesNeeded)
    expect(result.displayedStats).toEqual(statusTruth.displayedStats)
    expect(result.baseStats).toEqual(statusTruth.expectedBaseStats)
    expect(result.bonus.gear?.map((g) => g.name)).toEqual([statusTruth.inferredTalisman])
  }, 600_000)

  it('reads the Equipment header exactly', async () => {
    const names = loadWeaponNamesFromTextDump(path.resolve(process.cwd(), 'public/sourced/open/text/WeaponName.json'))
    const armory = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/sourced/armory-weapons.json'), 'utf8')) as { name: string; skill: string }[]
    const catalogue = buildWeaponCatalogue([...names, ...armory.map((w) => w.name)], armory.map((w) => w.skill))
    const result = await equipmentFromPhoto(worker, path.join(FIXTURE, 'equipment-photo-01.jpg'), catalogue)
    console.log('[ps5] equipment', JSON.stringify({
      slot: result.header.slot,
      item: result.header.item,
      counts: result.counts,
      grid: result.grid,
      ms: result.ms,
    }))
    expect(result.header.slot).toBe(equipmentTruth.selectedSlot)
    expect(result.header.item?.base).toBe(equipmentTruth.selectedItem.name)
    expect(result.header.item?.affinity).toBe(equipmentTruth.selectedItem.affinity)
    expect(result.header.item?.upgrade).toBe(equipmentTruth.selectedItem.upgrade)
    expect(result.header.item?.weaponType).toBe(equipmentTruth.selectedItem.weaponType)

    // Task 175: the stack counts are now isolated as glyph blobs before OCR, so
    // all nine read off the real capture (Task 134 managed 6/9 with a fixed crop).
    const expected = [
      equipmentTruth.gridCounts.crimsonFlask, equipmentTruth.gridCounts.ceruleanFlask,
      equipmentTruth.gridCounts.arrows, equipmentTruth.gridCounts.fireArrows,
      equipmentTruth.gridCounts.bolts1, equipmentTruth.gridCounts.bolts2,
      equipmentTruth.gridCounts.throwingKnives, equipmentTruth.gridCounts.slot23Count,
      equipmentTruth.gridCounts.pots,
    ]
    const got = result.counts.filter((n): n is number => n !== undefined)
    const correct = expected.filter((n) => got.includes(n)).length
    console.log(`[ps5] grid counts read: ${JSON.stringify(result.counts)}`)
    console.log(`[ps5] grid count accuracy: ${correct}/9 correct`)
    expect(correct).toBe(9)
  }, 600_000)
})
