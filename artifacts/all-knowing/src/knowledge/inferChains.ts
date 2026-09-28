import { canonicalFactId } from '../lib/aliases'
import { byId } from './catalog'
import { mapFragments } from './collectibles'

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
  /**
   * Task 138 §2 — whether the implication is a certainty (the evidence cannot
   * exist without the conclusion) or only a likely read that the UI must offer
   * for confirmation. Defaults to `certain` when omitted.
   */
  certainty?: 'certain' | 'likely'
  /** The task that authored this rule. Used by the audit to measure before/after. */
  addedBy?: number
  why: string
}

/**
 * A named NPC only drops their Bell Bearing once they are gone, which means the
 * player reached that NPC's area. The bearing's shop side (Twin Maiden Husks)
 * lives in `merchantConditions.ts`; this is only the reachability implication.
 */
function bellBearingRule(bearing: string, region: string, owner: string): InferChain {
  return {
    whenFact: bearing,
    implies: [region],
    confidence: 0.85,
    why: `${owner} only drops their Bell Bearing once they are gone, so ${owner}'s area was reached.`,
  }
}

/**
 * Task 138 §2 — owning a painted map fragment proves the region it lives in was
 * reached: the fragment is a fixed pickup placed on that terrain. Only fragments
 * that actually exist in `collectibles.ts` are emitted, so the table can never
 * gain a fabricated id.
 */
const MAP_FRAGMENT_REACH: Record<string, string> = {
  'mapfrag:limgrave-w': 'region:limgrave',
  'mapfrag:limgrave-e': 'region:limgrave',
  'mapfrag:weeping': 'region:weeping',
  'mapfrag:liurnia-e': 'region:liurnia',
  'mapfrag:liurnia-n': 'region:liurnia',
  'mapfrag:liurnia-w': 'region:liurnia',
  'mapfrag:caelid': 'region:caelid',
  'mapfrag:dragonbarrow': 'region:caelid',
  'mapfrag:altus': 'region:altus',
  'mapfrag:leyndell': 'region:leyndell',
  'mapfrag:gelmir': 'region:altus',
  'mapfrag:mountaintops-w': 'region:mountaintops',
  'mapfrag:mountaintops-e': 'region:mountaintops',
  'mapfrag:consecrated': 'region:mountaintops',
}

