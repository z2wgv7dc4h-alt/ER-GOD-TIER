import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CoordPin } from '../lib/coords'
import type { NpcPlacement } from '../lib/npcPlacements'
import { resolveEntityPin } from './pins'
import {
  createItemSourceResolver,
  type AcquisitionRow,
  type BossDropRow,
  type EnemyDropRow,
  type ItemSource,
  type ItemSourceData,
  type MsbEnemyRow,
  type RecipeRow,
  type ShopRow,
} from './itemSources'

const read = <T>(path: string): T =>
  JSON.parse(fs.readFileSync(new URL(`../../public/sourced/${path}`, import.meta.url), 'utf8')) as T

const coords: CoordPin[] = [
  ...read<CoordPin[]>('open/coords.json'),
  ...read<CoordPin[]>('open/boss-pins.json'),
]
const anchors: NpcPlacement[] = read<{ placements: NpcPlacement[] }>('npc-placements.json').placements
const enemyDrops: EnemyDropRow[] = read<{ rows: EnemyDropRow[] }>('open/enemy-drops.json').rows
const msb: MsbEnemyRow[] = read<MsbEnemyRow[]>('open/msb-enemies.json')
const shops: ShopRow[] = read<ShopRow[]>('open/shops.json')
const acquisitions: AcquisitionRow[] = read<{ rows: AcquisitionRow[] }>('open/acquisition.json').rows
const recipes: RecipeRow[] = read<{ recipes: RecipeRow[] }>('open/recipes.json').recipes

const index = read<{
  records: Record<string, {
    id: string
    kind: string
    name: string
    region?: string
    location?: string
    catalogue?: boolean
    drops?: string[]
    map?: { x: number; y: number; world?: string }
  }>
}>('entity-index.json')

const bosses: BossDropRow[] = Object.values(index.records)
  .filter((r) => r.kind === 'boss' && (r.drops?.length || r.map))
  .map((r) => ({
    id: r.id,
    name: r.name,
    drops: r.drops,
    map: r.map ? { x: r.map.x, y: r.map.y, world: r.map.world } : undefined,
    region: r.region,
  }))

const data: ItemSourceData = { coords, anchors, msb, enemyDrops, shops, bosses, acquisitions, recipes }
const resolve = createItemSourceResolver(data)

const ORDER = ['pickup', 'boss', 'vendor', 'enemy', 'other']
const rank = (s: ItemSource) => ORDER.indexOf(s.kind)
const labels = (rows: ItemSource[]) => rows.map((r) => r.label).join(' | ')

describe('itemSources (Task 156)', () => {
  it('sends a vendor-only item to the merchant that sells it', () => {
    const sources = resolve({ id: 'item:dagger', name: 'Dagger', kind: 'weapon' })
    const vendor = sources.find((s) => s.kind === 'vendor')
    expect(vendor, labels(sources)).toBeTruthy()
    expect(vendor!.label).toMatch(/Twin Maiden Husks/)
    expect(vendor!.points).toHaveLength(1)
    expect(vendor!.points[0].x).toBeGreaterThanOrEqual(0)
    expect(vendor!.points[0].x).toBeLessThanOrEqual(100)
  })

  it('sends an enemy-drop item to that enemy\u2019s spawns with the drop rate', () => {
    const sources = resolve({ id: 'item:omen-cleaver', name: 'Omen Cleaver', kind: 'weapon' })
    const enemy = sources.find((s) => s.kind === 'enemy' && /Omen/.test(s.label))
    expect(enemy, labels(sources)).toBeTruthy()
    expect(enemy!.label).toMatch(/Omen/)
    expect(enemy!.label).toMatch(/4%/)
    expect(enemy!.points.length).toBeGreaterThan(0)
  })

  it('sends a boss remembrance to the boss arena pin', () => {
    const sources = resolve({
      id: 'item:remembrance-grafted',
      name: 'Remembrance of the Grafted',
      kind: 'item',
      region: 'Stormveil',
    })
    const boss = sources.find((s) => s.kind === 'boss')
    expect(boss, labels(sources)).toBeTruthy()
    expect(boss!.label).toMatch(/Godrick/)
    expect(boss!.points[0]).toMatchObject({ x: 29.32, y: 61.6 })
  })

  it('sends a quest reward to the NPC that gives it', () => {
    const sources = resolve({ id: 'item:ansbach-s-attire', name: "Ansbach's Attire", kind: 'armor' })
    const quest = sources.find((s) => s.kind === 'other' && /Needle Knight Leda/.test(s.label))
    expect(quest, labels(sources)).toBeTruthy()
    expect(quest!.points).toHaveLength(1)
    expect(quest!.points[0].x).toBeGreaterThan(0)
  })

  it('keeps a world pickup first and grounded', () => {
    const sources = resolve({ id: 'item:black-key-bolt', name: 'Black-Key Bolt', kind: 'item' })
    expect(sources[0].kind, labels(sources)).toBe('pickup')
    expect(sources[0].points.length).toBeGreaterThan(0)
    expect(sources[0].world).toBe('underground')
  })

  it('orders every source list pickup > boss > vendor > enemy > other', () => {
    for (const item of [
      { id: 'item:omen-cleaver', name: 'Omen Cleaver' },
      { id: 'item:remembrance-grafted', name: 'Remembrance of the Grafted' },
      { id: 'item:dagger', name: 'Dagger' },
    ]) {
      const kinds = resolve(item).map(rank)
      expect(kinds, item.name).toEqual([...kinds].sort((a, b) => a - b))
    }
  })

  it('reports the item coverage lift over the pickup-only baseline', () => {
    const itemKinds = new Set(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])
    const rows = Object.values(index.records).filter((r) => itemKinds.has(r.kind) && r.catalogue !== false)
    let before = 0
    let after = 0
    for (const r of rows) {
      if (resolveEntityPin(r.id, coords)) before++
      if (resolve({ id: r.id, name: r.name, kind: r.kind, region: r.region, how: r.location, map: r.map }).length) after++
    }
    // eslint-disable-next-line no-console
    console.log(`[task-156] items with a map target: before ${before}/${rows.length} (${((before / rows.length) * 100).toFixed(1)}%) -> after ${after}/${rows.length} (${((after / rows.length) * 100).toFixed(1)}%)`)
    expect(after).toBeGreaterThan(before)
  })
})
