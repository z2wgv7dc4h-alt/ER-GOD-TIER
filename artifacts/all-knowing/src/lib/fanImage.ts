import imageIndex from '../data/image-index.json'

/**
 * FanAPI image plane (Task 36). `src/data/image-index.json` maps a normalised
 * entity name to a locally cached WebP thumbnail under `public/sourced/images/`,
 * produced by `scripts/ingest-images.py`. The Codex renders these real item,
 * weapon and boss pictures instead of generic category glyphs.
 *
 * The plane is base-game only: the FanAPI predates Shadow of the Erdtree, so
 * SotE / Tarnished Pack entries have no picture and `fanImage` returns undefined.
 */
const index = imageIndex as Record<string, string>

/** Same normalisation as scripts/ingest-images.py and scripts/gen-aliases.mjs. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019']s\b/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lookup(name: string): string | undefined {
  const key = normalizeName(name)
  return key ? index[key] : undefined
}

/**
 * Resolve a real picture for a Codex entity. Tries the full name first, then
 * each alias, then the slash-separated halves of a phase name ("Maliketh, the
 * Black Blade / Beast Clergyman" also matches either half). Returns a local
 * `/sourced/images/...` path, or undefined when the FanAPI has no picture.
 */
export function fanImage(name: string, aliases: string[] = []): string | undefined {
  const candidates = [name, ...aliases, ...name.split('/')]
  for (const candidate of candidates) {
    const hit = lookup(candidate)
    if (hit) return hit
  }
  return undefined
}

/** Number of names with a cached picture — used by tests and status copy. */
export function fanImageCount(): number {
  return Object.keys(index).length
}
