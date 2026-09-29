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

const letters = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * The in-game spelling for a name when the game text knows one. Only a spelling
 * of the same words wins: the lookup key drops bracketed qualifiers, so
 * "Crucible Knight (Farum Azula)" must stay distinct, not become "Crucible Knight".
 */
export function canonicalName(name: string): string {
  const key = normalizeName(name)
  if (!key) return name
  const known = CANONICAL_BY_NAME.get(key)
  return known && letters(known) === letters(name) ? known : name
}

const MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'to', 'at', 'a', 'an', 'for', 'on', 'from'])

/**
 * A readable name for display: the in-game spelling when the game text knows
 * one. Otherwise a dump's casing is repaired: an all-lowercase slug name
 * ("stormveil") is capitalised, and connectives inside a Title-Cased name
 * ("Ranni The Witch") are lowered as the game writes them ("Ranni the Witch").
 */
export function displayName(name: string): string {
  const known = canonicalName(name)
  if (known !== name || CANONICAL_BY_NAME.get(normalizeName(name)) === name) return known
  const words = name.split(' ')
  if (!/[A-Z]/.test(name)) {
    return words.map((w, i) => (i > 0 && MINOR_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
  }
  // Never the last word, and never a lone article: "Sorcerer A" is a label.
  const last = words.length - 1
  return words
    .map((w, i) => (i > 0 && i < last && MINOR_WORDS.has(w.toLowerCase()) && !/^an?$/i.test(w) ? w.toLowerCase() : w))
    .join(' ')
}

/** Character-creator / bare-slot / placeholder rows the dumps carry — never game entities. */
export const JUNK_NAME = /^(?:type \d+|arms|body|head|legs|travel hairstyle|someone yet unseen)$/i

/** True when the spelling differs from the canonical game name. */
export function hasBadCasing(name: string): boolean {
  return canonicalName(name) !== name
}

export const canonicalNameCount = CANONICAL_BY_NAME.size
