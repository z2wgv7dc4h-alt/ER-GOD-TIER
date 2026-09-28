import type { GrayImage } from './ps5Image'
import { cropGray } from './ps5Image'
import { detectLattice, type SlotGrid } from './ps5Equipment'
import { wordHeight, type OcrWord } from './ps5Ocr'

/**
 * Task 134 §4 — inventory pages.
 *
 * An inventory page prints only the highlighted item's name; every other cell is an
 * icon with an optional stack count. So the reliable, OCR-only fields are the tab
 * title (→ category) and the selected item name (list header + right-panel title);
 * the cell identities need icon matching restricted to that category, and the stack
 * counts need per-cell digit OCR (both reported, not gated, for real photos).
 */

export const INVENTORY_TABS: { tab: string; category: string }[] = [
  { tab: 'Ashes', category: 'spirit' },
  { tab: 'Spirit Ashes', category: 'spirit' },
  { tab: 'Bolstering Materials', category: 'material' },
  { tab: 'Key Items', category: 'key-item' },
  { tab: 'Sorceries', category: 'sorcery' },
  { tab: 'Incantations', category: 'incantation' },
  { tab: 'Ashes of War', category: 'ash-of-war' },
  { tab: 'All Items', category: 'crafting' },
  { tab: 'Talismans', category: 'talisman' },
  { tab: 'Weapons', category: 'weapon' },
  { tab: 'Armor', category: 'armor' },
  { tab: 'Tools', category: 'tool' },
  { tab: 'Cookbooks', category: 'cookbook' },
  { tab: 'Crystal Tears', category: 'key-item' },
]

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export type InventoryHeader = {
  tab?: string
  category?: string
  selected?: string
  lines: string[]
}

function rowLines(words: OcrWord[]): { text: string; y: number; height: number; x0: number; x1: number }[] {
  const rows = new Map<number, OcrWord[]>()
  for (const w of words) {
    const list = rows.get(w.line) ?? []
    list.push(w)
    rows.set(w.line, list)
  }
  return [...rows.values()]
    .map((list) => {
      list.sort((a, b) => a.x0 - b.x0)
      return {
        text: list.map((w) => w.text).join(' ').replace(/\s{2,}/g, ' ').trim(),
        y: Math.min(...list.map((w) => w.y0)),
        height: Math.max(...list.map(wordHeight)),
        x0: Math.min(...list.map((w) => w.x0)),
        x1: Math.max(...list.map((w) => w.x1)),
      }
    })
    .filter((line) => line.text && !/^inventory$/i.test(line.text))
    .sort((a, b) => a.y - b.y)
}

/** Stat-panel labels that sit near the item title and must not be read as its name. */
const PANEL_LABEL = /^(no\.?|held|stored|item|effect|weight|fp|cost|attack|power|physical|magic|fire|lightning|holy|critical|attribute|scaling|str|dex|int|fai|arc|passive|damage|quantity)$/i

function cleanName(text: string): string {
  let tokens = text.split(/\s+/).filter((t) => /[a-z0-9]/i.test(t) && !PANEL_LABEL.test(t))
  // Drop leading/trailing OCR crumbs (1–2 stray letters) unless they are name words.
  const keepEdge = (t: string) => t.length > 2 || /^(of|a|an|the|i|ii|iii|iv|v|x)$/i.test(t)
  while (tokens.length && !keepEdge(tokens[0])) tokens = tokens.slice(1)
  while (tokens.length && !keepEdge(tokens[tokens.length - 1])) tokens = tokens.slice(0, -1)
  return tokens.join(' ').replace(/\s*[|[\]{}()]+\s*$/g, '').trim()
}

