import { matchMany } from '../knowledge/catalog'
import { matchLoot } from '../knowledge/loot'
import { findSellers } from '../knowledge/merchants'
import { missables } from '../knowledge/missables'
import { findBossPin } from '../knowledge/bossPins'
import { bossBySlug, canonicalFactId, matchAllWarps, matchGeneratedAliases } from './aliases'
import { moduleFor } from './links'
import { normalizeName, wordStartMatch } from './nameMatch'
import type { ModuleId } from '../types'

export type SearchHit = {
  id: string
  name: string
  detail: string
  source: 'seed' | 'warp' | 'loot' | 'shop' | 'boss' | 'missable' | 'alias'
  module: ModuleId
  /** Semantic section the palette files this hit under, e.g. "Bosses". */
  group: string
}

const GROUP_LABELS: Record<string, string> = {
  boss: 'Bosses',
  enemy: 'Enemies',
  grace: 'Graces',
  item: 'Items',
  quest: 'Quests',
  invader: 'Invaders',
  npc: 'NPCs',
  npcs: 'NPCs',
  region: 'Regions',
  dungeon: 'Dungeons',
  hunt: 'Hunts',
  loot: 'Loot',
  shop: 'Merchants',
  missable: 'Missables',
}

function groupLabel(kind: string): string {
  if (GROUP_LABELS[kind]) return GROUP_LABELS[kind]
  return kind.charAt(0).toUpperCase() + kind.slice(1) + 's'
}

/**
 * Section order for the command palette. Kinds the seed catalog shares with the
 * alias plane (boss/item/quest/…) collapse into one section, so an item found
 * by its FMG name sits next to the same item from the curated catalog.
 */
export const GROUP_ORDER = [
  'Bosses',
  'Enemies',
  'Invaders',
  'Graces',
  'NPCs',
  'Items',
  'Quests',
  'Regions',
  'Dungeons',
  'Loot',
  'Merchants',
  'Missables',
]

export function groupHits(hits: SearchHit[]): { group: string; hits: SearchHit[] }[] {
  const sections = new Map<string, SearchHit[]>()
  for (const hit of hits) {
    const list = sections.get(hit.group) || []
    list.push(hit)
    sections.set(hit.group, list)
  }
  const rank = (group: string) => {
    const i = GROUP_ORDER.indexOf(group)
    return i === -1 ? GROUP_ORDER.length : i
  }
  return [...sections.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([group, list]) => ({ group, hits: list }))
}

/** A candidate before dedupe, carrying the kind and a source priority. */
type Candidate = {
  hit: SearchHit
  kind: string
  priority: number
}

const RESULT_CAP = 16

/**
 * Source priority when two sources resolve to the same entity. A hosted grace
 * row carries the real warp name (and region), so it beats the seed/catalog
 * copy; everywhere else the curated seed row is authoritative. The alias plane
 * is always last: it only fills entities no other source knows.
 */
function sourcePriority(source: SearchHit['source'], canonicalId: string): number {
  if (canonicalId.startsWith('grace:')) {
    if (source === 'warp') return 0
    if (source === 'seed') return 1
    return 2
  }
  if (source === 'seed') return 0
  if (source === 'warp') return 1
  return 2
}

function detailFor(kind: string, region?: string): string {
  return region ? `${kind} · ${region}` : kind
}

function namesMatch(query: string, names: (string | undefined)[]): boolean {
  return names.some((name) => (name ? wordStartMatch(query, name) : false))
}

