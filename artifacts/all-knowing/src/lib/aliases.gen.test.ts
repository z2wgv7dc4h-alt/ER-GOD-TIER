import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import generatedJson from '../data/aliases.json'
import { canonicalFactId, generatedAliasStatus, matchGeneratedAliases } from './aliases'
import { searchSync } from './search'

type Row = { engineId: string; slug: string; kind: string; fmgName: string; aliases: string[]; source: string }
const rows = generatedJson as Row[]

describe('generated alias plane', () => {
  it('has rows for every fact category', () => {
    expect(rows.length).toBeGreaterThan(200)
    const kinds = new Set(rows.map((r) => r.kind))
    for (const k of ['grace', 'boss', 'invader', 'item', 'quest', 'region']) {
      expect(kinds.has(k), `missing kind ${k}`).toBe(true)
    }
    for (const r of rows) {
      expect(r.engineId).toBeTruthy()
      expect(r.slug).toBeTruthy()
      expect(r.fmgName).toBeTruthy()
      expect(Array.isArray(r.aliases)).toBe(true)
    }
  })

  it('round-trips an engine row id to the authored slug across categories', () => {
    expect(canonicalFactId('grace:100000')).toBe('grace:godrick-grace')
    expect(canonicalFactId('bossflag:10000800')).toBe('boss:godrick')
    expect(canonicalFactId('npc:21300014')).toBe('boss:margit')
    // The halves are distinct catalog items; the bare "… Medallion" whole is
    // granted by the compound inference chain once both are held (Task 54/55).
    expect(canonicalFactId('goods:8175')).toBe('item:haligtree-medallion-left')
    expect(canonicalFactId('goods:8176')).toBe('item:haligtree-medallion-right')
    expect(canonicalFactId('npc:523430000')).toBe('invader:nerijus')
    // Quests have no engine param row; the authored id round-trips unchanged.
    expect(canonicalFactId('quest:ranni:festival')).toBe('quest:ranni:festival')
  })

  it('resolves an item and a quest by their extracted / authored names', () => {
    expect(canonicalFactId('whatever', 'Haligtree Secret Medallion (Left)')).toBe('item:haligtree-medallion-left')
    expect(canonicalFactId('whatever', 'Haligtree Secret Medallion (Right)')).toBe('item:haligtree-medallion-right')
    expect(canonicalFactId('whatever', 'Ranni — Radahn festival opened Nokron')).toBe('quest:ranni:festival')
  })

  it('leaves unknown ids untouched', () => {
    expect(canonicalFactId('goods:999999')).toBe('goods:999999')
    expect(canonicalFactId('npc:1')).toBe('npc:1')
  })

  it('finds a generated alias row per category', () => {
    expect(matchGeneratedAliases('elleh').some((r) => r.slug === 'grace:elleh')).toBe(true)
    expect(matchGeneratedAliases('margit').some((r) => r.slug === 'boss:margit')).toBe(true)
    expect(matchGeneratedAliases('nerijus').some((r) => r.slug === 'invader:nerijus')).toBe(true)
    expect(matchGeneratedAliases('haligtree secret medallion').some((r) => r.slug === 'item:haligtree-secret-medallion')).toBe(true)
    expect(matchGeneratedAliases('radahn festival').some((r) => r.slug === 'quest:ranni:festival')).toBe(true)
  })

  it('reports engine-backed coverage per category', () => {
    const status = generatedAliasStatus()
    expect(status.item.facts).toBeGreaterThan(0)
    expect(status.item.engineBacked).toBeGreaterThan(0)
    expect(status.quest.facts).toBeGreaterThan(0)
    expect(status.invader.engineBacked).toBeGreaterThan(0)
    expect(status.grace.engineBacked).toBeGreaterThan(0)
  })

  it('keeps the bundled copy identical to the public artifact', () => {
    const publicPath = fileURLToPath(new URL('../../public/sourced/aliases.json', import.meta.url))
    const publicRows = JSON.parse(readFileSync(publicPath, 'utf8')) as Row[]
    expect(publicRows).toEqual(rows)
  })
})

describe('searchSync uses the generated alias plane', () => {
  // Task 152 §2: when the curated catalog also carries the entity, the alias
  // row is deduped into it — the result set still resolves the same id, but the
  // source may be `seed`. The direct `matchGeneratedAliases` coverage above is
  // what proves the plane itself.
  it('surfaces an item the alias plane knows', () => {
    const hits = searchSync('haligtree secret medallion')
    expect(hits.some((h) => h.id === 'item:haligtree-secret-medallion')).toBe(true)
  })

  it('matches an invader only the alias plane carries', () => {
    const hits = searchSync('npc:523430000')
    expect(hits.some((h) => h.source === 'alias' && h.id === 'invader:nerijus')).toBe(true)
  })

  it('matches a quest alias', () => {
    const hits = searchSync('radahn festival')
    expect(hits.some((h) => h.id === 'quest:ranni:festival')).toBe(true)
  })
})
