import { byId, facts, type Fact } from '../knowledge/catalog'
import type { Character, ModuleId } from '../types'

const impliedBy = new Map<string, string[]>()
for (const f of facts) {
  for (const dest of f.implies) {
    const list = impliedBy.get(dest) || []
    list.push(f.id)
    impliedBy.set(dest, list)
  }
}

export function factOf(id: string) {
  return byId.get(id)
}

export function labelOf(id: string) {
  const seed = byId.get(id)
  if (seed) return seed.name
  return id.replace(/^[a-z]+:/, '').replace(/-/g, ' ') || id
}

export function knownIds(character: Character) {
  return new Set([
    ...character.defeatedBosses,
    ...character.discoveredGraces,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ])
}

export function thread(id: string) {
  const node = byId.get(id)
  const requires = (node?.implies || []).map((x) => byId.get(x)).filter(Boolean) as Fact[]
  const grantedBy = (impliedBy.get(id) || []).map((x) => byId.get(x)).filter(Boolean) as Fact[]
  const drops = (node?.drops || []).map((x) => byId.get(x)).filter(Boolean) as Fact[]
  const usedIn = (node?.usedIn || []).map((x) => byId.get(x)).filter(Boolean) as Fact[]
  return { node, requires, grantedBy, drops, usedIn }
}

export function whyKnown(character: Character, id: string) {
  return character.evidence.filter((e) => e.fact === id)
}

export function moduleFor(id: string): ModuleId {
  const kind = byId.get(id)?.kind
  if (kind === 'quest') return 'quests'
  if (kind === 'item') return 'codex'
  return 'map'
}

/** What to ask or photograph next — unknown facts one step past what they already proved. */
export function nextMoves(character: Character, limit = 5) {
  const have = knownIds(character)
  const suggestions: { id: string; reason: string }[] = []
  for (const id of have) {
    for (const parent of impliedBy.get(id) || []) {
      if (have.has(parent)) continue
      const f = byId.get(parent)
      if (!f) continue
      suggestions.push({ id: parent, reason: `You already proved ${labelOf(id)}` })
    }
  }
  const seen = new Set<string>()
  return suggestions.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  }).slice(0, limit)
}

export function statusOf(character: Character, id: string): 'known' | 'missing' {
  return knownIds(character).has(id) ? 'known' : 'missing'
}
