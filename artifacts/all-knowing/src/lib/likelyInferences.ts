import { canonicalFactId } from './aliases'
import { bossRoster } from './bossRoster'
import { applyFacts, denyFacts, knownFactIds } from './infer'
import type { Character } from '../types'

/**
 * Task 138 §2 — the "probably done — confirm?" layer.
 *
 * These are conclusions a knowledgeable player draws that are *not* certainties:
 * having a region revealed and being past its level band makes a main-path boss
 * likely, but never proven. The app must surface them for an explicit yes/no and
 * never apply one silently. Answers go through the normal `applyFacts` /
 * `denyFacts` conflict path, so a later screenshot or save still wins.
 */
export type LikelyInference = {
  id: string
  factId: string
  label: string
  why: string
}

type LikelyBossRule = {
  factId: string
  regionFact: string
  minLevel: number
  why: string
}

/**
 * Main-path bosses in progression order. `minLevel` follows the Fextralife
 * region bands in `public/sourced/open/region-levels.json` (Stormveil 30-40,
 * Raya Lucaria 50-60, …); a lower level suppresses the suggestion rather than
 * offering a fight the player is nowhere near.
 */
const LIKELY_BOSSES: LikelyBossRule[] = [
  {
    factId: 'boss:godrick',
    regionFact: 'region:limgrave',
    minLevel: 30,
    why: 'Limgrave is revealed and you are past the Stormveil band — most runs have felled Godrick by now.',
  },
  {
    factId: 'boss:rennala',
    regionFact: 'region:liurnia',
    minLevel: 50,
    why: 'Liurnia is revealed and you are past the Raya Lucaria band — Rennala is likely down.',
  },
  {
    factId: 'boss:radahn',
    regionFact: 'region:caelid',
    minLevel: 60,
    why: 'Caelid is revealed and you are past its band — the Radahn festival is likely done.',
  },
  {
    factId: 'boss:rykard',
    regionFact: 'region:altus',
    minLevel: 70,
    why: 'Altus is revealed and you carry its progress — Rykard is likely down.',
  },
  {
    factId: 'boss:morgott',
    regionFact: 'region:leyndell',
    minLevel: 90,
    why: 'Leyndell is revealed and you are near its band — Morgott is likely down.',
  },
]

function deniedSet(character: Character): Set<string> {
  return new Set((character.deniedFacts || []).map((id) => canonicalFactId(id)))
}

/** Bosses the character probably beat but has not logged, for confirmation. */
export function likelyInferences(character: Character, limit = 3): LikelyInference[] {
  const known = knownFactIds(character)
  const denied = deniedSet(character)
  const out: LikelyInference[] = []
  for (const rule of LIKELY_BOSSES) {
    const factId = canonicalFactId(rule.factId)
    if (known.has(factId) || denied.has(factId)) continue
    if (!known.has(canonicalFactId(rule.regionFact))) continue
    if (character.level < rule.minLevel) continue
    const boss = bossRoster.find((b) => b.id === rule.factId)
    out.push({
      id: `likely:${rule.factId}`,
      factId: rule.factId,
      label: boss?.name ?? rule.factId.replace(/^boss:/, '').replace(/-/g, ' '),
      why: rule.why,
    })
  }
  return out.slice(0, limit)
}

/** Confirm a likely inference: normal answer-sourced fact, still overridable. */
export function confirmLikelyInference(character: Character, factId: string): Character {
  return applyFacts(character, [factId], 'answer', 'confirmed likely inference')
}

/** Reject a likely inference: an explicit false, so it stops being suggested. */
export function rejectLikelyInference(character: Character, factId: string): Character {
  return denyFacts(character, [factId], 'not yet — likely inference rejected')
}
