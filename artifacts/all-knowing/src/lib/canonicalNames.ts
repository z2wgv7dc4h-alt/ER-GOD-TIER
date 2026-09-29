import namesJson from '../../public/sourced/open/names.json'
import { normalizeName } from './fanImage'

/**
 * Task 144 §1 — canonical display names.
 *
 * The FanAPI/checklist dumps title-case every word ("Axe Of Godfrey",
 * "Ranni The Witch"), which is not how the game spells them. The install's own
 * FMG dump (`public/sourced/open/names.json`) carries the verbatim in-game
 * spelling, so this module is the one name authority: a normalised name maps to
 * the FMG spelling when one exists, otherwise the input is returned unchanged.
 *
 * Nothing is invented here — only the casing of a name present in the game data
 * is corrected. `names.json` is the same source `regulation.ts` reads.
 */

type OpenName = { id: string; kind: string; name: string }

const CANONICAL_BY_NAME = (() => {
  const map = new Map<string, string>()
  for (const row of namesJson as OpenName[]) {
    const key = normalizeName(row.name)
    if (!key) continue
    // The FMG spelling is the authority; the first row wins (ids repeat).
    if (!map.has(key)) map.set(key, row.name)
  }
  return map
})()

/** The in-game spelling for a name when the game text knows one. */
export function canonicalName(name: string): string {
  const key = normalizeName(name)
  if (!key) return name
  return CANONICAL_BY_NAME.get(key) ?? name
}

const MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'to', 'at', 'a', 'an', 'for', 'on', 'from'])

/**
 * A readable name for display: the in-game spelling when the game text knows
 * one. Otherwise a dump's casing is repaired: an all-lowercase slug name
 * ("stormveil") is capitalised, and connectives inside a Title-Cased name
 * ("Ranni The Witch") are lowered as the game writes them ("Ranni the Witch").
 */
export function displayName(name: string): string {
  const known = CANONICAL_BY_NAME.get(normalizeName(name))
  if (known) return known
  const words = name.split(' ')
  if (!/[A-Z]/.test(name)) {
    return words.map((w, i) => (i > 0 && MINOR_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
  }
  return words.map((w, i) => (i > 0 && MINOR_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w)).join(' ')
}

/** True when the spelling differs from the canonical game name. */
export function hasBadCasing(name: string): boolean {
  return canonicalName(name) !== name
}

export const canonicalNameCount = CANONICAL_BY_NAME.size