/** Crude name-likeness so the item title beats panel noise. */
function nameScore(text: string): number {
  const letters = (text.match(/[a-z]/gi) ?? []).length
  const titleWords = (text.match(/\b[A-Z][a-z]/g) ?? []).length
  const symbols = (text.match(/[^a-z0-9 [\]'’+-]/gi) ?? []).length
  return letters + titleWords * 3 - symbols * 4 + (text.split(/\s+/).length >= 2 ? 4 : 0)
}

/**
 * Find the tab title and the selected item name. The tab is the left-panel line
 * that matches a known tab (longest match wins, so "Ashes of War" beats "Ashes");
 * the selected name is the best-scoring of the right-panel title and the left list
 * header under the tab.
 */
export function parseInventoryHeader(words: OcrWord[], maxX = 0): InventoryHeader {
  const width = maxX || Math.max(...words.map((w) => w.x1), 1)
  const lines = rowLines(words)
  const left = rowLines(words.filter((w) => w.x0 < width * 0.62))
  const right = rowLines(words.filter((w) => w.x0 > width * 0.55))
  const tabs = [...INVENTORY_TABS].sort((a, b) => b.tab.length - a.tab.length)

  let tab: string | undefined
  let category: string | undefined
  let tabY = -1
  for (const line of left) {
    const n = normalize(line.text)
    const hit = tabs.find((t) => n === normalize(t.tab) || n.includes(normalize(t.tab)))
    if (hit) {
      tab = hit.tab
      category = hit.category
      tabY = line.y
      break
    }
  }

  // The right-panel title is the canonical name; the left list header is the
  // fallback. Prefer the topmost plausible right-panel line.
  let selected: string | undefined
  for (const line of right.slice(0, 6)) {
    const name = cleanName(line.text)
    if (name.length >= 4) {
      selected = name
      break
    }
  }
  if (!selected) {
    let bestScore = -Infinity
    for (const line of left) {
      if (line.y <= tabY) continue
      if (tab && normalize(line.text).includes(normalize(tab))) continue
      const name = cleanName(line.text)
      const score = nameScore(name)
      if (name.length >= 4 && score > bestScore) {
        bestScore = score
        selected = name
      }
    }
  }
  return { tab, category, selected, lines: lines.map((l) => l.text).slice(0, 8) }
}

/** The inventory list is the same 5-column lattice, in a slightly different band. */
export function detectInventoryGrid(img: GrayImage): SlotGrid | undefined {
  return detectLattice(img, { x0: 0.07, x1: 0.63, y0: 0.2, y1: 0.82, rows: 5 })
}

/** Local standard deviation — high where an icon sits, low on an empty cell. */
export function cellActivity(img: GrayImage, grid: SlotGrid, row: number, col: number, inset = 0.18): number {
  const x = grid.left + col * grid.cellW + inset * grid.cellW
  const y = grid.top + row * grid.cellH + inset * grid.cellH
  const cell = cropGray(img, x, y, x + (1 - 2 * inset) * grid.cellW, y + (1 - 2 * inset) * grid.cellH)
  let mean = 0
  for (const v of cell.data) mean += v
  mean /= cell.data.length || 1
  let variance = 0
  for (const v of cell.data) variance += (v - mean) * (v - mean)
  return Math.sqrt(variance / (cell.data.length || 1))
}

export type OccupancyResult = { occupied: boolean[]; activities: number[] }

/** Which cells hold an icon (left-to-right, top-to-bottom). */
export function cellOccupancy(img: GrayImage, grid: SlotGrid, floorRatio = 0.55): OccupancyResult {
  const activities: number[] = []
  for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) activities.push(cellActivity(img, grid, r, c))
  const sorted = [...activities].sort((a, b) => a - b)
  const median = sorted[sorted.length >> 1] ?? 0
  const peak = sorted[sorted.length - 1] ?? 0
  const threshold = median + (peak - median) * floorRatio
  return { occupied: activities.map((a) => a >= threshold), activities }
}

/** Stack counts sit under the icon, centre-bottom of the cell. */
export function inventoryCountRegion(img: GrayImage, grid: SlotGrid, row: number, col: number): GrayImage {
  const x = grid.left + col * grid.cellW + 0.2 * grid.cellW
  const y = grid.top + row * grid.cellH + 0.74 * grid.cellH
  return cropGray(img, x, y, x + 0.6 * grid.cellW, y + 0.26 * grid.cellH)
}
