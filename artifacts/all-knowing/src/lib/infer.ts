import { byId, facts } from '../knowledge/catalog'
import type { Character, Evidence, EvidenceSource, StartingClass } from '../types'

function uniq(ids: string[]) {
  return [...new Set(ids)]
}

function add(list: string[], id: string) {
  return list.includes(id) ? list : [...list, id]
}

function prefixKind(id: string) {
  const p = id.split(':')[0]
  if (p === 'grace' || p === 'point') return 'grace'
  if (p === 'boss' || p === 'hunt' || p === 'bossflag' || p === 'area') return 'boss'
  if (p === 'quest' || p === 'line') return 'quest'
  return 'item'
}

function ev(fact: string, source: EvidenceSource, detail: string, confidence: number): Evidence {
  return { id: `${source}:${fact}:${detail}`.slice(0, 120), fact, source, confidence, detail, at: Date.now() }
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

export function applyFacts(character: Character, incoming: string[], source: EvidenceSource, detail: string): Character {
  const closed = closeWorld(incoming)
  let next = { ...character, source: character.source === 'save' ? character.source : 'reckon' as const }
  const evidence = [...character.evidence]
  for (const id of closed) {
    const node = byId.get(id)
    const inferred = !incoming.includes(id)
    const src: EvidenceSource = inferred ? 'inference' : source
    if (!evidence.some((e) => e.fact === id && e.source === src)) {
      evidence.push(ev(id, src, inferred ? `implied by ${detail}` : detail, inferred ? 0.72 : 0.94))
    }
    const kind = node?.kind || prefixKind(id)
    if (kind === 'boss') next.defeatedBosses = add(next.defeatedBosses, id)
    else if (kind === 'grace') next.discoveredGraces = add(next.discoveredGraces, id)
    else if (kind === 'quest') next.completedQuestSteps = add(next.completedQuestSteps, id)
    else next.collectedItems = add(next.collectedItems, id)
  }
  next.deniedFacts = (next.deniedFacts || []).filter((id) => !closed.includes(id))
  next.evidence = evidence
  return next
}

export function denyFacts(character: Character, ids: string[], detail: string): Character {
  const deniedFacts = [...new Set([...(character.deniedFacts || []), ...ids])]
  const evidence = [...character.evidence]
  for (const id of ids) {
    if (!evidence.some((e) => e.fact === id && e.detail === detail)) {
      evidence.push({
        id: `deny:${id}:${detail}`,
        fact: id,
        source: 'answer',
        confidence: 0.9,
        detail,
        at: Date.now(),
      })
    }
  }
  return {
    ...character,
    deniedFacts,
    defeatedBosses: character.defeatedBosses.filter((id) => !ids.includes(id)),
    discoveredGraces: character.discoveredGraces.filter((id) => !ids.includes(id)),
    collectedItems: character.collectedItems.filter((id) => !ids.includes(id)),
    evidence,
  }
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
  if (dlc === 'sote') seeds.push('region:shadow')
  if (dlc === 'finished') seeds.push('boss:radagon')
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
  return {
    bosses: character.defeatedBosses.length,
    graces: character.discoveredGraces.length,
    items: character.collectedItems.length,
    quests: character.completedQuestSteps.length,
    evidence: character.evidence.length,
    known: known.size,
    catalog: facts.length,
  }
}
