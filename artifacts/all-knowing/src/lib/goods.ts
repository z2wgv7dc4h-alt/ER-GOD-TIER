import { facts, matchFacts, normalize } from '../knowledge/catalog'
import { loot, matchLoot } from '../knowledge/loot'
import type { Character } from '../types'
import { applyFacts } from './infer'

/**
 * Task 89: a typed/pasted list of item names.
 *
 * One line is marked only when it resolves to exactly **one** confident
 * catalog/loot fact; ambiguous or unmatched lines stay unknown. No OCR, no new
 * matcher, no invented ids — it reuses the catalog `matchFacts`/`matchMany`
 * and `matchLoot`, then writes through `applyFacts`.
 */
export type GoodsLine = { line: string; id?: string; name?: string }

export type GoodsIngest = {
  character: Character
  lines: GoodsLine[]
  marked: GoodsLine[]
  unknown: GoodsLine[]
}

// Exact (normalized) name/alias -> the ids that claim it, so a name shared by
// two facts is not treated as confident.
const EXACT = new Map<string, { id: string; name: string }[]>()
const addExact = (name: string, id: string, label: string) => {
  const key = normalize(name)
  if (!key) return
  const list = EXACT.get(key) || []
  list.push({ id, name: label })
  EXACT.set(key, list)
}
for (const f of facts) {
  addExact(f.name, f.id, f.name)
  for (const a of f.aliases) addExact(a, f.id, f.name)
}
for (const l of loot) {
  addExact(l.name, l.id, l.name)
  for (const a of l.aliases) addExact(a, l.id, l.name)
}

/** One line → exactly one confident catalog/loot id, or null. */
export function goodsLineId(line: string): { id: string; name: string } | null {
  const text = line.trim()
  if (text.length < 3) return null

  const exact = EXACT.get(normalize(text))
  if (exact && exact.length === 1) return exact[0]

  const ids = new Map<string, string>()
  for (const f of matchFacts(text)) ids.set(f.id, f.name)
  for (const l of matchLoot(text)) ids.set(l.id, l.name)
  if (ids.size !== 1) return null
  const [id, name] = [...ids.entries()][0]
  return { id, name }
}

export function ingestGoodsList(character: Character, text: string): GoodsIngest {
  const raw = (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const lines: GoodsLine[] = raw.map((line) => {
    const hit = goodsLineId(line)
    return hit ? { line, id: hit.id, name: hit.name } : { line }
  })
  const marked = lines.filter((l) => l.id)
  const unknown = lines.filter((l) => !l.id)
  const next = marked.length
    ? applyFacts(character, marked.map((l) => l.id as string), 'answer', 'goods paste')
    : character
  return { character: next, lines, marked, unknown }
}
