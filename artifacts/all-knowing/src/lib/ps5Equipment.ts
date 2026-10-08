import type { LoadoutSlot } from '../types'
import { cropGray, type GrayImage } from './ps5Image'
import { type OcrWord } from './ps5Ocr'

/**
 * Task 134 §2 — Equipment screen: header, weapon line and the 5x6 slot grid.
 *
 * The header is label-anchored like the Status screen: the slot line ("Right Hand
 * Armament 1") and the item line ("Blood Reed Great Katana+14") are found by
 * content, not by cropping. The item line is split into affinity prefix, base
 * weapon (fuzzy-matched to the catalogue, DLC included) and upgrade level, then
 * written into `loadout` for that slot. The grid geometry feeds icon matching and
 * the stack-count read.
 */

export const AFFINITIES = [
  'Heavy', 'Keen', 'Quality', 'Fire', 'Flame Art', 'Lightning', 'Sacred',
  'Magic', 'Cold', 'Poison', 'Blood', 'Occult',
] as const

/** Weapon categories, so a name whose catalogue row is unknown can still be typed. */
export const WEAPON_TYPES = [
  'Light Greatsword', 'Great Katana', 'Backhand Blade', 'Thrusting Shield', 'Hand-to-Hand Art',
  'Perfume Bottle', 'Colossal Sword', 'Colossal Weapon', 'Curved Greatsword', 'Curved Sword',
  'Heavy Thrusting Sword', 'Thrusting Sword', 'Straight Sword', 'Greatsword', 'Twinblade',
  'Great Spear', 'Spear', 'Halberd', 'Reaper', 'Greataxe', 'Axe', 'Great Hammer', 'Hammer',
  'Flail', 'Whip', 'Fist', 'Claw', 'Beast Claw', 'Dagger', 'Torch', 'Ballista', 'Greatbow',
  'Light Bow', 'Bow', 'Crossbow', 'Glintstone Staff', 'Glinstone Staff', 'Sacred Seal',
  'Throwing Blade', 'Warhammer',
]

