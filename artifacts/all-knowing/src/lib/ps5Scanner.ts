import { byId } from '../knowledge/catalog'
import { canonicalFactId, matchGeneratedAliases } from './aliases'
import { allRecords } from './entityIndex'
import { INVENTORY_TABS } from './ps5Inventory'
import { wordCenterX, type OcrWord } from './ps5Ocr'
import { extractStatus, interpretStatus, mergeStatusReads, type StatusRead, type StatusInterpretation } from './ps5Status'

/**
 * Task 136 §2 — the live inventory scanner.
 *
 * Elden Ring prints only ONE item name at a time: the highlighted item, in the
 * left list header (and the right-panel title, which is often cropped off a phone
 * photo). So instead of trying to read a whole page, the player steps the cursor
 * with the D-pad while the camera watches and every steady frame yields one name.
 *
 * The engine here is pure: frame pixels arrive through an injected OCR function,
 * and a stream of `ScanObservation`s is folded by `InventoryStabilizer` into a
 * deduped list — a name is accepted once it has been seen (fuzzy-equal or
 * catalogue-matched) in at least `minFrames` reads, resolved through the alias
 * plane / entity index restricted to the tab's category, with the maximum
 * "No. Held" kept. The DOM/video plumbing lives in `ps5ScannerBrowser.ts`.
 */

// --- observations ------------------------------------------------------------

export type ScanObservation = {
  name?: string
  tab?: string
  category?: string
  held?: number
  /** 0..1 confidence of the name read (mean of its word confidences). */
  confidence: number
  /** Anchored Character Status read, when the right column is visible. */
  status?: StatusRead
}

export type ScanItem = {
  factId?: string
  name: string
  category?: string
  held?: number
  confidence: number
  /** How many reads agreed on this item. */
  frames: number
  /** True once seen in >= minFrames reads; single low-confidence reads stay false. */
  confirmed: boolean
}

export type ScanResult = {
  items: ScanItem[]
  /** The recognised tab, when any read saw it. */
  tab?: string
  category?: string
  /** Merged + validated Character Status column, when it was visible. */
  status?: StatusInterpretation
  /** Every name that only ever appeared once, for the review screen's "tap to accept". */
  pending: ScanItem[]
}

// --- name plumbing -----------------------------------------------------------

/** Lowercase, punctuation-stripped key used for equality/clustering. */
export function normalizeItemName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

/** 0..1 similarity of two item names after normalisation. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeItemName(a)
  const y = normalizeItemName(b)
  if (!x || !y) return 0
  if (x === y) return 1
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length)
}

/** True when `short` is the beginning of `long`'s words (a truncated read). */
function isFragment(short: string, long: string): boolean {
  const x = normalizeItemName(short)
  const y = normalizeItemName(long)
  return Boolean(x) && x !== y && y.startsWith(`${x} `)
}

// --- category-restricted resolution ------------------------------------------

/** Catalog kinds accepted per inventory tab category (Task 134 `INVENTORY_TABS`). */
export const CATEGORY_KINDS: Record<string, string[]> = {
  spirit: ['spirit', 'item'],
  material: ['material', 'item'],
  'key-item': ['item'],
  sorcery: ['spell'],
  incantation: ['spell', 'incantation', 'item'],
  'ash-of-war': ['ash', 'item'],
  talisman: ['talisman'],
  weapon: ['weapon', 'shield'],
  armor: ['armor'],
  tool: ['item'],
  cookbook: ['item'],
  crafting: ['item'],
}

/** Does a catalog kind belong to the tab's category? Unknown category = no filter. */
export function kindAllowed(kind: string | undefined, category: string | undefined): boolean {
  if (!category) return true
  const allowed = CATEGORY_KINDS[category]
  if (!allowed || !kind) return true
  return allowed.includes(kind)
}

export type ItemCandidate = { id: string; name: string; kind?: string }
export type ItemResolver = (name: string, category?: string) => ItemCandidate | undefined

/**
 * Exact-then-fuzzy pick from a candidate set, restricted to the category's kinds.
 * Splitting this out keeps the resolver unit-testable without the runtime index.
 */
export function pickItemCandidate(
  name: string,
  category: string | undefined,
  candidates: { id: string; name: string; kind?: string }[],
  floor = 0.82,
): ItemCandidate | undefined {
  const target = normalizeItemName(name)
  if (target.length < 4) return undefined
  let best: ItemCandidate | undefined
  let bestScore = 0
  for (const c of candidates) {
    if (!kindAllowed(c.kind, category)) continue
    const cn = normalizeItemName(c.name)
    if (!cn) continue
    if (cn === target) return { id: c.id, name: c.name, kind: c.kind }
    if (Math.abs(cn.length - target.length) > Math.max(4, target.length * 0.4)) continue
    const score = 1 - levenshtein(target, cn) / Math.max(target.length, cn.length)
    if (score >= floor && score > bestScore) {
      bestScore = score
      best = { id: c.id, name: c.name, kind: c.kind }
    }
  }
  return best
}

