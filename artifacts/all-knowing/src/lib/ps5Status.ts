import type { Stats } from '../types'
import { STAT_KEYS, levelFromStats, statsTotal } from './level'
import { nearestRight, numberFromText, sameRow, wordCenterX, wordHeight, type OcrWord } from './ps5Ocr'
import { matchStatBonus, withoutBoost, type StatBonusMatch } from './statBoostGear'

/**
 * Task 134 §1 — label-anchored Status-screen extraction.
 *
 * Every field is found by its label, not by a pixel coordinate: locate the word
 * "Vigor" and read the number to its right on the same row. The same photo is run
 * through several preprocessing variants (see `ps5Image.preprocessVariants`) and
 * the results are merged by confidence, so one bad binarisation cannot lose a stat.
 */

export type StatusField = 'level' | 'runesHeld' | 'runesNeeded' | keyof Stats

const STAT_ALIASES: { key: keyof Stats; re: RegExp }[] = [
  { key: 'vigor', re: /^vig/ },
  { key: 'mind', re: /^min/ },
  { key: 'endurance', re: /^endur/ },
  { key: 'strength', re: /^str/ },
  { key: 'dexterity', re: /^dex/ },
  { key: 'intelligence', re: /^intel/ },
  { key: 'faith', re: /^fai/ },
  { key: 'arcane', re: /^arc/ },
]

function letters(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '')
}

/** Map a single OCR word to the field it labels, or undefined. */
export function labelField(text: string): StatusField | undefined {
  const n = letters(text)
  if (!n) return undefined
  if (n === 'level' || n === 'lvl' || n === 'levl' || n === 'levet') return 'level'
  if (n === 'held') return 'runesHeld'
  if (n === 'needed') return 'runesNeeded'
  for (const { key, re } of STAT_ALIASES) if (re.test(n)) return key
  return undefined
}

export type FieldRead = { value: number; confidence: number }
export type StatusRead = {
  name?: { text: string; confidence: number }
  fields: Partial<Record<StatusField, FieldRead>>
}

/** Extract an anchored read from one Tesseract word list. */
export function extractStatus(words: OcrWord[]): StatusRead {
  const fields: Partial<Record<StatusField, FieldRead>> = {}
  const candidates: { field: StatusField; value: number; confidence: number; score: number }[] = []
  for (const w of words) {
    const field = labelField(w.text)
    if (!field) continue
    const value = nearestRight(w, words, (c) => numberFromText(c.text) !== undefined)
    if (!value) continue
    const number = numberFromText(value.text)
    if (number === undefined) continue
    const confidence = Math.min(w.confidence, value.confidence)
    if (confidence < 0.3) continue
    // Prefer the number whose font is closest to the label's (same row styling).
    const score = confidence - Math.abs(wordHeight(value) - wordHeight(w)) / Math.max(wordHeight(w), wordHeight(value)) / 4
    candidates.push({ field, value: number, confidence, score })
  }
  for (const c of candidates) {
    const prev = fields[c.field]
    if (!prev || c.score > prev.confidence) fields[c.field] = { value: c.value, confidence: c.score }
  }

  return { name: extractName(words), fields }
}

/**
 * The character name sits under the "Status" heading. Find the heading, then take
 * the biggest word on the row beneath it on the left half of the screen.
 */
export function extractName(words: OcrWord[]): StatusRead['name'] {
  const heading = words.find((w) => /^status$/i.test(w.text) && wordCenterX(w) < 0.5 * Math.max(...words.map((x) => x.x1), 1))
  if (!heading) return undefined
  const maxX = Math.max(...words.map((w) => w.x1), 1)
  const midX = maxX * 0.62
  const bandWords = words.filter((w) => w.y0 >= heading.y1 && w.y1 <= heading.y1 + 5 * wordHeight(heading) && wordCenterX(w) < midX && letters(w.text).length >= 3)
  if (!bandWords.length) return undefined
  const tallest = Math.max(...bandWords.map(wordHeight))
  const row = bandWords.filter((w) => wordHeight(w) >= tallest * 0.6 && sameRow(bandWords[0], w))
  const chosen = row.length ? row : [bandWords.sort((a, b) => wordHeight(b) - wordHeight(a))[0]]
  chosen.sort((a, b) => a.x0 - b.x0)
  const text = chosen.map((w) => w.text).join('')
  const confidence = chosen.reduce((n, w) => n + w.confidence, 0) / chosen.length
  if (letters(text).length < 3) return undefined
  return { text, confidence }
}

/**
 * Merge per-variant reads. The variants share the same failure modes (a dropped
 * leading digit shows up in several at once), so summing confidence lets correlated
 * errors outvote a single clean read. Instead each value keeps its best single
 * confidence; how many variants agree only breaks a tie. That is what makes the
 * fixture's Level "87" beat the four variants that read "7".
 */
