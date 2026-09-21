/**
 * Real, local OCR for the PS5-first screenshot path.
 *
 * Tesseract.js runs entirely client-side: the WASM core and the `eng` traineddata are
 * fetched once, then cached (the language model lives in IndexedDB via idb-keyval, which
 * tesseract.js does for us), so repeated reads work offline. Recognition happens inside
 * tesseract.js's own Web Worker, so the UI thread is never blocked and no image or text
 * ever leaves the device. There is deliberately no server-side OCR call.
 *
 * `readImage` returns text + a 0..1 confidence. The pure helpers below turn a read into
 * facts: `factsFromText` runs the same alias/catalog matching Reckon already uses, and
 * `applyOcrRead` refuses to invent facts from a low-confidence or unmatched read — the
 * app's whole design is "confirmed vs unknown", so garbage stays unknown.
 */
import { matchMany } from '../knowledge/catalog'
import type { Character } from '../types'
import { matchAllWarps } from './aliases'
import { applyFacts } from './infer'
import { searchSync } from './search'

export type OcrRead = {
  /** Raw recognized text, lines preserved. */
  text: string
  /** Tesseract's mean confidence for the page, normalised to 0..1. */
  confidence: number
}

/** Below this, a read is treated as noise: recognized text is surfaced, no facts are made. */
export const OCR_CONFIDENCE_FLOOR = 0.55

export type OcrMatch = { id: string; name: string }

/**
 * One line of a pasted / photographed list and the known names it matched. Bulk warp
 * lists are line-oriented, so per-line results are what makes a 20-grace paste legible:
 * the player sees exactly which lines landed and which still need a typed correction.
 */
export type OcrLineResult = {
  line: string
  matches: OcrMatch[]
}

export type OcrStatus = 'applied' | 'low-confidence' | 'no-match' | 'empty'

export type OcrOutcome = {
  /** The character after inference — identical to the input when nothing was trusted. */
  character: Character
  text: string
  confidence: number
  status: OcrStatus
  matches: OcrMatch[]
  /** Per-line breakdown of `matches` for list-shaped reads (one entry per non-blank line). */
  lines: OcrLineResult[]
  /** Human-readable, honest explanation of what happened. */
  message: string
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

/**
 * Collect canonical fact ids from a blob of names using the same three matchers
 * Reckon's paste path uses: seed catalog, Paramdex warps, and `searchSync`.
 */
export function factsFromText(text: string): OcrMatch[] {
  const seen = new Set<string>()
  const out: OcrMatch[] = []
  const add = (id: string, name: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    out.push({ id, name })
  }
  for (const f of matchMany(text)) add(f.id, f.name)
  for (const g of matchAllWarps(text)) add(g.id, g.name)
  for (const h of searchSync(text)) add(h.id, h.name)
  return out
}

/** Dedupe matches by canonical id, preserving first-seen order. */
function dedupeMatches(matches: OcrMatch[]): OcrMatch[] {
  const seen = new Set<string>()
  const out: OcrMatch[] = []
  for (const m of matches) {
    if (!m.id || seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out
}

/**
 * Bulk-list matcher: split a pasted/recognized blob into non-blank lines and match each
 * one independently, so a full warp list gets a match/no-match verdict per line instead
 * of one opaque whole-blob result. Order is preserved (menu order ≈ progress order).
 */
export function matchBulkLines(text: string): OcrLineResult[] {
  return (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ line, matches: factsFromText(line) }))
}

/**
 * Pure inference step: take a read and either apply real `screenshot` evidence or
 * explicitly decline to. Never throws, never fabricates.
 */
export function applyOcrRead(
  character: Character,
  read: OcrRead,
  detail = 'screenshot',
): OcrOutcome {
  const text = (read.text || '').trim()
  const confidence = clamp01(read.confidence)

  if (!text) {
    return {
      character,
      text,
      confidence,
      status: 'empty',
      matches: [],
      lines: [],
      message: 'No text was recognized in that image.',
    }
  }

  if (confidence < OCR_CONFIDENCE_FLOOR) {
    return {
      character,
      text,
      confidence,
      status: 'low-confidence',
      matches: [],
      lines: [],
      message: `Text read at ${pct(confidence)} confidence — too low to trust. Facts stay unknown.`,
    }
  }

  const lines = matchBulkLines(text)
  const matches = dedupeMatches(lines.flatMap((l) => l.matches))
  if (!matches.length) {
    return {
      character,
      text,
      confidence,
      status: 'no-match',
      matches: [],
      lines,
      message: 'Read the text, but no known names matched. Nothing was inferred.',
    }
  }

  const next = applyFacts(character, matches.map((m) => m.id), 'screenshot', detail, confidence)
  const hitLines = lines.filter((l) => l.matches.length).length
  const lineNote = lines.length > 1 ? ` across ${hitLines}/${lines.length} lines` : ''
  return {
    character: next,
    text,
    confidence,
    status: 'applied',
    matches,
    lines,
    message: `Matched ${matches.length} name${matches.length === 1 ? '' : 's'}${lineNote}: ${matches.map((m) => m.name).join(' · ')}`,
  }
}

type TesseractWorker = {
  recognize: (image: Blob | string) => Promise<{ data: { text: string; confidence: number } }>
  terminate: () => Promise<unknown>
}

let workerPromise: Promise<TesseractWorker> | null = null

/** Lazily create one shared Tesseract worker; reused across reads for the whole session. */
function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return (await createWorker('eng')) as unknown as TesseractWorker
    })()
    workerPromise.catch(() => {
      // A failed init (e.g. first load while offline) should not poison future attempts.
      workerPromise = null
    })
  }
  return workerPromise
}

/** Release the OCR worker, e.g. on unmount. Safe to call when none exists. */
export async function terminateOcr(): Promise<void> {
  const pending = workerPromise
  workerPromise = null
  if (pending) {
    const worker = await pending.catch(() => null)
    if (worker) await worker.terminate().catch(() => undefined)
  }
}

/**
 * Recognize text in an uploaded/pasted image (File, Blob, or data URL).
 * Throws if the worker or model cannot load — callers should surface that honestly.
 */
export async function readImage(image: Blob | string): Promise<OcrRead> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image)
  return {
    text: data.text || '',
    confidence: clamp01((data.confidence || 0) / 100),
  }
}

/**
 * Back-compat wrapper kept so existing callers (and the stub's signature) still work.
 * New code should prefer `readImage`, which also reports confidence.
 */
export async function readImageText(file: Blob | string): Promise<string> {
  return (await readImage(file)).text
}

export function hintForShot(kind: string) {
  if (kind === 'warp-list') return 'Read on-device with Tesseract OCR. Grace names match the full 418-name Paramdex list; you can still paste names instead.'
  if (kind === 'inventory') return 'Read on-device with Tesseract OCR. Key items and Great Runes reconstruct shardbearers and quests.'
  return 'Read on-device with Tesseract OCR. Matching is alias-based — paste names if a shot is too blurry to trust.'
}
