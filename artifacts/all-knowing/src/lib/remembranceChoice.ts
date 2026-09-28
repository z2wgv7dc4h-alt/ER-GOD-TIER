import { facts } from '../knowledge/catalog'
import { loot } from '../knowledge/loot'
import type { Remembrance } from '../knowledge/remembrances'
import { canonicalFactId } from './aliases'
import { ARCHETYPE_LABELS, detectArchetype, type Archetype } from './archetype'
import { knownFactIds } from './infer'
import type { Character } from '../types'

/**
 * Task 100 §4 — rank Enia's remembrance trade options for *this* build
 * (Usage model moment 13), and mark the ones already turned in.
 *
 * The reward-to-build fit is an authored keyword table, not a number the game
 * exposes; it only orders the options, it never claims a stat. "Traded" is the
 * character's own evidence: the remembrance itself or a reward id is known.
 */

export type RemembranceOption = {
  name: string
  /** Canonical id when the reward resolves to a catalog/loot row. */
  factId?: string
  score: number
  traded: boolean
  why: string
}

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

const nameToId = new Map<string, string>()
for (const f of facts) if (!nameToId.has(norm(f.name))) nameToId.set(norm(f.name), f.id)
for (const l of loot) if (!nameToId.has(norm(l.name))) nameToId.set(norm(l.name), l.id)

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function rewardId(name: string, explicit?: string): string {
  if (explicit) return explicit
  return nameToId.get(norm(name)) ?? `item:${slug(name)}`
}

/** Authored fit hints. Higher score = better on-build; never a stat claim. */
const ARCHETYPE_KEYWORDS: Record<Archetype, RegExp> = {
  strength: /greatsword|greataxe|colossal|giant|hammer|cragblade|braid|anvil|crusher|axe of|greatshield|earthshaker/i,
  dexterity: /katana|dagger|spear|sickle|bow|twin blade|twinblade|poleblade|blade of|sword of|scythe|war sickle/i,
  quality: /greatsword|sword|blade|axe|halberd|lance/i,
  intelligence: /moon|sorcer|glintstone|staff|carian|scepter|astel|fingers|stars|stone/i,
  faith: /sacred|golden|holy|incant|dragon|flame|order|god|erdtree|aeonia|dew/i,
  arcane: /blood|mohgwyn|blasphemous|occult|fell|rancor|bloodboon|rot/i,
  bleed: /blood|mohgwyn|blasphemous|occult|rancor|bloodboon|rot/i,
  hybrid: /moon|sacred|flame|glintstone|golden|god/i,
}

/**
 * Score one reward for the build. Matches on the primary attribute score higher
 * than a secondary one; no match is neutral. Deterministic and side-effect free.
 */
function scoreReward(name: string, archetype: Archetype): number {
  const primary = ARCHETYPE_KEYWORDS[archetype]
  if (primary.test(name)) return 80
  // A small cross-fit so a heavily Strength-flavoured name still surfaces for a
  // Quality build instead of dropping to the bottom.
  if (archetype === 'quality' && /greatsword|colossal|axe|hammer/i.test(name)) return 65
  return 50
}

/** Rank a remembrance's Enia options best-first for the character's build. */
export function rankRemembrance(
  character: Character,
  remembrance: Remembrance,
  archetype?: Archetype,
): RemembranceOption[] {
  const build = archetype ?? detectArchetype(character.stats)
  const known = knownFactIds(character)
  const remembranceKnown = known.has(canonicalFactId(remembrance.id))

  return remembrance.rewards
    .map((reward, index) => {
      const id = rewardId(reward.name, reward.factId)
      const canonical = canonicalFactId(id)
      const traded =
        remembranceKnown ||
        known.has(canonical) ||
        (known.has(id) && id !== canonical)
      const score = scoreReward(reward.name, build)
      return {
        name: reward.name,
        factId: id,
        score,
        traded,
        why:
          score >= 80
            ? `Fits a ${ARCHETYPE_LABELS[build]} build.`
            : score >= 65
              ? `Works in a ${ARCHETYPE_LABELS[build]} shell.`
              : `No strong ${ARCHETYPE_LABELS[build]} fit — take it for the collection.`,
        index,
      }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ index: _index, ...option }) => option)
}
