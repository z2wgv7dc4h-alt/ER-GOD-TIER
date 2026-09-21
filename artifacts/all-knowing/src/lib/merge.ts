import type { Character, Evidence } from '../types'

function uniq(ids: string[]) {
  return [...new Set(ids)]
}

function dedupeEvidence(list: Evidence[]) {
  const seen = new Set<string>()
  const out: Evidence[] = []
  for (const e of list) {
    const key = `${e.source}:${e.fact}:${e.claim ?? 'true'}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

/** Union two character pictures. Save flags win on identity; Reckoning keeps shots and answers. */
export function mergeCharacter(base: Character, incoming: Character): Character {
  const saveWins = incoming.source === 'save'
  return {
    ...base,
    ...incoming,
    platform: incoming.platform || base.platform,
    startingClass: incoming.startingClass === 'unknown' ? base.startingClass : incoming.startingClass,
    loadout: incoming.loadout.length ? incoming.loadout : base.loadout,
    defeatedBosses: uniq([...base.defeatedBosses, ...incoming.defeatedBosses]),
    discoveredGraces: uniq([...base.discoveredGraces, ...incoming.discoveredGraces]),
    collectedItems: uniq([...base.collectedItems, ...incoming.collectedItems]),
    completedQuestSteps: uniq([...base.completedQuestSteps, ...incoming.completedQuestSteps]),
    deniedFacts: uniq([...(base.deniedFacts || []), ...(incoming.deniedFacts || [])]),
    answers: { ...base.answers, ...incoming.answers },
    evidence: dedupeEvidence([...base.evidence, ...incoming.evidence]),
    shots: incoming.shots.length ? incoming.shots : base.shots,
    stats: saveWins && incoming.stats ? incoming.stats : incoming.source === 'reckon' ? incoming.stats : base.stats,
    name: incoming.name && incoming.name !== 'Tarnished' ? incoming.name : base.name,
  }
}
