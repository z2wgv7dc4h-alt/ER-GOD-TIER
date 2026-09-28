/**
 * Task 134 — Tesseract TSV → positioned words.
 *
 * Fixed-coordinate extraction breaks the moment a player holds the phone at an
 * angle, so the PS5 pipeline is label-anchored: find the word "Vigor" wherever it
 * landed, then read the number on the same row to its right. That needs word
 * bounding boxes, which Tesseract gives us for free in its TSV output.
 */

export type OcrWord = {
  text: string
  confidence: number
  x0: number
  y0: number
  x1: number
  y1: number
  /** Tesseract's line number; words on one visual row share it almost always. */
  line: number
}

/** Parse the tab-separated `data.tsv` Tesseract returns for `{ tsv: true }`. */
export function parseTsvWords(tsv: string | null | undefined): OcrWord[] {
  if (!tsv) return []
  const words: OcrWord[] = []
  const lines = tsv.split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]
    if (!row) continue
    const cols = row.split('\t')
    if (cols.length < 12) continue
    const level = Number(cols[0])
    if (level !== 5) continue
    const text = cols[11]
    if (!text || !text.trim()) continue
    const conf = Number(cols[10])
    if (!Number.isFinite(conf) || conf < 0) continue
    const left = Number(cols[6])
    const top = Number(cols[7])
    const width = Number(cols[8])
    const height = Number(cols[9])
    words.push({
      text: text.trim(),
      confidence: Math.min(1, Math.max(0, conf / 100)),
      x0: left,
      y0: top,
      x1: left + width,
      y1: top + height,
      line: Number(cols[4]) || 0,
    })
  }
  return words
}

export function wordCenterY(w: OcrWord): number {
  return (w.y0 + w.y1) / 2
}

export function wordCenterX(w: OcrWord): number {
  return (w.x0 + w.x1) / 2
}

export function wordHeight(w: OcrWord): number {
  return Math.max(1, w.y1 - w.y0)
}

/** True when the two words share enough vertical band to be on the same row. */
export function sameRow(a: OcrWord, b: OcrWord, tolerance = 0.6): boolean {
  const ha = wordHeight(a)
  const hb = wordHeight(b)
  const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return overlap > tolerance * Math.min(ha, hb)
}

/** The nearest word to the right of `anchor` that satisfies `pick`, on its row. */
export function nearestRight(anchor: OcrWord, words: OcrWord[], pick: (w: OcrWord) => boolean): OcrWord | undefined {
  let best: OcrWord | undefined
  let bestGap = Infinity
  for (const w of words) {
    if (w === anchor) continue
    if (w.x0 < anchor.x0) continue
    if (!sameRow(anchor, w)) continue
    if (!pick(w)) continue
    const gap = w.x0 - anchor.x1
    if (gap < bestGap) {
      bestGap = gap
      best = w
    }
  }
  return best
}

/** Digits, optionally with thousands separators, e.g. "45,381" or "45381". */
export function numberFromText(text: string): number | undefined {
  const m = text.replace(/[OoQ]/g, '0').match(/\d[\d,]{0,6}/)
  if (!m) return undefined
  const n = Number(m[0].replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}
