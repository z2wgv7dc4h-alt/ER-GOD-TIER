import { byId, facts } from '../knowledge/catalog'
import type { Character, Evidence, EvidenceClaim, EvidenceSource, StartingClass } from '../types'
import { canonicalFactId } from './aliases'
import { resolveClaim, type ConflictOptions } from './conflict'

function add(list: string[], id: string) {
  return list.includes(id) ? list : [...list, id]
}

function remove(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : list
}

export function prefixKind(id: string) {
  const p = id.split(':')[0]
  if (p === 'grace' || p === 'point') return 'grace'
  // `invader:` is boss-shaped on purpose: a named, defeatable NPC encounter belongs on
  // defeatedBosses, and a separate Character list would change the kernel. The distinct
  // prefix still lets callers tell invaders apart from true `boss:` facts. See Task 18.
  if (p === 'boss' || p === 'hunt' || p === 'bossflag' || p === 'area' || p === 'invader') return 'boss'
  if (p === 'quest' || p === 'line') return 'quest'
  return 'item'
}

function ev(fact: string, source: EvidenceSource, detail: string, confidence: number, claim: EvidenceClaim = 'true'): Evidence {
  return { id: `${source}:${fact}:${detail}`.slice(0, 120), fact, source, confidence, claim, detail, at: Date.now() }
}

/**
 * Recompute the three-state value of each fact from the *full* evidence list
 * (SCOPE item #5). The winning source decides whether the fact lands on its
 * kind's list (`true`) or on `deniedFacts` (`false`); the losing evidence is
 * left in place on `character.evidence`. `unknown` leaves existing state
 * alone rather than silently flipping a fact.
 */
export function reconcileFacts(character: Character, factIds: string[], opts: ConflictOptions = {}): Character {
  let defeatedBosses = [...character.defeatedBosses]
  let discoveredGraces = [...character.discoveredGraces]
  let collectedItems = [...character.collectedItems]
  let completedQuestSteps = [...character.completedQuestSteps]
  let deniedFacts = [...(character.deniedFacts || [])]

  for (const id of factIds) {
    const { state } = resolveClaim(character.evidence, id, opts)
    if (state === 'unknown') continue
    const kind = byId.get(id)?.kind || prefixKind(id)
    if (state === 'true') {
      deniedFacts = remove(deniedFacts, id)
      if (kind === 'boss') defeatedBosses = add(defeatedBosses, id)
      else if (kind === 'grace') discoveredGraces = add(discoveredGraces, id)
      else if (kind === 'quest') completedQuestSteps = add(completedQuestSteps, id)
      else collectedItems = add(collectedItems, id)
    } else {
      deniedFacts = add(deniedFacts, id)
      defeatedBosses = remove(defeatedBosses, id)
      discoveredGraces = remove(discoveredGraces, id)
      collectedItems = remove(collectedItems, id)
      completedQuestSteps = remove(completedQuestSteps, id)
    }
  }

  return { ...character, defeatedBosses, discoveredGraces, collectedItems, completedQuestSteps, deniedFacts }
}

export function closeWorld(ids: string[]) {
  const out = new Set(ids)
  const queue = [...ids]
  while (queue.length) {
    const id = queue.pop()!
    const node = byId.get(id)
    if (!node) continue
    for (const next of node.implies) {
      if (!out.has(next)) {
        out.add(next)
        queue.push(next)
      }
    }
  }
  return [...out]
}

export function applyFacts(
  character: Character,
  incoming: string[],
  source: EvidenceSource,
  detail: string,
  /**
   * Optional strength (0..1) of the originating read — e.g. an OCR confidence.
   * Defaults to the historical 0.94 direct / 0.72 inferred pair so existing
   * callers (save, interview) are unchanged. Implied facts scale at ~0.77×.
   */
  confidence?: number,
  opts: ConflictOptions = {},
): Character {
  const canonical = incoming.map((id) => canonicalFactId(id))
  const closed = closeWorld(canonical)
  const next = { ...character, source: character.source === 'save' ? character.source : 'reckon' as const }
  const evidence = [...character.evidence]
  const directConf = confidence ?? 0.94
  const inferredConf = confidence == null ? 0.72 : Math.round(confidence * 0.766 * 100) / 100
  for (const id of closed) {
    const inferred = !canonical.includes(id)
    const src: EvidenceSource = inferred ? 'inference' : source
    if (!evidence.some((e) => e.fact === id && e.source === src && (e.claim ?? 'true') === 'true')) {
      evidence.push(ev(id, src, inferred ? `implied by ${detail}` : detail, inferred ? inferredConf : directConf, 'true'))
    }
  }
  next.evidence = evidence
  return reconcileFacts(next, closed, opts)
}

