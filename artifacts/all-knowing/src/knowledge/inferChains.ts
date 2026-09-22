import { canonicalFactId } from '../lib/aliases'
import { byId } from './catalog'

/**
 * Named-evidence inference chains (Task 54).
 *
 * An OCR hit, a warp-list paste, or a typed item name is *evidence*, not proof of
 * everything downstream. This table expresses the honest, one-directional
 * implications we are willing to draw: "you are holding X, so Y must already be
 * true." It is deliberately a table, not code, so Gideon can explain
 * "I inferred X because you have Y".
 *
 * This is **not** a second closer. `closeWorld()` in `lib/infer.ts` walks
 * `catalog.implies` and then consults this table; `applyFacts()` records every
 * derived id as `source: 'inference'`. The Task 24 conflict rules stay in charge,
 * because an inferred id can never outrank a save flag or an explicit `deny`.
 *
 * Authoring rules:
 *  - every `whenFact` / `implies` id must already exist in the repo (catalog or a
 *    storyline grant). No invented slugs.
 *  - never imply a boss kill from an item that can be traded or found without the
 *    kill unless the item genuinely only drops from that boss.
 *  - `allOf` is the only compound form: every listed id must also be known before
 *    the chain fires (the two Haligtree medallion halves).
 *  - `unless` is a hard stop: if any listed id is known, the chain does not fire.
 */

export type InferChain = {
  whenFact: string
  implies: string[]
  /** Additional facts that must all be known before the chain fires. */
  allOf?: string[]
  /** If any of these is known, the chain does not fire. */
  unless?: string[]
  /** 0..1 confidence in the implication itself, for ranking / explanation. */
  confidence: number
  why: string
}

export const inferChains: InferChain[] = [
  {
    whenFact: 'item:fingerslayer',
    implies: ['quest:ranni:nokron'],
    confidence: 0.85,
    why: 'The Fingerslayer Blade lies in Nokron’s Night’s Sacred Ground, so Ranni’s Nokron beat is open.',
  },
  {
    whenFact: 'item:godrick-great-rune',
    implies: ['boss:godrick'],
    confidence: 0.9,
    why: 'Holding Godrick’s Great Rune means Godrick is dead. It says nothing about activating the rune or reaching Morgott.',
  },
  {
    whenFact: 'item:radahn-great-rune',
    implies: ['boss:radahn'],
    confidence: 0.9,
    why: 'Holding Radahn’s Great Rune means Starscourge Radahn is dead.',
  },
  {
    whenFact: 'item:rennala-great-rune',
    implies: ['boss:rennala'],
    confidence: 0.9,
    why: 'Holding Rennala’s Great Rune means Rennala is dead.',
  },
  {
    whenFact: 'item:morgott-great-rune',
    implies: ['boss:morgott'],
    confidence: 0.9,
    why: 'Holding Morgott’s Great Rune means Morgott is dead.',
  },
  {
    whenFact: 'item:black-knifeprint',
    implies: ['quest:rogier:knifeprint'],
    confidence: 0.75,
    why: 'The Black Knifeprint is the Rogier hand-in, so his knifeprint beat is done.',
  },
  {
    whenFact: 'item:pureblood-medal',
    implies: ['quest:varre:cloth'],
    confidence: 0.85,
    why: 'The Pureblood Knight’s Medal is Varré’s reward after soaking the cloth in maiden blood.',
  },
  {
    whenFact: 'item:mimic-tear-ashes',
    implies: ['boss:mimic-tear'],
    confidence: 0.8,
    why: 'Mimic Tear Ashes come from Nokron’s Night’s Sacred Ground, so the Mimic Tear beat is done.',
  },
  {
    whenFact: 'item:black-whetblade',
    implies: ['grace:night-sacred-ground'],
    confidence: 0.7,
    why: "The Black Whetblade is found in Nokron's Night's Sacred Ground, so that site is reached. It does not prove Radahn dead.",
  },
  {
    whenFact: 'item:twinned-armor',
    implies: ['quest:fia:dagger'],
    confidence: 0.75,
    why: "The Twinned set comes from D's brother in Deeproot, which only happens once the dagger decision has cost D his life, so Fia's line is advanced. It does not imply Fortissax or her ending.",
  },
  // The Haligtree Secret Medallion only opens the lift when *both* halves are held.
  // Each row fires only if the other half is also known; a lone half implies nothing.
  {
    whenFact: 'item:haligtree-medallion-right',
    implies: ['item:haligtree-secret-medallion'],
    allOf: ['item:haligtree-medallion-left'],
    confidence: 0.9,
    why: 'Both halves of the Haligtree Secret Medallion are held, so the secret path to the Consecrated Snowfield is open.',
  },
  {
    whenFact: 'item:haligtree-medallion-left',
    implies: ['item:haligtree-secret-medallion'],
    allOf: ['item:haligtree-medallion-right'],
    confidence: 0.9,
    why: 'Both halves of the Haligtree Secret Medallion are held, so the secret path to the Consecrated Snowfield is open.',
  },
]

const byWhen = new Map<string, InferChain[]>()
for (const chain of inferChains) {
  const key = canonicalFactId(chain.whenFact)
  const list = byWhen.get(key) || []
  list.push(chain)
  byWhen.set(key, list)
}

/** Chains whose `whenFact` is this fact. */
export function chainsFor(factId: string): InferChain[] {
  return byWhen.get(canonicalFactId(factId)) || []
}

/**
 * Why `toFact` is inferred from `fromFact`, if a Task 54 chain or a catalog
 * `implies` edge covers it. This is the sentence Gideon / Reckon can show for an
 * inferred extra ("I inferred X because you have Y").
 */
export function explainInference(fromFact: string, toFact: string): string | undefined {
  const to = canonicalFactId(toFact)
  for (const chain of chainsFor(fromFact)) {
    if (chain.implies.some((x) => canonicalFactId(x) === to)) return chain.why
  }
  const node = byId.get(canonicalFactId(fromFact))
  if (node?.implies.some((x) => canonicalFactId(x) === to)) {
    return `${fromFact} requires ${toFact}.`
  }
  return undefined
}