/**
 * Default resolver: the authored catalog + alias plane first, then the fetched
 * entity index (the full item plane). Restricted by the tab's category.
 */
export function defaultItemResolver(name: string, category?: string): ItemCandidate | undefined {
  for (const row of matchGeneratedAliases(name)) {
    if (!kindAllowed(row.kind, category)) continue
    if (nameSimilarity(row.fmgName, name) >= 0.7) return { id: canonicalFactId(row.slug), name: row.fmgName, kind: row.kind }
  }
  const direct = byId.get(canonicalFactId(name))
  if (direct && kindAllowed(direct.kind, category) && nameSimilarity(direct.name, name) >= 0.7) {
    return { id: direct.id, name: direct.name, kind: direct.kind }
  }
  const records = allRecords()
  if (records.length) {
    const hit = pickItemCandidate(name, category, records.map((r) => ({ id: r.id, name: r.name, kind: r.kind })))
    if (hit) return hit
  }
  return undefined
}

// --- reading one frame's words ----------------------------------------------

const PANEL_WORDS = /^(no|held|stored|item|items|effect|effects|weight|fp|cost|attack|power|physical|magic|fire|lightning|holy|critical|attribute|attributes|scaling|str|dex|int|fai|arc|passive|damage|quantity|slots|used|requires|require|skill|affinity|inventory|select|back|switch|display|view|scroll|sort|ok|status)$/i

function cleanItemName(text: string): string {
  let tokens = text.split(/\s+/).filter((t) => /[a-z0-9]/i.test(t))
  tokens = tokens.filter((t) => !PANEL_WORDS.test(t.replace(/[.:]+$/g, '')))
  // Edge tokens must be real words; 1–2 letter crumbs ("BN", stray marks) go.
  const keepEdge = (t: string) =>
    /^[[(]\d{1,2}[\])]$/.test(t) ||
    /[a-z0-9]/i.test(t) && (t.replace(/[^a-z0-9]/gi, '').length >= 3 || /^(of|a|an|the|i|ii|iii|iv|v|x)$/i.test(t))
  while (tokens.length && !keepEdge(tokens[0])) tokens = tokens.slice(1)
  while (tokens.length && !keepEdge(tokens[tokens.length - 1])) tokens = tokens.slice(0, -1)
  return tokens.join(' ').replace(/\s+/g, ' ').trim()
}

const LEAD_STOPWORD = /^(of|a|an|the|and|to|for|in|on|with)$/i