export function searchSync(query: string): SearchHit[] {
  const q = query.trim()
  if (q.length < 2) return []
  const candidates: Candidate[] = []
  const add = (hit: SearchHit, kind: string, priority: number) => {
    candidates.push({ hit, kind, priority })
  }

  for (const f of matchMany(q)) {
    if (!namesMatch(q, [f.name, ...f.aliases])) continue
    add(
      { id: f.id, name: f.name, detail: detailFor(f.kind, f.region), source: 'seed', module: moduleFor(f.id), group: groupLabel(f.kind) },
      f.kind,
      sourcePriority('seed', f.id),
    )
  }
  for (const g of matchAllWarps(q)) {
    if (!namesMatch(q, [g.name, ...g.aliases])) continue
    const id = canonicalFactId(g.id)
    add(
      { id, name: g.name, detail: detailFor('grace', g.region), source: 'warp', module: 'map', group: groupLabel('grace') },
      'grace',
      sourcePriority('warp', id),
    )
  }
  for (const l of matchLoot(q)) {
    if (!namesMatch(q, [l.name, ...l.aliases])) continue
    add(
      { id: l.id, name: l.name, detail: l.how, source: 'loot', module: 'map', group: groupLabel('loot') },
      'loot',
      2,
    )
  }
  for (const s of findSellers(q)) {
    add(
      {
        id: `shop:${s.vendor}:${s.item}`,
        name: s.item,
        detail: s.condition ? `buy · ${s.vendor} · after: ${s.condition}` : `buy · ${s.vendor}`,
        source: 'shop',
        module: 'codex',
        group: groupLabel('shop'),
      },
      'shop',
      2,
    )
  }
  const pin = findBossPin(q)
  if (pin && wordStartMatch(q, pin.name)) {
    const id = canonicalFactId(pin.id)
    // Never surface the raw plate coordinates; use the resolved region (or world).
    const where = bossBySlug(id)?.region || pin.world
    add(
      { id, name: pin.name, detail: detailFor('boss', where), source: 'boss', module: 'map', group: groupLabel('boss') },
      'boss',
      2,
    )
  }
  const n = q.toLowerCase()
  for (const m of missables) {
    if (n.includes('missable') || m.id.replace(/-/g, ' ').includes(n) || m.lockedBy.toLowerCase().includes(n)) {
      add(
        { id: m.id, name: m.id, detail: `${m.lockedBy} — ${m.note}`, source: 'missable', module: 'quests', group: groupLabel('missable') },
        'missable',
        2,
      )
    }
  }
  // Generated alias plane last: it covers every fact category (items, quests,
  // invaders, enemies, regions) and only fills entities the other sources left
  // open. A duplicate alias row never renders as its own row.
  for (const a of matchGeneratedAliases(q)) {
    if (!namesMatch(q, [a.fmgName, ...a.aliases, a.engineId])) continue
    const id = canonicalFactId(a.slug)
    add(
      { id, name: a.fmgName, detail: a.kind, source: 'alias', module: moduleFor(id), group: groupLabel(a.kind) },
      a.kind,
      2,
    )
  }

  // A grace that only carries a boss's name (the arena grace) would read as a
  // duplicate of the boss. Drop it rather than relabel: the boss row is the one
  // the player searched for.
  const bossNames = new Set<string>()
  for (const c of candidates) {
    if (c.kind === 'boss') bossNames.add(normalizeName(c.hit.name))
  }

  const ordered = candidates
    .map((c, index) => ({ c, index }))
    .sort((a, b) => a.c.priority - b.c.priority || a.index - b.index)
    .map((entry) => entry.c)

  const deduped: Candidate[] = []
  const seen = new Set<string>()
  for (const c of ordered) {
    const id = c.hit.id
    if (seen.has(id)) continue
    if (c.kind === 'grace' && bossNames.has(normalizeName(c.hit.name))) continue
    seen.add(id)
    deduped.push(c)
  }

  return selectFairly(deduped, RESULT_CAP).map((c) => c.hit)
}

/**
 * Cap the list while keeping every matched group represented: round-robin one
 * row per group in section order, then wrap. Without this the 16-result cap
 * starves the last-added group (enemies/invaders live only in the alias plane).
 */
function selectFairly(candidates: Candidate[], cap: number): Candidate[] {
  if (candidates.length <= cap) return candidates
  const rank = (group: string) => {
    const i = GROUP_ORDER.indexOf(group)
    return i === -1 ? GROUP_ORDER.length : i
  }
  const byGroup = new Map<string, Candidate[]>()
  for (const c of candidates) {
    const list = byGroup.get(c.hit.group) || []
    list.push(c)
    byGroup.set(c.hit.group, list)
  }
  const groups = [...byGroup.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  const out: Candidate[] = []
  for (let i = 0; out.length < cap; i++) {
    let added = false
    for (const group of groups) {
      const list = byGroup.get(group) as Candidate[]
      if (i < list.length && out.length < cap) {
        out.push(list[i])
        added = true
      }
    }
    if (!added) break
  }
  return out
}