export function normalizeWeapon(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export type WeaponCatalogue = {
  /** Normalised base weapon name → canonical name. */
  byBase: Map<string, string>
  /** Distinct skills, when the source knew them. */
  skills: string[]
}

/** Build a lookup that tolerates the game's DLC weapons (Reed Great Katana etc.). */
export function buildWeaponCatalogue(names: string[], skills: string[] = []): WeaponCatalogue {
  const byBase = new Map<string, string>()
  for (const name of names) {
    const key = normalizeWeapon(name)
    if (key && !byBase.has(key)) byBase.set(key, name)
  }
  return { byBase, skills: [...new Set(skills)] }
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

export type FuzzyHit = { name: string; score: number }

/**
 * Fuzzy-match a photographed weapon name. Exact after normalisation wins; else the
 * closest catalogue entry (edit distance normalised by length) above `floor`.
 */
export function fuzzyWeapon(base: string, catalogue: WeaponCatalogue, floor = 0.78): FuzzyHit | undefined {
  const key = normalizeWeapon(base)
  if (!key) return undefined
  const exact = catalogue.byBase.get(key)
  if (exact) return { name: exact, score: 1 }
  let best: FuzzyHit | undefined
  for (const [candidate, canonical] of catalogue.byBase) {
    if (Math.abs(candidate.length - key.length) > Math.max(4, key.length * 0.4)) continue
    const score = 1 - levenshtein(key, candidate) / Math.max(key.length, candidate.length)
    if (score >= floor && (!best || score > best.score)) best = { name: canonical, score }
  }
  return best
}

/** The weapon category a name ends with ("Reed Great Katana" → "Great Katana"). */
export function weaponTypeFromName(name: string): string | undefined {
  const n = name.toLowerCase()
  const sorted = [...WEAPON_TYPES].sort((a, b) => b.length - a.length)
  return sorted.find((t) => n.endsWith(t.toLowerCase()))
}

export type ParsedWeaponLine = {
  affinity?: string
  base: string
  upgrade?: number
  weaponType?: string
  /** 1 for an exact catalogue match, lower for a near one. */
  matchScore: number
  catalogueName?: string
}

/** Split "Blood Reed Great Katana+14" into affinity / base / upgrade. */
export function parseWeaponLine(raw: string, catalogue: WeaponCatalogue): ParsedWeaponLine | undefined {
  let text = raw.replace(/\s{2,}/g, ' ').trim()
  if (!text) return undefined
  let upgrade: number | undefined
  const plus = text.match(/\+\s?(\d{1,2})\s*$/)
  if (plus) {
    upgrade = Number(plus[1])
    text = text.slice(0, plus.index).trim()
  }
  let affinity: string | undefined
  for (const a of AFFINITIES) {
    const re = new RegExp(`^${a.replace(/ /g, '\\s+')}\\b`, 'i')
    if (re.test(text)) {
      affinity = a
      text = text.replace(re, '').trim()
      break
    }
  }
  if (!/[a-z]/i.test(text)) return undefined
  const hit = fuzzyWeapon(text, catalogue)
  const base = hit?.name ?? text.replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    affinity,
    base,
    upgrade,
    weaponType: weaponTypeFromName(base),
    matchScore: hit?.score ?? 0,
    catalogueName: hit?.name,
  }
}

const SLOT_PATTERNS: { re: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { re: /right\s+hand\s+armament\s*(\d)/i, label: (m) => `Right Hand Armament ${m[1]}` },
  { re: /left\s+hand\s+armament\s*(\d)/i, label: (m) => `Left Hand Armament ${m[1]}` },
  { re: /talisman\s*(\d)/i, label: (m) => `Talisman ${m[1]}` },
  { re: /spell\s*(\d)/i, label: (m) => `Spell ${m[1]}` },
  { re: /\b(head|helm)\b/i, label: () => 'Head' },
  { re: /(chest|body)\s+armor/i, label: () => 'Chest Armor' },
  { re: /\barms\b|gauntlets/i, label: () => 'Arms' },
  { re: /\blegs\b|greaves/i, label: () => 'Legs' },
  { re: /quick\s+item/i, label: () => 'Quick Item' },
  { re: /\bpouch\b/i, label: () => 'Pouch' },
]

export function parseSlotLabel(text: string): string | undefined {
  for (const { re, label } of SLOT_PATTERNS) {
    const m = text.match(re)
    if (m) return label(m)
  }
  return undefined
}

export type EquipmentHeader = {
  slot?: string
  item?: ParsedWeaponLine
  skill?: string
  weaponType?: string
  /** The raw lines the header was read from, for the UI's receipts. */
  lines: string[]
}

function rowLines(words: OcrWord[]): string[] {
  const rows = new Map<number, OcrWord[]>()
  for (const w of words) {
    const key = w.line
    const list = rows.get(key) ?? []
    list.push(w)
    rows.set(key, list)
  }
  return [...rows.values()]
    .map((list) => list.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(' ').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
}

/**
 * Find the slot + item header. Both sit in the top-left block; the item line is
 * whichever top line parses as a weapon (has an upgrade or a catalogue match).
 * The right stats panel shares Tesseract lines with the header, so words are
 * restricted to the left block first.
 */
export function extractEquipmentHeader(words: OcrWord[], catalogue: WeaponCatalogue): EquipmentHeader {
  const maxX = words.reduce((m, w) => Math.max(m, w.x1), 1)
  const headerWords = words.filter((w) => w.x1 < maxX * 0.62)
  const lines = rowLines(headerWords.length ? headerWords : words)
  let slot: string | undefined
  let item: ParsedWeaponLine | undefined
  let itemRank = -1
  let itemIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!slot) {
      const parsed = parseSlotLabel(line)
      if (parsed) slot = parsed
    }
    const hasPlus = /\+\s?\d{1,2}\b/.test(line)
    const candidate = parseWeaponLine(line, catalogue)
    if (!candidate) continue
    if (candidate.matchScore <= 0 && !hasPlus) continue
    const rank = candidate.matchScore + (hasPlus ? 0.5 : 0)
    if (rank > itemRank) {
      itemRank = rank
      item = candidate
      itemIndex = i
    }
  }
  // The skill name is a known skill or the line just above the right-panel stats.
  let skill: string | undefined
  for (const line of lines) {
    const hit = catalogue.skills.find((s) => normalizeWeapon(s) === normalizeWeapon(line))
    if (hit) {
      skill = hit
      break
    }
  }
  if (!skill) {
    const apostrophe = lines.find((l) => /^[A-Z][a-z]+['’]s\s+[A-Z][a-z]+$/.test(l) && l !== item?.base)
    if (apostrophe) skill = apostrophe
  }
  return { slot, item, skill, weaponType: item?.weaponType, lines: itemIndex >= 0 ? lines.slice(0, itemIndex + 1) : lines.slice(0, 6) }
}

/** Map a header slot label to the Gear-sheet slot id. */
export function slotToGearSlot(label: string | undefined): LoadoutSlot['slot'] | undefined {
  if (!label) return undefined
  const map: Record<string, LoadoutSlot['slot']> = {
    'Right Hand Armament 1': 'right-1', 'Right Hand Armament 2': 'right-2', 'Right Hand Armament 3': 'right-3',
    'Left Hand Armament 1': 'left-1', 'Left Hand Armament 2': 'left-2', 'Left Hand Armament 3': 'left-3',
    Head: 'head', 'Chest Armor': 'chest', Arms: 'arms', Legs: 'legs',
    'Talisman 1': 'talisman-1', 'Talisman 2': 'talisman-2', 'Talisman 3': 'talisman-3', 'Talisman 4': 'talisman-4',
  }
  return map[label]
}

/** Turn the parsed header into the Gear-sheet loadout row for the slot. */
export function headerToLoadout(header: EquipmentHeader, slot = header.slot): LoadoutSlot | undefined {
  if (!header.item) return undefined
  const type = header.weaponType ?? header.item.weaponType
  let kind: LoadoutSlot['kind'] = 'armament'
  if (type === 'Sacred Seal' || type === 'Glintstone Staff' || type === 'Glinstone Staff') kind = 'catalyst'
  else if (type === 'Thrusting Shield') kind = 'shield'
  const gearSlot = slotToGearSlot(slot)
  return {
    id: `ps5-${normalizeWeapon(slot ?? 'slot')}`,
    name: header.item.base,
    kind,
    affinity: header.item.affinity,
    upgrade: header.item.upgrade,
    slot: gearSlot,
  }
}

export type SlotGrid = {
  left: number
  top: number
  cellW: number
  cellH: number
  cols: number
  rows: number
}

/**
 * Detect the equipment grid. The five columns are stronger than the row seams, so
 * the column profile's autocorrelation gives the pitch and the profile minima give
 * the phase. Rows use the same trick down the left block. This follows the photo's
 * own geometry instead of assuming a fixed crop.
 */
/**
 * Detect a regular menu lattice (the equipment and inventory grids share the same
 * five columns and dark seams). The column profile's autocorrelation gives the
 * pitch and the profile minima give the phase; the vertical search band is a caller
 * choice so the same code works for the equipment panel and the inventory list.
 */
export function detectLattice(
  img: GrayImage,
  opts: { x0: number; x1: number; y0: number; y1: number; rows: number },
): SlotGrid | undefined {
  const x0 = Math.round(img.width * opts.x0)
  const x1 = Math.round(img.width * opts.x1)
  const y0 = Math.round(img.height * opts.y0)
  const y1 = Math.round(img.height * opts.y1)
  if (x1 <= x0 || y1 <= y0) return undefined

  const colProfile = smooth(columnMeans(img, x0, x1, y0, y1), 6)
  const rowProfile = smooth(rowMeans(img, x0, x1, y0, y1), 6)
  // Cell pitch as a fraction of the frame: five columns of the menu grid.
  const pitchX = bestPitch(colProfile, Math.round(img.width * 0.09), Math.round(img.width * 0.16))
  const pitchY = bestPitch(rowProfile, Math.round(img.height * 0.07), Math.round(img.height * 0.13))
  if (!pitchX || !pitchY) return undefined
  const left = x0 + phase(colProfile, pitchX, 6)
  const top = y0 + phase(rowProfile, pitchY, opts.rows + 1)
  return { left, top, cellW: pitchX, cellH: pitchY, cols: 5, rows: opts.rows }
}

export function detectSlotGrid(img: GrayImage): SlotGrid | undefined {
  return detectLattice(img, { x0: 0.1, x1: 0.74, y0: 0.24, y1: 0.82, rows: 6 })
}

function columnMeans(img: GrayImage, x0: number, x1: number, y0: number, y1: number): Float64Array {
  const { width, data } = img
  const out = new Float64Array(x1 - x0)
  for (let x = x0; x < x1; x++) {
    let sum = 0
    for (let y = y0; y < y1; y++) sum += data[y * width + x]
    out[x - x0] = sum / (y1 - y0)
  }
  return out
}

function rowMeans(img: GrayImage, x0: number, x1: number, y0: number, y1: number): Float64Array {
  const { width, data } = img
  const out = new Float64Array(y1 - y0)
  for (let y = y0; y < y1; y++) {
    let sum = 0
    for (let x = x0; x < x1; x++) sum += data[y * width + x]
    out[y - y0] = sum / (x1 - x0)
  }
  return out
}

function smooth(p: Float64Array, r: number): Float64Array {
  const out = new Float64Array(p.length)
  for (let i = 0; i < p.length; i++) {
    let sum = 0
    let n = 0
    for (let k = -r; k <= r; k++) {
      const j = i + k
      if (j >= 0 && j < p.length) {
        sum += p[j]
        n++
      }
    }
    out[i] = sum / n
  }
  return out
}

function autocorrelation(p: Float64Array): Float64Array {
  const n = p.length
  let mean = 0
  for (const v of p) mean += v
  mean /= n
  const q = new Float64Array(n)
  for (let i = 0; i < n; i++) q[i] = p[i] - mean
  const out = new Float64Array(Math.floor(n / 2))
  for (let lag = 1; lag < out.length; lag++) {
    let sum = 0
    for (let i = 0; i + lag < n; i++) sum += q[i] * q[i + lag]
    out[lag] = sum / (n - lag)
  }
  return out
}

function bestPitch(p: Float64Array, min: number, max: number): number {
  const ac = autocorrelation(p)
  let best = 0
  let bestScore = -Infinity
  for (let lag = Math.max(1, min); lag <= Math.min(max, ac.length - 1); lag++) {
    if (ac[lag] > bestScore) {
      bestScore = ac[lag]
      best = lag
    }
  }
  return best
}

/** Darkest phase offset along a periodic seam (cells are separated by dark gaps). */
function phase(p: Float64Array, pitch: number, count: number): number {
  let best = 0
  let bestSum = Infinity
  for (let off = 0; off < pitch; off++) {
    let sum = 0
    for (let k = 0; k < count; k++) {
      const idx = Math.round(off + k * pitch)
      if (idx >= 0 && idx < p.length) sum += p[idx]
    }
    if (sum < bestSum) {
      bestSum = sum
      best = off
    }
  }
  return best
}

/** Crop the inset border of one grid cell (used for icon matching). */
export function cellImage(img: GrayImage, grid: SlotGrid, row: number, col: number, inset = 0.12): GrayImage {
  const x = grid.left + col * grid.cellW + inset * grid.cellW
  const y = grid.top + row * grid.cellH + inset * grid.cellH
  return cropGray(img, x, y, x + (1 - 2 * inset) * grid.cellW, y + (1 - 2 * inset) * grid.cellH)
}

/** The bottom-right region of a cell that may hold a stack count. */
export function countRegion(img: GrayImage, grid: SlotGrid, row: number, col: number): GrayImage {
  const x = grid.left + col * grid.cellW + 0.42 * grid.cellW
  const y = grid.top + row * grid.cellH + 0.55 * grid.cellH
  return cropGray(img, x, y, grid.left + (col + 1) * grid.cellW, grid.top + (row + 1) * grid.cellH)
}
