import { loot } from '../knowledge/loot'
import { warpGraces } from '../knowledge/graces'
import type { Character } from '../types'

function known(c: Character, id: string) {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

export function currentRegion(c: Character) {
  const last = [...c.discoveredGraces].reverse().find((id) => warpGraces.some((g) => g.id === id))
  const g = warpGraces.find((x) => x.id === last)
  return g?.region ?? (typeof c.answers.lastRegion === 'string' ? c.answers.lastRegion : null)
}

export function leftovers(c: Character, region?: string | null) {
  const r = (region || currentRegion(c) || '').toLowerCase()
  if (!r) return []
  return loot.filter((e) => {
    if (!e.region.toLowerCase().includes(r) && r && !r.includes(e.region.toLowerCase())) return false
    return !known(c, e.id) && !(e.grace && known(c, e.grace))
  }).slice(0, 6)
}

export function watchlistOf(c: Character) {
  const raw = typeof c.answers.watch === 'string' ? c.answers.watch : ''
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function toggleWatch(c: Character, id: string): Character {
  const cur = watchlistOf(c)
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  return { ...c, answers: { ...c.answers, watch: next.join(',') } }
}
