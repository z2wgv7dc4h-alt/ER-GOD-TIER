import { cropGray, ps5PreprocessLadder, rgbaToGray, upscale, type GrayImage } from './ps5Image'
import { parseTsvWords } from './ps5Ocr'
import { locateCountGlyphs, parseCountText } from './ps5Counts'
import { extractStatus, interpretStatus, mergeStatusReads, type StatusInterpretation } from './ps5Status'
import { readImageTsv } from './ocr'
import {
  buildWeaponCatalogue,
  cellImage,
  countRegion,
  detectSlotGrid,
  extractEquipmentHeader,
  type EquipmentHeader,
  type SlotGrid,
  type WeaponCatalogue,
} from './ps5Equipment'
import { classFromImagePath, encodeDescriptor, iconDescriptor, rankIconCandidates, type IconCandidate, type IconReference } from './ps5Icons'

/**
 * Task 134 — browser adapter for the real PS5 capture pipeline.
 *
 * Same extraction as the Node eval (`ps5Capture.node.ts`), but pixels come from a
 * canvas instead of Tesseract's `imageGrey` output. Everything runs on-device; no
 * image or text leaves the tab. Equipment icon candidates need the reference
 * descriptors (built by `npm run build:ps5-icons`); if they are not loaded yet,
 * the header/loadout read still works and no suggestions are shown.
 */

const PSMS = ['6', '4']

function loadBitmap(image: Blob | string): Promise<ImageBitmap> {
  if (typeof image === 'string') {
    return new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(createImageBitmap(el))
      el.onerror = () => reject(new Error('Could not load that image.'))
      el.src = image
    })
  }
  return createImageBitmap(image)
}

/** Decode the uploaded/selected image to an 8-bit grayscale buffer. */
export async function grayFromImage(image: Blob | string): Promise<GrayImage> {
  const bitmap = await loadBitmap(image)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(bitmap, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close?.()
  return rgbaToGray(data, width, height)
}

export function grayToCanvas(gray: GrayImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = gray.width
  canvas.height = gray.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  const image = ctx.createImageData(gray.width, gray.height)
  for (let i = 0, p = 0; i < gray.data.length; i++, p += 4) {
    const v = gray.data[i]
    image.data[p] = v
    image.data[p + 1] = v
    image.data[p + 2] = v
    image.data[p + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

export type BrowserStatusResult = StatusInterpretation & { ms: number }

/** Status-screen pipeline: preprocess variants → anchored reads → merge → validate. */
export async function analyzeStatusImage(image: Blob | string): Promise<BrowserStatusResult> {
  const started = Date.now()
  const gray = await grayFromImage(image)
  const reads = []
  for (const variant of ps5PreprocessLadder(gray)) {
    const canvas = grayToCanvas(variant)
    for (const psm of PSMS) {
      const { tsv } = await readImageTsv(canvas, psm)
      reads.push(extractStatus(parseTsvWords(tsv)))
    }
  }
  return { ...interpretStatus(mergeStatusReads(reads)), ms: Date.now() - started }
}

export type BrowserEquipmentResult = {
  header: EquipmentHeader
  grid?: SlotGrid
  counts: (number | undefined)[]
  candidates: (IconCandidate[] | undefined)[]
  ms: number
}

/**
 * Equipment-screen pipeline. Icon candidates are only produced when a reference
 * feature index is supplied; matches below the confidence floor are dropped so a
 * low-confidence guess is never offered as a fact.
 */
export async function analyzeEquipmentImage(
  image: Blob | string,
  catalogue: WeaponCatalogue,
  refs: IconReference[] = [],
  confidenceFloor = 0.6,
): Promise<BrowserEquipmentResult> {
  const started = Date.now()
  const gray = await grayFromImage(image)
  let header: EquipmentHeader = { lines: [] }
  for (const variant of ps5PreprocessLadder(gray)) {
    const canvas = grayToCanvas(variant)
    for (const psm of PSMS) {
      const { tsv } = await readImageTsv(canvas, psm)
      const candidate = extractEquipmentHeader(parseTsvWords(tsv), catalogue)
      if (candidate.item && candidate.item.matchScore > (header.item?.matchScore ?? 0)) header = candidate
      else if (!header.item && candidate.item) header = candidate
      else if (!header.slot && candidate.slot) header = { ...header, slot: candidate.slot }
    }
  }
  const grid = detectSlotGrid(gray)
  const candidates: (IconCandidate[] | undefined)[] = []
  const counts: (number | undefined)[] = []
  if (grid) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const slotClass = slotClassFor(grid, r, c)
        if (refs.length && slotClass) {
          const restricted = refs.filter((x) => x.klass === slotClass)
          const top = rankIconCandidates(iconDescriptor(cellImage(gray, grid, r, c)), restricted, 3).filter((t) => t.confidence >= confidenceFloor)
          candidates.push(top.length ? top : undefined)
        } else {
          candidates.push(undefined)
        }
        counts.push(await readCount(gray, grid, r, c))
      }
    }
  }
  return { header, grid, counts, candidates, ms: Date.now() - started }
}

/** Slot class by the fixed equipment layout (armaments, armour, talismans, items). */
function slotClassFor(_grid: SlotGrid, row: number, col: number): IconReference['klass'] | undefined {
  if (row <= 1) return col <= 2 ? 'weapon' : 'ammo'
  if (row === 2) return 'armor'
  if (row === 3) return 'talisman'
  if (row === 4 || row === 5) return 'item'
  return undefined
}

async function readCount(gray: GrayImage, grid: SlotGrid, row: number, col: number): Promise<number | undefined> {
  const glyphs = locateCountGlyphs(countRegion(gray, grid, row, col))
  if (!glyphs) return undefined
  const { text } = await readImageTsv(grayToCanvas(upscale(glyphs, 4)), '8')
  return parseCountText(text)
}

/** Keep a crop helper exported for callers that want to preview a cell. */
export { cropGray }

let catalogueCache: WeaponCatalogue | null = null

/** Load the committed weapon names (base + DLC) and skill list for the header parse. */
export async function loadBrowserWeaponCatalogue(): Promise<WeaponCatalogue> {
  if (catalogueCache) return catalogueCache
  const names = new Set<string>()
  const skills: string[] = []
  try {
    const weaponNames = (await fetch('/sourced/open/text/WeaponName.json').then((r) => r.json())) as Record<string, string>
    const affinity = /^(Heavy|Keen|Quality|Fire|Flame Art|Lightning|Sacred|Magic|Cold|Poison|Blood|Occult)\s+/i
    for (const value of Object.values(weaponNames)) if (typeof value === 'string') names.add(value.replace(affinity, '').trim())
  } catch { /* names are optional; the header still parses without a catalogue */ }
  try {
    const armory = (await fetch('/sourced/armory-weapons.json').then((r) => r.json())) as { name: string; skill: string }[]
    for (const w of armory) {
      names.add(w.name)
      if (w.skill) skills.push(w.skill)
    }
  } catch { /* optional */ }
  catalogueCache = buildWeaponCatalogue([...names], skills)
  return catalogueCache
}

/** Build a reference feature from a decoded icon (browser-side builder). */
export function referenceFromGray(name: string, imagePath: string, gray: GrayImage): IconReference | undefined {
  const klass = classFromImagePath(imagePath)
  if (!klass) return undefined
  return { name, klass, d: encodeDescriptor(iconDescriptor(gray)) }
}
