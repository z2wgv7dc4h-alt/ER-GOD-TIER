import hosted from '../data/hosted-graces.json'
import hostedBossesJson from '../data/hosted-bosses.json'
import { warpGraces, type AtlasWorld, type WarpGrace } from '../knowledge/graces'
import { facts, type Fact } from '../knowledge/catalog'
import type { Campaign } from '../types'

export type HostedGrace = {
  id: string
  warpId: number
  name: string
  region: string
  world: AtlasWorld
}

export type HostedBoss = {
  id: string
  name: string
  flag: number
  kill: number
  map: string
  x: number
  y: number
  z: number
}

/** A dump boss row resolved against the authored catalog when names match. */
export type BossRow = {
  id: string
  name: string
  aliases: string[]
  region: string
  campaign: Campaign
  flag: number
  kill: number
  map: string
}

const hostedGraces = hosted as HostedGrace[]
const hostedBosses = hostedBossesJson as HostedBoss[]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
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

/** Authored boss facts keyed by normalised name (name + aliases). */
const seedBossByName = new Map<string, Fact>()
// Only true `boss:` facts join the hosted-boss alias table. Invaders are `kind: 'boss'`
// for storage, but their `invader:` ids have no hosted row and must not inflate coverage.
const seedBosses = facts.filter((f) => f.kind === 'boss' && f.id.startsWith('boss:'))
for (const f of seedBosses) {
  seedBossByName.set(norm(f.name), f)
  for (const a of f.aliases) seedBossByName.set(norm(a), f)
}

/** Dump boss id (bossflag:530100 / kill flag) → seed slug when names match. */
const seedByBossId = new Map<string, string>()
const linkedBossSeeds = new Set<string>()
for (const b of hostedBosses) {
  const seed = seedBossByName.get(norm(b.name))
  if (!seed) continue
  linkedBossSeeds.add(seed.id)
  seedByBossId.set(b.id, seed.id)
  seedByBossId.set(`bossflag:${b.flag}`, seed.id)
  seedByBossId.set(`bossflag:${b.kill}`, seed.id)
}

export const allBossRows: BossRow[] = hostedBosses.map((b) => {
  const seed = seedBossByName.get(norm(b.name))
  return {
    id: seed?.id || b.id,
    name: b.name,
    aliases: seed?.aliases || [],
    region: seed?.region || '',
    campaign: seed?.campaign || 'base',
    flag: b.flag,
    kill: b.kill,
    map: b.map,
  }
})

export function canonicalFactId(id: string, name?: string): string {
  if (seedByWarpId.has(id)) return seedByWarpId.get(id) as string
  if (seedByBossId.has(id)) return seedByBossId.get(id) as string
  if (name) {
    const n = norm(name)
    const grace = seedByName.get(n)
    const boss = seedBossByName.get(n)
    // A handful of names collide (Godrick, Margit) between the grace after a
    // boss and the boss itself. The id prefix disambiguates the caller's intent.
    const p = id.split(':')[0]
    const bossLike = p === 'boss' || p === 'bossflag' || p === 'hunt' || p === 'area'
    if (boss && (bossLike || !grace)) return boss.id
    if (grace) return grace.id
    if (boss) return boss.id
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

export function matchAllBosses(text: string): BossRow[] {
  const n = norm(text)
  if (n.length < 3) return []
  return allBossRows.filter((b) => {
    const names = [b.name, ...b.aliases].map(norm)
    return names.some((name) => name && (n === name || n.includes(name) || name.includes(n)))
  })
}

export function graceBySlug(id: string) {
  return allWarpRows.find((g) => g.id === id || g.id === canonicalFactId(id))
}

export function bossBySlug(id: string) {
  const canonical = canonicalFactId(id)
  return allBossRows.find((b) => b.id === canonical || b.id === id)
}

export function aliasStatus() {
  return {
    hosted: hostedGraces.length,
    seeded: warpGraces.length,
    linked: seedByWarpId.size / 2,
    bossHosted: hostedBosses.length,
    bossSeeded: seedBosses.length,
    bossLinked: linkedBossSeeds.size,
  }
}
