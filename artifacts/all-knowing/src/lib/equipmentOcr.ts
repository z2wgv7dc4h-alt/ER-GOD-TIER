import type { Stats } from '../types'

/**
 * Fallback parser for a character/equipment screen read by Tesseract. Pulls the
 * eight attributes + level and any recognizable gear names from OCR text. Pure
 * and conservative: it only returns a stat when a known label sits next to a
 * number, so a garbled read yields nothing rather than wrong numbers.
 *
 * Muse vision (`readCharacterScreen`) is the primary path; this is what we use
 * with no key or when the model is unavailable.
 */
const STAT_LABELS: { key: keyof Stats; re: RegExp }[] = [
  { key: 'vigor', re: /\bvigou?r\b/i },
  { key: 'mind', re: /\bmind\b/i },
  { key: 'endurance', re: /\bendurance\b/i },
  { key: 'strength', re: /\bstrength\b/i },
  { key: 'dexterity', re: /\bdexterity\b/i },
  { key: 'intelligence', re: /\bintelligence\b/i },
  { key: 'faith', re: /\bfaith\b/i },
  { key: 'arcane', re: /\barcane\b/i },
]

export type EquipmentRead = {
  level?: number
  stats: Partial<Stats>
  /** Capitalized name-like lines (weapon/armor names), deduped, in order. */
  gear: string[]
}

export function parseEquipmentText(text: string): EquipmentRead {
  const stats: Partial<Stats> = {}
  for (const { key, re } of STAT_LABELS) {
    // "Vigor 40", "Vigor: 40", "40 Vigor", or "Vigor ... 40" within the line.
    const near = text.match(new RegExp(`${re.source}\\D{0,12}(\\d{1,3})`, 'i')) ?? text.match(new RegExp(`(\\d{1,3})\\D{0,4}${re.source}`, 'i'))
    if (near) {
      const n = Number(near[1])
      if (n >= 1 && n <= 99) stats[key] = n
    }
  }

  let level: number | undefined
  const lvl = text.match(/\b(?:level|rl|rune level)\b\D{0,8}(\d{1,3})/i)
  if (lvl) {
    const n = Number(lvl[1])
    if (n >= 1 && n <= 713) level = n
  }

  const gear: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s{2,}/g, ' ')
    // Name-like: starts Title-Case, 1–5 words of letters/apostrophes/hyphens
    // (allows connectors like "Rivers of Blood").
    if (/^[A-Z][A-Za-z'’-]*(?:\s+[A-Za-z'’-]+){0,4}$/.test(line) && line.length <= 48) {
      if (!gear.includes(line)) gear.push(line)
    }
  }
  return { level, stats, gear }
}