export function mergeStatusReads(reads: StatusRead[]): StatusRead {
  const votes = new Map<StatusField, Map<number, { best: number; total: number; count: number }>>()
  let name: StatusRead['name']
  for (const read of reads) {
    for (const [field, hit] of Object.entries(read.fields) as [StatusField, FieldRead][]) {
      const byValue = votes.get(field) ?? new Map<number, { best: number; total: number; count: number }>()
      const prev = byValue.get(hit.value) ?? { best: 0, total: 0, count: 0 }
      byValue.set(hit.value, { best: Math.max(prev.best, hit.confidence), total: prev.total + hit.confidence, count: prev.count + 1 })
      votes.set(field, byValue)
    }
    if (read.name && (!name || read.name.confidence > name.confidence)) name = read.name
  }
  const fields: Partial<Record<StatusField, FieldRead>> = {}
  for (const [field, byValue] of votes) {
    let bestValue = 0
    let bestScore = -1
    for (const [value, stat] of byValue) {
      const score = stat.best + stat.count * 1e-6
      if (score > bestScore) {
        bestScore = score
        bestValue = value
      }
    }
    fields[field] = { value: bestValue, confidence: byValue.get(bestValue)!.best }
  }
  return { name, fields }
}

export type StatusInterpretation = {
  name?: string
  level?: number
  runesHeld?: number
  runesNeeded?: number
  /** Exactly what the screen showed (talisman bonuses included). */
  displayedStats: Partial<Stats>
  /** Base spread with detected gear bonuses removed. */
  baseStats?: Stats
  bonus: StatBonusMatch
  /** Every field landed in range and the level invariant held. */
  valid: boolean
  confidence: number
  notes: string[]
}

const STAT_MIN = 1
const STAT_MAX = 99
const LEVEL_MIN = 1
const LEVEL_MAX = 713

function fullStats(stats: Partial<Stats>): Stats | undefined {
  if (!STAT_KEYS.every((k) => typeof stats[k] === 'number')) return undefined
  return stats as Stats
}

/** Turn a merged read into validated base stats + a stat-bonus explanation. */
export function interpretStatus(read: StatusRead): StatusInterpretation {
  const notes: string[] = []
  const level = read.fields.level?.value
  if (level !== undefined && (level < LEVEL_MIN || level > LEVEL_MAX)) notes.push(`Level ${level} is outside ${LEVEL_MIN}–${LEVEL_MAX}.`)

  const displayedStats: Partial<Stats> = {}
  for (const key of STAT_KEYS) {
    const hit = read.fields[key]
    if (!hit) continue
    if (hit.value < STAT_MIN || hit.value > STAT_MAX) {
      notes.push(`${key} read as ${hit.value}, outside ${STAT_MIN}–${STAT_MAX}.`)
      continue
    }
    displayedStats[key] = hit.value
  }

  const complete = fullStats(displayedStats)
  let baseStats: Stats | undefined
  let bonus: StatBonusMatch = { deltaTotal: 0 }
  if (complete && level !== undefined && level >= LEVEL_MIN && level <= LEVEL_MAX) {
    const implied = statsTotal(complete) - 79
    if (implied === level) {
      baseStats = complete
    } else if (implied > level) {
      bonus = matchStatBonus(implied - level, complete)
      if (bonus.gear && bonus.deltas) {
        const base = withoutBoost(complete, bonus.deltas)
        if (levelFromStats(base) === level) {
          baseStats = base
          notes.push(`Screen reads +${implied - level} over level; matched ${bonus.gear.map((g) => g.name).join(' + ')}.`)
        } else {
          notes.push(`Gear bonus matched but base stats still disagree with Level ${level}.`)
        }
      } else {
        notes.push(`Stats imply Lv ${implied} but Level reads ${level}; no known stat-boost gear explains the +${implied - level}.`)
      }
    } else {
      notes.push(`Stats imply Lv ${implied}, below the Level row ${level}. Nothing was corrected.`)
    }
  } else if (complete) {
    notes.push('Read the eight stats but not the Level row; cannot validate the spread.')
  }

  const confidences = Object.values(read.fields).map((f) => f.confidence)
  const confidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0
  return {
    name: read.name?.text,
    level,
    runesHeld: read.fields.runesHeld?.value,
    runesNeeded: read.fields.runesNeeded?.value,
    displayedStats,
    baseStats,
    bonus,
    valid: Boolean(baseStats) && notes.every((n) => !n.includes('outside') && !n.includes('no known')),
    confidence,
    notes,
  }
}
