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

/** True when the spelling differs from the canonical game name. */
export function hasBadCasing(name: string): boolean {
  return canonicalName(name) !== name
}

export const canonicalNameCount = CANONICAL_BY_NAME.size
