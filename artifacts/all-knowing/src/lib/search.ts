import { matchMany } from '../knowledge/catalog'
import { matchLoot } from '../knowledge/loot'
import { findSellers } from '../knowledge/merchants'
import { missables } from '../knowledge/missables'
import { findBossPin } from '../knowledge/bossPins'
import { matchAllWarps, matchGeneratedAliases } from './aliases'
import { moduleFor } from './links'
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
  grace: 'Graces',
  item: 'Items',
  quest: 'Quests',
  invader: 'Invaders',
  region: 'Regions',
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
  'Invaders',
  'Graces',
  'Items',
  'Quests',
  'Regions',
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

export function searchSync(query: string): SearchHit[] {
  const q = query.trim()
  if (q.length < 2) return []
  const hits: SearchHit[] = []
  const seen = new Set<string>()

  function add(hit: SearchHit) {
    const key = `${hit.source}:${hit.id}`
    if (seen.has(key)) return
    seen.add(key)
    hits.push(hit)
  }

  for (const f of matchMany(q)) {
    add({ id: f.id, name: f.name, detail: `${f.kind} · ${f.region}`, source: 'seed', module: moduleFor(f.id), group: groupLabel(f.kind) })
  }
  for (const g of matchAllWarps(q).slice(0, 6)) {
    add({ id: g.id, name: g.name, detail: `grace · ${g.region}`, source: 'warp', module: 'map', group: groupLabel('grace') })
  }
  for (const l of matchLoot(q).slice(0, 4)) {
    add({ id: l.id, name: l.name, detail: l.how, source: 'loot', module: 'map', group: groupLabel('loot') })
  }
  for (const s of findSellers(q).slice(0, 4)) {
    add({
      id: `shop:${s.vendor}`,
      name: s.item,
      detail: s.condition ? `buy · ${s.vendor} · after: ${s.condition}` : `buy · ${s.vendor}`,
      source: 'shop',
      module: 'codex',
      group: groupLabel('shop'),
    })
  }
  const boss = findBossPin(q)
  if (boss) add({ id: boss.id, name: boss.name, detail: `${boss.world} · ${boss.x},${boss.y}`, source: 'boss', module: 'map', group: groupLabel('boss') })
  const n = q.toLowerCase()
  for (const m of missables) {
    if (n.includes('missable') || m.id.replace(/-/g, ' ').includes(n) || m.lockedBy.toLowerCase().includes(n)) {
      add({ id: m.id, name: m.id, detail: `${m.lockedBy} — ${m.note}`, source: 'missable', module: 'quests', group: groupLabel('missable') })
    }
  }
  // Generated alias plane last: it covers every fact category (items, quests,
  // invaders, regions) and only fills slots the curated sources left open.
  for (const a of matchGeneratedAliases(q).slice(0, 6)) {
    add({ id: a.slug, name: a.fmgName, detail: `${a.kind} · alias`, source: 'alias', module: moduleFor(a.slug), group: groupLabel(a.kind) })
  }
  return hits.slice(0, 16)
}