export function denyFacts(
  character: Character,
  ids: string[],
  detail: string,
  opts: ConflictOptions = {},
): Character {
  const evidence = [...character.evidence]
  for (const id of ids) {
    if (!evidence.some((e) => e.fact === id && e.detail === detail && (e.claim ?? 'true') === 'false')) {
      evidence.push({
        id: `deny:${id}:${detail}`.slice(0, 120),
        fact: id,
        source: 'answer',
        confidence: 0.9,
        claim: 'false',
        detail,
        at: Date.now(),
      })
    }
  }
  return reconcileFacts({ ...character, evidence }, ids, opts)
}

export function clearFact(character: Character, id: string): Character {
  return {
    ...character,
    deniedFacts: (character.deniedFacts || []).filter((x) => x !== id),
    defeatedBosses: character.defeatedBosses.filter((x) => x !== id),
    discoveredGraces: character.discoveredGraces.filter((x) => x !== id),
    collectedItems: character.collectedItems.filter((x) => x !== id),
    completedQuestSteps: character.completedQuestSteps.filter((x) => x !== id),
  }
}

export function applyAnswers(character: Character): Character {
  const a = character.answers
  let next: Character = { ...character, source: character.source === 'save' ? character.source : 'reckon' }
  if (a.platform === 'ps5' || a.platform === 'pc' || a.platform === 'both') {
    next.platform = a.platform
  }
  if (typeof a.class === 'string') next.startingClass = a.class as StartingClass
  const seeds: string[] = []
  const dlc = a.dlc
  if (dlc === 'limgrave') seeds.push('region:limgrave')
  if (dlc === 'liurnia') seeds.push('region:liurnia')
  if (dlc === 'altus') seeds.push('region:altus', 'region:leyndell')
  if (dlc === 'mountaintops') seeds.push('region:mountaintops')
  // SotE access is gated behind Radahn + Mohg (the withered arm in Mohgwyn). A run that
  // is already in the Realm of Shadow — whether via the progress question or the explicit
  // "began in the DLC" start — has necessarily beaten both, so seed the region *and* its
  // access bosses instead of just the region.
  if (dlc === 'sote' || a.soteStart === 'yes') seeds.push('region:shadow', 'boss:radahn', 'boss:mohg')
  if (dlc === 'finished') seeds.push('boss:radagon')
  // Tarnished Pack starts carry their origin armament (Heavy Knight → Hefty Scimitar,
  // Idus Knight → Idus Sword). Seed it from either the class pick or the pack-start
  // question, so a pack player's starting weapon is known from the interview alone.
  if (a.class === 'heavy-knight' || a.tarnished === 'heavy-knight') seeds.push('item:hefty-scimitar')
  if (a.class === 'idus-knight' || a.tarnished === 'idus-knight') seeds.push('item:idus-sword')
  if (typeof a.lastGrace === 'string' && a.lastGrace.startsWith('grace:')) seeds.push(a.lastGrace)
  if (Array.isArray(a.shardbearers)) seeds.push(...a.shardbearers)
  if (seeds.length) next = applyFacts(next, seeds, 'answer', 'interview')
  return next
}

export function summarize(character: Character) {
  const known = new Set([
    ...character.defeatedBosses,
    ...character.discoveredGraces,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ])
  const catalogOf = (kind: string) => facts.filter((f) => f.kind === kind).length
  return {
    bosses: character.defeatedBosses.length,
    graces: character.discoveredGraces.length,
    items: character.collectedItems.length,
    quests: character.completedQuestSteps.length,
    evidence: character.evidence.length,
    known: known.size,
    catalog: facts.length,
    /** Catalog totals per tracked kind, so callers can show done/remaining. */
    totalBosses: catalogOf('boss'),
    totalGraces: catalogOf('grace'),
    totalItems: catalogOf('item'),
    totalQuests: catalogOf('quest'),
  }
}