function mapFragmentChains(): InferChain[] {
  const known = new Set(mapFragments.map((f) => f.id))
  return Object.entries(MAP_FRAGMENT_REACH)
    .filter(([id]) => known.has(id))
    .map(([whenFact, region]) => ({
      whenFact,
      implies: [region],
      confidence: 0.9,
      certainty: 'certain' as const,
      addedBy: 138,
      why: `A painted ${region.replace(/^region:/, '').replace(/-/g, ' ')} map fragment can only be picked up in that region, so that region was reached.`,
    }))
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
  // Task 94 — Setup wizard rules. Great Rune → shardbearer and remembrance →
  // boss already live on their catalog rows (see `catalog.ts`); these are the
  // rules that were missing. Dectus follows the same compound rule as Haligtree.
  {
    whenFact: 'item:dectus-medallion-left',
    implies: ['item:dusk-medallion'],
    allOf: ['item:dectus-medallion-right'],
    confidence: 0.9,
    why: 'Both halves of the Dectus Medallion are held, so the Grand Lift of Dectus opens the way to Altus.',
  },
  {
    whenFact: 'item:dectus-medallion-right',
    implies: ['item:dusk-medallion'],
    allOf: ['item:dectus-medallion-left'],
    confidence: 0.9,
    why: 'Both halves of the Dectus Medallion are held, so the Grand Lift of Dectus opens the way to Altus.',
  },
  // Bell bearing → NPC/region state (item ids are real `guide/catalog.json` rows).
  bellBearingRule('bell-bearing-kale-s-bell-bearing', 'region:limgrave', 'Merchant Kalé'),
  bellBearingRule('bell-bearing-rogier-s-bell-bearing', 'region:limgrave', 'Sorcerer Rogier'),
  bellBearingRule('bell-bearing-d-s-bell-bearing', 'region:limgrave', 'D, Hunter of the Dead'),
  bellBearingRule('bell-bearing-corhyn-s-bell-bearing', 'region:limgrave', 'Brother Corhyn'),
  bellBearingRule('bell-bearing-patches-bell-bearing', 'region:limgrave', 'Patches'),
  bellBearingRule('bell-bearing-gostoc-s-bell-bearing', 'region:limgrave', 'Gatekeeper Gostoc'),
  bellBearingRule('bell-bearing-sellen-s-bell-bearing', 'region:liurnia', 'Sorceress Sellen'),
  bellBearingRule('bell-bearing-miriel-s-bell-bearing', 'region:liurnia', 'Miriel'),
  bellBearingRule('bell-bearing-iji-s-bell-bearing', 'region:liurnia', 'Iji'),
  bellBearingRule('bell-bearing-blackguard-s-bell-bearing', 'region:liurnia', 'Blackguard Big Boggart'),
  bellBearingRule('bell-bearing-thops-s-bell-bearing', 'region:liurnia', 'Thops'),
  bellBearingRule('bell-bearing-seluvis-s-bell-bearing', 'region:liurnia', 'Preceptor Seluvis'),
  bellBearingRule('bell-bearing-gowry-s-bell-bearing', 'region:caelid', 'Gowry'),
  bellBearingRule('bell-bearing-abandoned-merchant-s-bell-bearing', 'region:leyndell', 'the Abandoned Merchant'),
  bellBearingRule('bell-bearing-ymir-s-bell-bearing', 'region:shadow', 'Count Ymir'),
  bellBearingRule('bell-bearing-igon-s-bell-bearing', 'region:shadow', 'Igon'),
  bellBearingRule('bell-bearing-moore-s-bell-bearing', 'region:shadow', 'Moore'),

  // ---------------------------------------------------------------------------
  // Task 138 §2 — conclusions a knowledgeable player draws that the app did not.
  // Each is a one-directional certainty: the evidence cannot exist without the
  // conclusion. Likely reads live in `likelyInferences.ts`, never here.
  // ---------------------------------------------------------------------------
  // Entering the Mountaintops at all means a Rold medallion was used: the first
  // way up is the Grand Lift of Rold (the Haligtree secret medallion is itself
  // found from within the Mountaintops), and the Forge sits only past it.
  {
    whenFact: 'region:mountaintops',
    implies: ['item:rold-medallion'],
    confidence: 0.9,
    certainty: 'certain',
    addedBy: 138,
    why: 'The Grand Lift of Rold is the only way up to the Mountaintops, so the Rold Medallion was already used.',
  },
  {
    whenFact: 'grace:forge-giants',
    implies: ['item:rold-medallion'],
    confidence: 0.9,
    certainty: 'certain',
    addedBy: 138,
    why: 'The Forge of the Giants lies past the Grand Lift of Rold, so the Rold Medallion was already used.',
  },
  // A discovered underground grace proves the corresponding well/region was reached.
  {
    whenFact: 'grace:siofra',
    implies: ['region:siofra-river'],
    confidence: 0.9,
    certainty: 'certain',
    addedBy: 138,
    why: 'A Siofra grace can only be found underground, so the Siofra River Well was used.',
  },
  {
    whenFact: 'grace:ainsel',
    implies: ['region:ainsel-river'],
    confidence: 0.9,
    certainty: 'certain',
    addedBy: 138,
    why: 'An Ainsel grace can only be found underground, so the Ainsel River Well was reached.',
  },
  // A stat-boost talisman with a single fixed source proves that source was reached.
  {
    whenFact: 'item:radagon-s-soreseal',
    implies: ['region:caelid'],
    confidence: 0.9,
    certainty: 'certain',
    addedBy: 138,
    why: "Radagon's Soreseal is a fixed chest inside Fort Faroth in Dragonbarrow, so Caelid was reached.",
  },
  {
    whenFact: 'item:green-turtle-talisman',
    implies: ['region:limgrave'],
    confidence: 0.9,
    certainty: 'certain',
    addedBy: 138,
    why: 'The Green Turtle Talisman is a fixed pickup at Summonwater Village, so Limgrave was reached.',
  },

  ...mapFragmentChains(),
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
