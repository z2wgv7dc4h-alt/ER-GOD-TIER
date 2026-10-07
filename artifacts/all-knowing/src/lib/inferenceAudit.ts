import { facts } from '../knowledge/catalog'
import { gates } from '../knowledge/gates'
import { allLines } from '../knowledge/storylines'
import { inferChains, type InferChain } from '../knowledge/inferChains'
import { canonicalFactId } from './aliases'
import { closeWorld } from './infer'
import { scenarioCharacter, scenarioDirectFacts } from './__fixtures__/scenarios/urmummytoilet'
import type { Character } from '../types'

/**
 * Task 138 §2 — the inference audit surface.
 *
 * `ruleInventory()` enumerates every inference rule the app runs, `scenarioReport()`
 * measures the real-player fixture through the closer with and without the Task 138
 * additions, and `missingConclusions()` is the honest certain/likely classification
 * the task asks for. The script `scripts/inference-audit.mjs` renders this into
 * `docs/INFERENCE-RULES.md`; the tests assert the scenario guard.
 */

export type RuleSource = 'catalog' | 'chain' | 'gate' | 'storyline' | 'setup' | 'capture'

export type InferenceRule = {
  id: string
  source: RuleSource
  trigger: string
  conclusions: string[]
  certainty: 'certain' | 'likely'
  confidence: number
  why: string
  addedBy?: number
}

/**
 * Catalog `implies` edges the audit reads as *likely*, not certain, and therefore
 * flags rather than relies on. Kept here (not silently applied) so the doc can
 * explain each one.
 */
// Task 166 §19 — these keys are checked against the live catalog by
// `inferenceAudit.test.ts`, so they cannot silently go stale again (the previous
// three referenced edges the catalog had already dropped).
export const LIKELY_CATALOG_EDGES = new Set([
  // Holding the Dectus Medallion does not prove the lift was ever used: Altus is
  // also reachable up the Ruin-Strewn Precipice.
  'item:dusk-medallion->region:altus',
  // Holding the Haligtree Secret Medallion does not prove the Haligtree was
  // entered — the lift only reaches the Consecrated Snowfield.
  'item:haligtree-secret-medallion->region:haligtree',
])

export const LIKELY_CATALOG_NOTES: Record<string, string> = {
  'item:dusk-medallion->region:altus':
    'Both halves can be collected without riding the Lift of Dectus (Altus is also reachable via the Ruin-Strewn Precipice). Likely, not certain.',
  'item:haligtree-secret-medallion->region:haligtree':
    'The secret medallion opens the Consecrated Snowfield, not the Haligtree itself. Holding it does not prove Elphael was reached. Likely, not certain.',
}

function catalogRules(): InferenceRule[] {
  const out: InferenceRule[] = []
  for (const f of facts) {
    if (!f.implies.length) continue
    const conclusions = f.implies.map((id) => canonicalFactId(id))
    const key = (to: string) => `${f.id}->${to}`
    const likely = conclusions.some((to) => LIKELY_CATALOG_EDGES.has(key(to)))
    out.push({
      id: `catalog:${f.id}`,
      source: 'catalog',
      trigger: f.id,
      conclusions: f.implies,
      certainty: likely ? 'likely' : 'certain',
      confidence: likely ? 0.6 : 0.9,
      why: likely
        ? conclusions.map((to) => LIKELY_CATALOG_NOTES[key(to)]).filter(Boolean).join(' ') ||
          `${f.name} usually implies its conclusions, but not always.`
        : `Holding/reaching ${f.name} requires the listed facts first.`,
    })
  }
  return out
}

function chainRules(): InferenceRule[] {
  return inferChains.map((c, i) => ({
    id: `chain:${c.whenFact}:${i}`,
    source: 'chain' as const,
    trigger: c.whenFact,
    conclusions: c.implies,
    certainty: c.certainty ?? 'certain',
    confidence: c.confidence,
    why: c.why,
    addedBy: c.addedBy,
  }))
}

function gateRules(): InferenceRule[] {
  return gates.map((g) => ({
    id: `gate:${g.id}`,
    source: 'gate' as const,
    trigger: g.triggerFacts.join(' | '),
    conclusions: g.locks.map((l) => l.factId),
    certainty: 'certain' as const,
    confidence: 0.9,
    why: `${g.name} has fired (or is one beat away from ${g.approachingWhen.join(' | ')}); continuing locks ${g.locks
      .map((l) => l.name)
      .join(', ')}.`,
  }))
}

function storylineRules(): InferenceRule[] {
  const out: InferenceRule[] = []
  for (const line of allLines) {
    for (const step of line.steps) {
      const trigger = step.factId || step.factIds?.[0] || `line:${line.id}:${step.id}`
      const grants = [...(step.grants ?? [])]
      if (!grants.length) continue
      out.push({
        id: `storyline:${line.id}:${step.id}`,
        source: 'storyline',
        trigger,
        conclusions: grants,
        certainty: 'certain',
        confidence: 0.85,
        why: `Completing ${line.name} — “${step.do}” grants its listed facts.`,
      })
    }
  }
  return out
}

