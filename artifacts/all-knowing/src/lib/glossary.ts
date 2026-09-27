import { mechanicTerms } from '../knowledge/mechanics'
import { allEntities } from './entityGraph'
import { linkIndex, normalizeName } from './interlink'

/**
 * Task 106 — prose → links, the mechanics-aware successor to `interlink.ts`.
 *
 * `autolink(text)` splits a block of prose into plain and linkable segments,
 * matching the longest known entity name or alias and the authored mechanic
 * terms (poise, stance break, rune arc, …). Matching is case-insensitive and
 * always respects word boundaries, so "rune" never matches "runes" and
 * "Margit" links the full "Margit, the Fell Omen" phrase when it is present.
 *
 * The one-link-per-term rule resets at every blank-line paragraph, so a long
 * Gideon answer can mention poise once per paragraph without turning every
 * repetition into a link. Consumers (`WikiText`, Gideon) can render each
 * segment with `EntityLink` when `id` is set; this module stays pure.
 */
export type GlossaryKind = 'entity' | 'mechanic'

export type GlossaryTerm = {
  /** Normalised lookup key. */
  key: string
  /** Canonical entity id the term resolves to. */
  id: string
  /** The spelling to keep as link text when the source has no better one. */
  label: string
  kind: GlossaryKind
}

export type GlossaryIndex = Map<string, GlossaryTerm>

export type GlossarySegment = {
  text: string
  /** Present only when this segment is a link. */
  id?: string
  kind?: GlossaryKind
}

export type AutolinkOptions = {
  /** Override the term index (used by tests). */
  index?: GlossaryIndex
  /** Hard cap on links across the whole call. */
  maxLinks?: number
}

/** Terms shorter than this are too generic to link safely. */
const MIN_TERM_LENGTH = 3

/** Word characters; hyphens and apostrophes are kept so "All-Knowing" is one token. */
const WORD = /[A-Za-z0-9'’-]+/g

/** Blank-line runs separate paragraphs and reset the per-term rule. */
const PARAGRAPH_BREAK = /(\n[ \t]*\n+)/

let cachedIndex: GlossaryIndex | null = null

export function glossaryIndex(): GlossaryIndex {
  if (cachedIndex) return cachedIndex
  const index: GlossaryIndex = new Map()

  const add = (raw: string, id: string, kind: GlossaryKind) => {
    const key = normalizeName(raw)
    if (!key || key.length < MIN_TERM_LENGTH) return
    if (!index.has(key)) index.set(key, { key, id, label: raw, kind })
  }

  // The proven alias plane first: authored facts, warps, generated aliases, loot.
  for (const [key, hit] of linkIndex()) {
    if (!index.has(key)) index.set(key, { key, id: hit.id, label: hit.label, kind: 'entity' })
  }

  // Entities the alias plane does not carry (dungeons, NPCs, builds, merchants,
  // gates, endings). Damage-type mechanics are skipped on purpose: linking every
  // occurrence of the word "fire" would be noise, not help.
  for (const entity of allEntities()) {
    if (entity.kind === 'mechanic') continue
    add(entity.name, entity.id, 'entity')
  }

  // Authored mechanics cards last, so a real entity always wins a shared name.
  for (const term of mechanicTerms()) {
    add(term.term, term.id, 'mechanic')
  }

  cachedIndex = index
  return index
}

/** Longest number of words any term in the index spans. */
function maxTermWords(index: GlossaryIndex): number {
  let max = 1
  for (const key of index.keys()) {
    const words = key.split(' ').length
    if (words > max) max = words
  }
  return max
}

/** Split prose into plain text and link segments. */
export function autolink(text: string, opts: AutolinkOptions = {}): GlossarySegment[] {
  if (!text) return []
  const index = opts.index ?? glossaryIndex()
  const maxWords = maxTermWords(index)
  const maxLinks = Number.isFinite(opts.maxLinks) ? (opts.maxLinks as number) : Number.POSITIVE_INFINITY
  const segments: GlossarySegment[] = []
  let links = 0

  for (const part of text.split(PARAGRAPH_BREAK)) {
    if (!part) continue
    if (PARAGRAPH_BREAK.test(part)) {
      segments.push({ text: part })
      continue
    }
    // The per-term rule is scoped to this paragraph.
    const seen = new Set<string>()
    const words: { start: number; end: number }[] = []
    for (const m of part.matchAll(WORD)) words.push({ start: m.index!, end: m.index! + m[0].length })

    let last = 0
    let i = 0
    while (i < words.length) {
      let matched: { len: number; key: string; term: GlossaryTerm } | null = null
      for (let len = Math.min(maxWords, words.length - i); len >= 1; len--) {
        const start = words[i].start
        const end = words[i + len - 1].end
        const key = normalizeName(part.slice(start, end))
        if (seen.has(key)) continue
        const term = index.get(key)
        if (term) {
          matched = { len, key, term }
          break
        }
      }

      if (matched && links < maxLinks) {
        const start = words[i].start
        const end = words[i + matched.len - 1].end
        if (start > last) segments.push({ text: part.slice(last, start) })
        segments.push({ text: part.slice(start, end), id: matched.term.id, kind: matched.term.kind })
        seen.add(matched.key)
        last = end
        i += matched.len
        links++
      } else {
        i++
      }
    }
    if (last < part.length) segments.push({ text: part.slice(last) })
  }

  return segments
}
