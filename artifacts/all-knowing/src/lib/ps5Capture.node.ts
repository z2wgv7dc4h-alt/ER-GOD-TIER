import { readFileSync } from 'node:fs'
import { decodeGrayPng, encodeGrayPng } from './pngGray'
import { ps5PreprocessLadder, upscale, type GrayImage } from './ps5Image'
import { parseTsvWords, type OcrWord } from './ps5Ocr'
import { extractStatus, interpretStatus, mergeStatusReads, type StatusInterpretation, type StatusRead } from './ps5Status'
import {
  buildWeaponCatalogue,
  detectSlotGrid,
  extractEquipmentHeader,
  normalizeWeapon,
  parseWeaponLine,
  type EquipmentHeader,
  type WeaponCatalogue,
  type SlotGrid,
} from './ps5Equipment'
import { cellOccupancy, detectInventoryGrid, inventoryCountRegion, parseInventoryHeader, type InventoryHeader } from './ps5Inventory'

/**
 * Task 134 — Node runner for the real PS5 captures.
 *
 * Tesseract decodes the JPEG (browser and Node alike) and exposes the page it read
 * as a grayscale PNG. We decode that, preprocess it into several variants, OCR each
 * with two page-segmentation modes, then merge the anchored reads. This file is
 * Node-only (it imports `node:zlib` through `pngGray`) and is used by the slow OCR
 * tests and the offline eval, never by the browser bundle.
 */

export type NodeOcrWorker = {
  recognize: (image: unknown, options?: unknown, output?: unknown) => Promise<{
    data: { text?: string | null; confidence?: number; tsv?: string | null; imageGrey?: string | null }
  }>
  terminate: () => Promise<unknown>
}

export async function createNodeWorker(): Promise<NodeOcrWorker> {
  const mod = (await import('tesseract.js')) as unknown as { createWorker: (lang?: string) => Promise<NodeOcrWorker> }
  return mod.createWorker('eng')
}

/** Decode the page Tesseract read into an 8-bit grayscale buffer. */
export async function grayViaTesseract(worker: NodeOcrWorker, imagePath: string): Promise<GrayImage> {
  const { data } = await worker.recognize(imagePath, {}, { imageGrey: true })
  if (!data.imageGrey) throw new Error('Tesseract did not return a grayscale image')
  return decodeGrayPng(Buffer.from(data.imageGrey.split(',')[1], 'base64'))
}

const PSMS = ['6', '4']

/** Recognize one preprocessed image and return positioned words. */
export async function readWords(worker: NodeOcrWorker, image: GrayImage, psm: string): Promise<OcrWord[]> {
  const { data } = await worker.recognize(encodeGrayPng(image), { tessedit_pageseg_mode: psm }, { text: true, tsv: true })
  return parseTsvWords(data.tsv)
}

export type StatusPhotoResult = StatusInterpretation & {
  variants: number
  words: number
  ms: number
  /** Per-variant anchored reads, for the eval's receipts. */
  reads: StatusRead[]
}

/** Full Status-screen pipeline for one photo. */
export async function statusFromPhoto(worker: NodeOcrWorker, imagePath: string): Promise<StatusPhotoResult> {
  const started = Date.now()
  const gray = await grayViaTesseract(worker, imagePath)
  const variants = preprocessLadder(gray)
  const reads = []
  let words = 0
  for (const variant of variants) {
    for (const psm of PSMS) {
      const list = await readWords(worker, variant, psm)
      words += list.length
      reads.push(extractStatus(list))
    }
  }
  const merged = mergeStatusReads(reads)
  return { ...interpretStatus(merged), variants: variants.length * PSMS.length, words, ms: Date.now() - started, reads }
}

function preprocessLadder(gray: GrayImage): GrayImage[] {
  return ps5PreprocessLadder(gray)
}

export type EquipmentPhotoResult = {
  header: EquipmentHeader
  grid?: SlotGrid
  counts: (number | undefined)[]
  ms: number
}

/** Full Equipment-screen pipeline: header + grid + best-effort stack counts. */
export async function equipmentFromPhoto(
  worker: NodeOcrWorker,
  imagePath: string,
  catalogue: WeaponCatalogue,
): Promise<EquipmentPhotoResult> {
  const started = Date.now()
  const gray = await grayViaTesseract(worker, imagePath)
  const variants = preprocessLadder(gray)
  let header: EquipmentHeader = { lines: [] }
  for (const variant of variants) {
    for (const psm of PSMS) {
      const list = await readWords(worker, variant, psm)
      const candidate = extractEquipmentHeader(list, catalogue)
      if (candidate.item && !header.item) header = candidate
      else if (candidate.item && candidate.item.matchScore > (header.item?.matchScore ?? 0)) header = candidate
      else if (!header.slot && candidate.slot) header = { ...header, slot: candidate.slot }
    }
  }
  const grid = detectSlotGrid(gray)
  const counts = grid ? await readGridCounts(worker, gray, grid) : []
  return { header, grid, counts, ms: Date.now() - started }
}

/**
 * Read the stack count in each cell's bottom-right corner. Counts are small and
 * sit over the cell's stone texture, so Tesseract is only trusted when the digit
 * run is right-aligned and isolated from the icon; otherwise the cell returns
 * undefined (the Setup UI then leaves the count as-is rather than inventing one).
 */
async function readGridCounts(worker: NodeOcrWorker, gray: GrayImage, grid: SlotGrid): Promise<(number | undefined)[]> {
  const out: (number | undefined)[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) out.push(await readCellCount(worker, gray, grid, r, c))
  }
  return out
}

