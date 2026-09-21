import hosted from '../data/hosted-graces.json'
import { warpGraces, type AtlasWorld, type WarpGrace } from '../knowledge/graces'

export type HostedGrace = {
  id: string
  warpId: number
  name: string
  region: string
  world: AtlasWorld
}

const hostedGraces = hosted as HostedGrace[]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Seed slugs (grace:elleh) keyed by normalised name. */
const seedByName = new Map<string, WarpGrace>()
for (const g of warpGraces) {
  seedByName.set(norm(g.name), g)
  for (const a of g.aliases) seedByName.set(norm(a), g)
}

/** Engine / Paramdex id grace:100008 → seed slug when the names match. */
const seedByWarpId = new Map<string, string>()
const warpByNorm = new Map<string, HostedGrace>()
for (const g of hostedGraces) {
  warpByNorm.set(norm(g.name), g)
  const seed = seedByName.get(norm(g.name))
  if (seed) {
    seedByWarpId.set(`grace:${g.warpId}`, seed.id)
    seedByWarpId.set(g.id, seed.id)
  }
}

export const allWarpRows: WarpGrace[] = hostedGraces.map((g) => {
  const seed = seedByName.get(norm(g.name))
  return {
    id: seed?.id || g.id,
    name: g.name,
    aliases: seed?.aliases || [],
    region: g.region,
    world: g.world,
    campaign: g.world === 'shadow' ? 'sote' : 'base',
    x: seed?.x ?? 50,
    y: seed?.y ?? 40,
  }
})

export function canonicalFactId(id: string, name?: string): string {
  if (seedByWarpId.has(id)) return seedByWarpId.get(id) as string
  if (name) {
    const seed = seedByName.get(norm(name))
    if (seed) return seed.id
  }
  return id
}

export function matchAllWarps(text: string): WarpGrace[] {
  const n = norm(text)
  if (n.length < 3) return []
  return allWarpRows.filter((g) => {
    const names = [g.name, ...g.aliases].map(norm)
    return names.some((name) => name && (n === name || n.includes(name) || name.includes(n)))
  })
}

export function graceBySlug(id: string) {
  return allWarpRows.find((g) => g.id === id || g.id === canonicalFactId(id))
}

export function aliasStatus() {
  return {
    hosted: hostedGraces.length,
    seeded: warpGraces.length,
    linked: seedByWarpId.size / 2,
  }
}
