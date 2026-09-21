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
    add({ id: f.id, name: f.name, detail: `${f.kind} · ${f.region}`, source: 'seed', module: moduleFor(f.id) })
  }
  for (const g of matchAllWarps(q).slice(0, 6)) {
    add({ id: g.id, name: g.name, detail: `grace · ${g.region}`, source: 'warp', module: 'map' })
  }
  for (const l of matchLoot(q).slice(0, 4)) {
    add({ id: l.id, name: l.name, detail: l.how, source: 'loot', module: 'map' })
  }
  for (const s of findSellers(q).slice(0, 4)) {
    add({ id: `shop:${s.vendor}`, name: s.item, detail: `buy · ${s.vendor}`, source: 'shop', module: 'codex' })
  }
  const boss = findBossPin(q)
  if (boss) add({ id: boss.id, name: boss.name, detail: `${boss.world} · ${boss.x},${boss.y}`, source: 'boss', module: 'map' })
  const n = q.toLowerCase()
  for (const m of missables) {
    if (n.includes('missable') || m.id.replace(/-/g, ' ').includes(n) || m.lockedBy.toLowerCase().includes(n)) {
      add({ id: m.id, name: m.id, detail: `${m.lockedBy} — ${m.note}`, source: 'missable', module: 'quests' })
    }
  }
  // Generated alias plane last: it covers every fact category (items, quests,
  // invaders, regions) and only fills slots the curated sources left open.
  for (const a of matchGeneratedAliases(q).slice(0, 6)) {
    add({ id: a.slug, name: a.fmgName, detail: `${a.kind} · alias`, source: 'alias', module: moduleFor(a.slug) })
  }
  return hits.slice(0, 16)
}
