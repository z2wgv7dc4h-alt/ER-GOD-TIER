import { facts } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { loot } from '../knowledge/loot'
import { generatedAliases } from './aliases'

/**
 * Prose → links. Turns any mention of a known entity in text (a build write-up,
 * a boss's drop list, a guide excerpt) into a clickable reference, using the
 * names the app already holds — the authored catalog, the warp list, the loot
 * table, and the generated alias plane (names.json). No fuzzy guessing: a match
 * is an exact normalised name, so nothing wrong gets linked.
 */
export type LinkIndex = Map<string, { id: string; label: string }>

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

let cached: LinkIndex | null = null

export function linkIndex(): LinkIndex {
  if (cached) return cached
  const idx: LinkIndex = new Map()
  const add = (name: string, id: string) => {
    const key = normalizeName(name)
    if (!key || key.length < 3) return
    if (!idx.has(key)) idx.set(key, { id, label: name })
  }
  // Authored + pinned beats win over generated rows for the same name.
  for (const f of facts) {
    add(f.name, f.id)
    for (const a of f.aliases) add(a, f.id)
  }
  for (const g of warpGraces) {
    add(g.name, g.id)
    for (const a of g.aliases) add(a, g.id)
  }
  for (const row of generatedAliases) {
    add(row.fmgName, row.slug)
    for (const a of row.aliases) add(a, row.slug)
  }
  for (const l of loot) add(l.name, l.id)
  cached = idx
  return idx
}

export type Span = { text: string; id?: string }

/**
 * Split `text` into spans, tagging the longest known entity name at each
 * position. Greedy + longest-first so "Rivers of Blood" wins over "Rivers".
 */
export function linkify(text: string, index: LinkIndex, maxLinks = 60): Span[] {
  const words: { start: number; end: number }[] = []
  for (const m of text.matchAll(/[A-Za-z0-9'’-]+/g)) words.push({ start: m.index!, end: m.index! + m[0].length })

  const spans: Span[] = []
  let last = 0
  let links = 0
  let i = 0
  while (i < words.length) {
    if (links >= maxLinks) break
    let matched: { len: number; id: string; start: number; end: number } | null = null
    for (let len = Math.min(5, words.length - i); len >= 1; len--) {
      const start = words[i].start
      const end = words[i + len - 1].end
      const hit = index.get(normalizeName(text.slice(start, end)))
      if (hit) {
        matched = { len, id: hit.id, start, end }
        break
      }
    }
    if (matched) {
      if (matched.start > last) spans.push({ text: text.slice(last, matched.start) })
      spans.push({ text: text.slice(matched.start, matched.end), id: matched.id })
      last = matched.end
      i += matched.len
      links++
    } else {
      i++
    }
  }
  if (last < text.length) spans.push({ text: text.slice(last) })
  return spans
}