async function readCellCount(worker: NodeOcrWorker, gray: GrayImage, grid: SlotGrid, row: number, col: number): Promise<number | undefined> {
  const x0 = Math.round(grid.left + col * grid.cellW + 0.42 * grid.cellW)
  const y0 = Math.round(grid.top + row * grid.cellH + 0.72 * grid.cellH)
  const x1 = Math.round(grid.left + col * grid.cellW + grid.cellW)
  const y1 = Math.round(grid.top + row * grid.cellH + grid.cellH)
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 4 || h <= 4) return undefined
  const strip = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const srcY = y0 + y
    if (srcY < 0 || srcY >= gray.height) continue
    for (let x = 0; x < w; x++) {
      const srcX = x0 + x
      if (srcX < 0 || srcX >= gray.width) continue
      strip[y * w + x] = gray.data[srcY * gray.width + srcX]
    }
  }
  // Bright digits on a dark cell → dark-on-light mask, keep only dense right-aligned columns.
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = strip[i] > 150 ? 1 : 0
  const colCount = new Array<number>(w).fill(0)
  for (let x = 0; x < w; x++) {
    let n = 0
    for (let y = 0; y < h; y++) n += mask[y * w + x]
    colCount[x] = n
  }
  const runs: [number, number][] = []
  let start = -1
  for (let x = 0; x < w; x++) {
    if (colCount[x] > h * 0.12) {
      if (start < 0) start = x
    } else if (start >= 0) {
      runs.push([start, x - 1])
      start = -1
    }
  }
  if (start >= 0) runs.push([start, w - 1])
  const merged: [number, number][] = []
  for (const run of runs) {
    const last = merged[merged.length - 1]
    if (last && run[0] - last[1] <= h * 0.7) last[1] = run[1]
    else merged.push([...run])
  }
  const right = merged.filter((run) => run[1] > w * 0.55 && run[1] - run[0] >= h * 0.15).pop()
  if (!right) return undefined
  let minY = h
  let maxY = 0
  for (let x = right[0]; x <= right[1]; x++) {
    for (let y = 0; y < h; y++) {
      if (mask[y * w + x]) {
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const pad = 8
  const cx0 = Math.max(0, right[0] - pad)
  const cx1 = Math.min(w, right[1] + pad + 1)
  const cy0 = Math.max(0, minY - pad)
  const cy1 = Math.min(h, maxY + pad + 1)
  const cw = cx1 - cx0
  const ch = cy1 - cy0
  const clean = new Uint8Array(cw * ch).fill(255)
  for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) if (mask[y * w + x]) clean[(y - cy0) * cw + (x - cx0)] = 0
  const { data } = await worker.recognize(
    encodeGrayPng(upscale({ width: cw, height: ch, data: clean }, 3)),
    { tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789' },
    { text: true },
  )
  const n = Number((data.text ?? '').replace(/\D/g, ''))
  if (!Number.isFinite(n) || n < 1 || n > 999) return undefined
  return n
}

/** Build a weapon catalogue from a JSON map or array of names. */
export function weaponCatalogueFromNames(names: string[], skills: string[] = []): WeaponCatalogue {
  return buildWeaponCatalogue(names, skills)
}

export type InventoryPhotoResult = {
  header: InventoryHeader
  grid?: SlotGrid
  occupied: boolean[]
  counts: (number | undefined)[]
  ms: number
}

/** Task 134 §4 — inventory page: tab, selected name, occupied cells and counts. */
export async function inventoryFromPhoto(worker: NodeOcrWorker, imagePath: string): Promise<InventoryPhotoResult> {
  const started = Date.now()
  const gray = await grayViaTesseract(worker, imagePath)
  const variants = preprocessLadder(gray)
  let best: InventoryHeader = { lines: [] }
  let bestScore = -1
  for (const variant of variants) {
    for (const psm of ['6', '4']) {
      const list = await readWords(worker, variant, psm)
      const candidate = parseInventoryHeader(list)
      const score = (candidate.tab ? 2 : 0) + (candidate.selected ? 1 : 0) + candidate.lines.length * 0.01
      if (score > bestScore) {
        best = candidate
        bestScore = score
      }
    }
  }
  const grid = detectInventoryGrid(gray)
  let occupied: boolean[] = []
  let counts: (number | undefined)[] = []
  if (grid) {
    occupied = cellOccupancy(gray, grid).occupied
    counts = []
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        counts.push(await readInventoryCount(worker, gray, grid, r, c))
      }
    }
  }
  return { header: best, grid, occupied, counts, ms: Date.now() - started }
}

async function readInventoryCount(worker: NodeOcrWorker, gray: GrayImage, grid: SlotGrid, row: number, col: number): Promise<number | undefined> {
  const region = inventoryCountRegion(gray, grid, row, col)
  if (region.width < 6 || region.height < 6) return undefined
  const { data } = await worker.recognize(
    encodeGrayPng(upscale(region, 3)),
    { tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789' },
    { text: true },
  )
  const n = Number((data.text ?? '').replace(/\D/g, ''))
  if (!Number.isFinite(n) || n < 1 || n > 999) return undefined
  return n
}

/** Load the game's weapon names (base + DLC + affinity variants) for fuzzy matching. */
export function loadWeaponNamesFromTextDump(path: string): string[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>
  const bases = new Set<string>()
  for (const value of Object.values(raw)) {
    if (typeof value !== 'string') continue
    const affinity = /^(Heavy|Keen|Quality|Fire|Flame Art|Lightning|Sacred|Magic|Cold|Poison|Blood|Occult)\s+/i
    bases.add(value.replace(affinity, '').trim())
  }
  return [...bases]
}

export { normalizeWeapon, parseWeaponLine }