/** The setup-wizard's seed rules, in the order `applyAnswers` evaluates them. */
function setupRules(): InferenceRule[] {
  const seed = (id: string, trigger: string, conclusions: string[], why: string): InferenceRule => ({
    id,
    source: 'setup',
    trigger,
    conclusions,
    certainty: 'certain',
    confidence: 0.9,
    why,
  })
  return [
    seed('setup:dlc:limgrave', 'answer dlc=limgrave', ['region:limgrave'], 'The player said the run is still in Limgrave/Weeping.'),
    seed('setup:dlc:liurnia', 'answer dlc=liurnia', ['region:liurnia'], 'The player said the run reached Liurnia.'),
    seed('setup:dlc:altus', 'answer dlc=altus', ['region:altus'], 'The player said the run reached the Altus Plateau.'), // Task 166 §15: no longer also seeds Leyndell
    seed('setup:dlc:leyndell', 'answer dlc=leyndell', ['region:leyndell'], 'The player said the run entered Leyndell, which implies Altus.'),
    seed('setup:dlc:mountaintops', 'answer dlc=mountaintops', ['region:mountaintops'], 'The player said the run reached the Mountaintops/Farum.'),
    seed('setup:dlc:sote', 'answer dlc=sote or soteStart=yes', ['region:shadow', 'boss:radahn', 'boss:mohg'], 'The Realm of Shadow is gated behind Radahn and Mohg, so a run already inside it has both down.'),
    seed('setup:dlc:finished', 'answer dlc=finished', ['boss:radagon'], 'An Elden Lord ending means the final boss is down.'),
    seed('setup:tarnished:weapon', 'answer class/tarnished=heavy-knight|idus-knight', ['item:hefty-scimitar', 'item:idus-sword'], 'A Tarnished Pack start carries its origin armament.'),
    seed('setup:lastGrace', 'answer lastGrace', ['<the named grace>'], 'The last-rested grace is applied directly.'),
    seed('setup:shardbearers', 'answer shardbearers[]', ['<each selected boss>'], 'Each named shardbearer is applied directly.'),
  ]
}

/** Capture-screen rules that derive facts from a read, not a direct name match. */
function captureRules(): InferenceRule[] {
  return [
    {
      id: 'capture:ocr:name-match',
      source: 'capture',
      trigger: 'inventory / warp-list / typed text',
      conclusions: ['<matched catalog fact>'],
      certainty: 'certain',
      confidence: 0.94,
      why: 'A confidently read name is a direct `screenshot` fact; `src/lib/ocr.ts` then runs the same closer.',
    },
    {
      id: 'capture:equipment:header',
      source: 'capture',
      trigger: 'Equipment screen header',
      conclusions: ['<weapon/affinity/upgrade loadout row>'],
      certainty: 'certain',
      confidence: 0.9,
      why: '`headerToLoadout` reads the selected right-hand armament from the header line.',
    },
    {
      id: 'capture:crafting:cookbook',
      source: 'capture',
      trigger: 'craftable item visible on the Item Crafting page',
      conclusions: ['<cookbook that unlocks it>'],
      certainty: 'certain',
      confidence: 0.85,
      why: '`inferCookbooks` maps a read recipe to the cookbook(s) that taught it (`ps5Crafting.ts`).',
    },
    {
      id: 'capture:map:region',
      source: 'capture',
      trigger: 'painted map fragment / discovered underground grace',
      conclusions: ['<the region reached>'],
      certainty: 'certain',
      confidence: 0.9,
      why: 'Task 138: `mapfrag:* -> region` and underground `grace -> region` chains in `inferChains.ts`.',
    },
  ]
}

export function ruleInventory(): InferenceRule[] {
  return [...catalogRules(), ...chainRules(), ...gateRules(), ...storylineRules(), ...setupRules(), ...captureRules()]
}

// ---------------------------------------------------------------------------
// Scenario measurement
// ---------------------------------------------------------------------------

/** The Task 138 chains, and the closure without them, for a true before/after. */
export const beforeChains: InferChain[] = inferChains.filter((c) => c.addedBy !== 138)

export function closureFor(chains: InferChain[]): string[] {
  return closeWorld(scenarioDirectFacts, scenarioDirectFacts, chains)
}

export type ScenarioFact = {
  fact: string
  from?: string
  why: string
  certainty: 'certain' | 'likely'
}

function reasonFor(character: Character, to: string): ScenarioFact {
  const known = new Set(
    [
      ...character.defeatedBosses,
      ...character.discoveredGraces,
      ...character.collectedItems,
      ...character.completedQuestSteps,
    ].map((id) => canonicalFactId(id)),
  )
  for (const chain of inferChains) {
    if (!chain.implies.some((x) => canonicalFactId(x) === to)) continue
    if (!known.has(canonicalFactId(chain.whenFact))) continue
    if (chain.allOf?.some((x) => !known.has(canonicalFactId(x)))) continue
    if (chain.unless?.some((x) => known.has(canonicalFactId(x)))) continue
    return { fact: to, from: chain.whenFact, why: chain.why, certainty: chain.certainty ?? 'certain' }
  }
  for (const f of facts) {
    if (!known.has(canonicalFactId(f.id))) continue
    if (!f.implies.some((x) => canonicalFactId(x) === to)) continue
    const likely = LIKELY_CATALOG_EDGES.has(`${f.id}->${to}`)
    return {
      fact: to,
      from: f.id,
      why: `${f.name} requires ${to}.`,
      certainty: likely ? 'likely' : 'certain',
    }
  }
  return { fact: to, why: 'inferred from the scenario reads.', certainty: 'certain' }
}