function nameScore(text: string): number {
  const letters = (text.match(/[a-z]/gi) ?? []).length
  const titleWords = (text.match(/\b[A-Z][a-z]/g) ?? []).length
  const symbols = (text.match(/[^a-z0-9 [\]'’+-]/gi) ?? []).length
  return letters + titleWords * 3 - symbols * 4 + (text.split(/\s+/).length >= 2 ? 4 : 0)
}

type Row = { words: OcrWord[]; y: number; text: string }

function buildRows(words: OcrWord[]): Row[] {
  const byLine = new Map<number, OcrWord[]>()
  for (const w of words) {
    const list = byLine.get(w.line) ?? []
    list.push(w)
    byLine.set(w.line, list)
  }
  return [...byLine.values()]
    .map((list) => {
      list.sort((a, b) => a.x0 - b.x0)
      return {
        words: list,
        y: Math.min(...list.map((w) => w.y0)),
        text: list.map((w) => w.text).join(' ').replace(/\s{2,}/g, ' ').trim(),
      }
    })
    .sort((a, b) => a.y - b.y)
}

/** Drop the words that spell the tab (and up to two junk tokens before it). */
function withoutTab(row: Row, tab: string): OcrWord[] {
  const target = normalizeItemName(tab)
  if (!target) return row.words
  for (let start = 0; start < row.words.length; start++) {
    let acc = ''
    for (let end = start; end < row.words.length && end < start + 6; end++) {
      acc = `${acc} ${normalizeItemName(row.words[end].text)}`.trim()
      if (acc === target) return row.words.slice(end + 1)
      if (!target.startsWith(acc)) break
    }
  }
  return row.words
}

function findTab(rows: Row[]): { tab: string; category: string; y: number } | undefined {
  const tabs = [...INVENTORY_TABS].sort((a, b) => b.tab.length - a.tab.length)
  for (const row of rows) {
    const n = normalizeItemName(row.text)
    if (n.length < 3) continue
    for (const t of tabs) {
      const tn = normalizeItemName(t.tab)
      if (n === tn || n.startsWith(`${tn} `) || n.includes(` ${tn}`)) {
        return { tab: t.tab, category: t.category, y: row.y }
      }
    }
  }
  return undefined
}

/** Control hints and footer chrome must never be mistaken for an item name. */
const CONTROL_RE = /(select|interact|switch|display|scroll|:ok|:0k|:back|\(right\)|\(mid\)|inventory)/i

/**
 * The one useful read from a full-page word list: the tab (→ category), the
 * highlighted item name from the left list header, and the "No. Held" count.
 * The right-panel title is deliberately *not* preferred — on real phone photos
 * it is the line that falls off the edge of the frame.
 */
export function extractScanObservation(words: OcrWord[], width: number, height?: number): ScanObservation {
  const w = width || Math.max(...words.map((x) => x.x1), 1)
  const h = height || w * 1.33
  const left = words.filter((x) => wordCenterX(x) < w * 0.6)
  const rows = buildRows(left.length ? left : words)
  const tabHit = findTab(rows)

  // The highlighted name is the tab row's tail, or one of the few left rows just
  // below it. With no tab anchor, only the upper block can hold a list header —
  // never the footer's control hints.
  const band = tabHit
    ? rows.filter((r) => r.y >= tabHit.y - h * 0.01 && r.y <= tabHit.y + h * 0.14)
    : rows.filter((r) => r.y >= h * 0.08 && r.y <= h * 0.34)
  let best: { words: OcrWord[]; name: string; score: number } | undefined
  for (const row of band) {
    if (CONTROL_RE.test(row.text)) continue
    const nameWords = tabHit && row.y === tabHit.y ? withoutTab(row, tabHit.tab) : row.words
    const name = cleanItemName(nameWords.map((x) => x.text).join(' '))
    const letters = (name.match(/[a-z]/gi) ?? []).length
    const words = name.split(/\s+/).length
    if (letters < 5 || words < 2 || words > 7 || name.length > 48) continue
    if (LEAD_STOPWORD.test(name.split(/\s+/)[0])) continue
    // The list header on the tab row is the canonical spelling; rows below are
    // echoes/noise, so give the tab row a strong preference when it carries one.
    const onTabRow = tabHit && row.y === tabHit.y && nameWords !== row.words
    const score = nameScore(name) + (onTabRow ? 5 : tabHit && row.y > tabHit.y ? 3 : 0) + name.length * 0.02
    if (!best || score > best.score) best = { words: nameWords, name, score }
  }
  const name = best?.name
  const confidence = best && best.words.length
    ? best.words.reduce((n, x) => n + x.confidence, 0) / best.words.length
    : 0

  return {
    name,
    tab: tabHit?.tab,
    category: tabHit?.category,
    held: findHeld(words, w),
    confidence,
    status: extractStatus(words),
  }
}

/** "No. Held" is label-anchored: find the label, read the number on its row. */
function findHeld(words: OcrWord[], width: number): number | undefined {
  const held = words.filter((x) => /^held$/i.test(x.text.replace(/[^a-z]/gi, '')))
  for (const label of held) {
    let best: OcrWord | undefined
    let bestGap = width * 0.25
    for (const cand of words) {
      if (cand === label || cand.x0 < label.x0) continue
      const overlap = Math.min(label.y1, cand.y1) - Math.max(label.y0, cand.y0)
      if (overlap <= 0) continue
      const n = Number(cand.text.replace(/[^0-9]/g, ''))
      if (!Number.isFinite(n) || n <= 0 || n > 9999) continue
      const gap = cand.x0 - label.x1
      if (gap < bestGap) {
        bestGap = gap
        best = cand
      }
    }
    if (best) return Number(best.text.replace(/[^0-9]/g, ''))
  }
  return undefined
}

// --- the stabiliser ----------------------------------------------------------

export type StabilizerOptions = {
  resolve?: ItemResolver
  /** Reads needed before a name is `confirmed` (default 2). */
  minFrames?: number
  /** Name similarity at which two reads are the same item (default 0.84). */
  similarity?: number
  /** Confidence floor for a name to be usable at all (default 0.35). */
  confidenceFloor?: number
}

type Cluster = {
  key: string
  factId?: string
  name: string
  nameScore: number
  /** Confidence of the spelling currently chosen for `name`. */
  nameConfidence: number
  category?: string
  held?: number
  confidence: number
  frames: number
  tab?: string
}

/**
 * Fold a stream of per-frame observations into deduped items. Fuzzy-equal reads
 * of the same name (and reads that resolve to the same fact id) merge; the
 * longest, highest-scoring spelling wins; the maximum "No. Held" is kept.
 */
export class InventoryStabilizer {
  private readonly resolve: ItemResolver
  private readonly minFrames: number
  private readonly similarity: number
  private readonly floor: number
  private readonly clusters: Cluster[] = []
  private readonly statusReads: StatusRead[] = []
  private tab?: string
  private category?: string

  constructor(opts: StabilizerOptions = {}) {
    this.resolve = opts.resolve ?? defaultItemResolver
    this.minFrames = opts.minFrames ?? 2
    this.similarity = opts.similarity ?? 0.84
    this.floor = opts.confidenceFloor ?? 0.35
  }

  observe(input: ScanObservation | ScanObservation[]): void {
    for (const obs of Array.isArray(input) ? input : [input]) this.observeOne(obs)
  }

  private observeOne(obs: ScanObservation): void {
    if (obs.tab) this.tab = obs.tab
    if (obs.category) this.category = obs.category
    if (obs.status && (obs.status.name || Object.keys(obs.status.fields).length)) this.statusReads.push(obs.status)

    const name = obs.name?.trim()
    if (!name || obs.confidence < this.floor) return
    const resolved = this.resolve(name, obs.category ?? this.category)
    const category = obs.category ?? this.category
    const match = this.clusters.find((c) => {
      if (resolved && c.factId && c.factId === resolved.id) return true
      if (nameSimilarity(c.name, name) >= this.similarity) return true
      return isFragment(c.name, name) || isFragment(name, c.name)
    })
    const score = nameScore(name)
    if (!match) {
      this.clusters.push({
        key: normalizeItemName(name),
        factId: resolved?.id,
        name,
        nameScore: score,
        nameConfidence: obs.confidence,
        category,
        held: obs.held,
        confidence: obs.confidence,
        frames: 1,
        tab: obs.tab ?? this.tab,
      })
      return
    }
    match.frames++
    match.held = Math.max(match.held ?? 0, obs.held ?? 0) || match.held
    match.confidence = Math.max(match.confidence, obs.confidence)
    if (resolved && !match.factId) match.factId = resolved.id
    if (!match.category && category) match.category = category
    // Prefer the most complete spelling (a truncated read must not win), and on a
    // tie the higher-confidence one — "Corpse" must beat a once-seen "Corpee".
    const better =
      score > match.nameScore ||
      (score === match.nameScore && name.length > match.name.length) ||
      (score === match.nameScore && name.length === match.name.length && obs.confidence > match.nameConfidence)
    if (better) {
      match.name = name
      match.nameScore = score
      match.nameConfidence = obs.confidence
    }
  }

  items(): ScanItem[] {
    return this.clusters.map((c) => ({
      factId: c.factId,
      name: c.name,
      category: c.category,
      held: c.held,
      confidence: c.confidence,
      frames: c.frames,
      confirmed: c.frames >= this.minFrames,
    }))
  }

  result(): ScanResult {
    const items = this.items()
    const status = this.statusReads.length ? interpretStatus(mergeStatusReads(this.statusReads)) : undefined
    return {
      items: items.filter((i) => i.confirmed),
      pending: items.filter((i) => !i.confirmed),
      tab: this.tab,
      category: this.category,
      status,
    }
  }
}

// --- OCR injection -----------------------------------------------------------

/** One OCR call over an already-preprocessed frame. Injected so the engine is pure. */
export type FrameOcr = (image: unknown, psm: string) => Promise<OcrWord[]>

export type FrameOptions = {
  /** Which page-segmentation modes to run (default both, as Task 134 does). */
  psms?: string[]
}

/**
 * Run the Task 134 winning preprocessing path over one frame and return one
 * observation per (variant × psm) read. A video loop can pass `psms: ['6']` to
 * halve the work at a slight recall cost; a single still import runs them all so
 * the stabiliser has enough agreeing reads to confirm a name.
 */
export async function analyzeFrame(
  preprocessed: unknown[],
  width: number,
  ocr: FrameOcr,
  opts: FrameOptions = {},
): Promise<ScanObservation[]> {
  const psms = opts.psms ?? ['6', '4']
  const out: ScanObservation[] = []
  for (const image of preprocessed) {
    for (const psm of psms) {
      const words = await ocr(image, psm)
      out.push(extractScanObservation(words, width))
    }
  }
  return out
}
