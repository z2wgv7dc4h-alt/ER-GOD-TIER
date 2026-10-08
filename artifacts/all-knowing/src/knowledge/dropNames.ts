import data from '../data/drop-aliases.json'

/**
 * Task 173 §10 — the one loot list.
 *
 * Drop strings reach the graph and the boss roster from the wiki, the checklists
 * and Fextralife with counts, notes, section headers and wiki shorthand. Both the
 * entity graph and `scripts/build-boss-roster.mjs` normalise through this table,
 * so a given drop string resolves to the same real item id everywhere.
 *
 * Nothing is invented: an alias only names an item that really exists, and a
 * string in `dropped` names no single item at all (an armour set, a generic
 * plural like "Somber Smithing Stones", a wiki header or a place name), so it is
 * discarded rather than pointed at an arbitrary tier.
 */
type DropData = { aliases?: Record<string, string>; dropped?: string[] }

const ALIASES = new Map<string, string>(
  Object.entries((data as DropData).aliases ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
)
const DROPPED = new Set<string>(((data as DropData).dropped ?? []).map((s) => s.toLowerCase()))

/** A generic class name that names no single (tiered) item. */
const GENERIC =
  /^(?:somber\s+|ghost[- ]?|grave\s+)?smithing stones?$|^golden runes?$|^(?:grave|ghost)[- ]?glovewort$|^crystal tear$|^larval tear$|^hero(?:'|’)?s? runes?$/i
/** A trailing usage note ("(after defeating Elden Beast)", "(if …)"). */
const TRAILING_NOTE = /\s*\((?:if|unless|after|before|when|once|from|requires?|only|ng\+?|new game)[^)]*\)?\s*$/i
/** A wiki header or pointer, not loot. */
const JUNK = /^(?:see\b|unlocks\b|includes?\b|sometimes\b|specifying\b|\(include)/i

function clean(raw: string): string {
  return String(raw ?? '')
    .replace(/\[\[|\]\]|\{\{[^}]*\}?\}?/g, '')
    .replace(/^\s*[*•#\-\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** One drop cell -> the real item name, or null when it names no single item. */
export function normaliseDropName(raw: string): string | null {
  let text = clean(raw)
  if (!text) return null
  if (JUNK.test(text)) return null
  if (/^[\d~≈.,\s]*runes?(\s*\(ng[^)]*\))?$/i.test(text)) return null
  text = text.replace(TRAILING_NOTE, '').trim()
  if (!text) return null
  const key = text.toLowerCase()
  if (DROPPED.has(key)) return null
  const alias = ALIASES.get(key)
  if (alias) return alias
  if (GENERIC.test(text)) return null
  // An armour "Set" names no single item.
  if (/\bset$/i.test(text)) return null
  return text
}

/** A comma-joined drop cell -> its normalised parts. */
export function normaliseDrops(raw: string): string[] {
  const out: string[] = []
  for (const part of String(raw ?? '').split(/,\s+/)) {
    const name = normaliseDropName(part)
    if (name) out.push(name)
  }
  return out
}