export type ScenarioReport = {
  directCount: number
  beforeInferred: string[]
  afterInferred: string[]
  afterFacts: ScenarioFact[]
}

export function scenarioReport(): ScenarioReport {
  const before = new Set(closureFor(beforeChains))
  const after = new Set(closureFor(inferChains))
  const direct = new Set(scenarioDirectFacts.map((id) => canonicalFactId(id)))
  const character = scenarioCharacter()
  return {
    directCount: scenarioDirectFacts.length,
    beforeInferred: [...before].filter((id) => !direct.has(id) && !scenarioDirectFacts.includes(id)).sort(),
    afterInferred: [...after].filter((id) => !direct.has(id) && !scenarioDirectFacts.includes(id)).sort(),
    afterFacts: [...after]
      .filter((id) => !direct.has(id) && !scenarioDirectFacts.includes(id))
      .map((id) => reasonFor(character, id))
      .sort((a, b) => a.fact.localeCompare(b.fact)),
  }
}

export type ConclusionStatus = 'already' | 'implemented' | 'likely' | 'not-modelled'

export type MissingConclusion = {
  id: string
  conclusion: string
  status: ConclusionStatus
  certainty: 'certain' | 'likely'
  detail: string
}

/** The brief's example list, classified honestly after the Task 138 work. */
export function missingConclusions(): MissingConclusion[] {
  return [
    {
      id: 'radahn-nokron',
      conclusion: 'Radahn dead ⇒ festival done, Nokron reachable',
      status: 'already',
      certainty: 'certain',
      detail: '`boss:radahn` already implies `quest:ranni:festival`, and `item:remembrance-starscourge` implies `boss:radahn`.',
    },
    {
      id: 'mountaintops-morgott-rold',
      conclusion: 'Mountaintops entered ⇒ Morgott defeated + Rold Medallion',
      status: 'implemented',
      certainty: 'certain',
      detail: '`region:mountaintops` implied `boss:morgott` already; Task 138 added `region:mountaintops`/`grace:forge-giants` ⇒ `item:rold-medallion`.',
    },
    {
      id: 'leyndell-graces',
      conclusion: 'Leyndell graces ⇒ Leyndell reached',
      status: 'already',
      certainty: 'certain',
      detail: '`grace:capital-outskirts`/`grace:east-capital` imply `region:leyndell`; the map-fragment rule adds `mapfrag:leyndell` ⇒ `region:leyndell`.',
    },
    {
      id: 'siofra-graces',
      conclusion: 'Siofra graces ⇒ Siofra well used',
      status: 'implemented',
      certainty: 'certain',
      detail: 'Task 138 added `grace:siofra` ⇒ `region:siofra-river` (an underground grace proves the well was used).',
    },
    {
      id: 'ainsel-graces',
      conclusion: 'Ainsel graces ⇒ Ainsel accessed',
      status: 'implemented',
      certainty: 'certain',
      detail: 'Task 138 added `grace:ainsel` ⇒ `region:ainsel-river`.',
    },
    {
      id: 'remembrances-bosses',
      conclusion: 'Remembrances ⇒ bosses dead',
      status: 'already',
      certainty: 'certain',
      detail: 'Every `item:remembrance-*` catalog row implies its boss.',
    },
    {
      id: 'talisman-source',
      conclusion: 'Stat-boost talisman owned ⇒ its source reached',
      status: 'implemented',
      certainty: 'certain',
      detail: 'Task 138 added fixed-source rules for `item:radagon-s-soreseal` (⇒ Caelid) and `item:green-turtle-talisman` (⇒ Limgrave).',
    },
    {
      id: 'level-regions-bosses',
      conclusion: 'Level + regions ⇒ main-path bosses likely beaten',
      status: 'likely',
      certainty: 'likely',
      detail: 'Surfaced by `likelyInferences()` in Setup › Review and Journey › Now; never applied silently.',
    },
    {
      id: 'nokron-blade',
      conclusion: 'Nokron reachable ⇒ Fingerslayer Blade obtainable (Ranni beat)',
      status: 'not-modelled',
      certainty: 'likely',
      detail: 'The app cannot prove the blade was picked up; only holding `item:fingerslayer` proves the Nokron beat. Left as a player action.',
    },
  ]
}

export function auditTotals() {
  const rules = ruleInventory()
  return {
    rules: rules.length,
    certain: rules.filter((r) => r.certainty === 'certain').length,
    likely: rules.filter((r) => r.certainty === 'likely').length,
    addedBy138: rules.filter((r) => r.addedBy === 138).length,
  }
}
