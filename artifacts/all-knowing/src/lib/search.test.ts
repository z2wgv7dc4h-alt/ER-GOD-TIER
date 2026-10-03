import { describe, expect, it } from 'vitest'
import { GROUP_ORDER, groupHits, searchSync } from './search'

describe('searchSync', () => {
  it('returns nothing for very short queries', () => {
    expect(searchSync('')).toHaveLength(0)
    expect(searchSync('a')).toHaveLength(0)
  })

  it('matches the seed catalog', () => {
    const hits = searchSync('godrick')
    expect(hits.some((h) => h.source === 'seed' && h.id === 'boss:godrick')).toBe(true)
  })

  it('matches hosted warps', () => {
    const hits = searchSync('elleh')
    expect(hits.some((h) => h.source === 'warp' && h.id === 'grace:elleh')).toBe(true)
  })

  it('matches loot', () => {
    const hits = searchSync('moonveil')
    expect(hits.some((h) => h.source === 'loot' && h.name === 'Moonveil')).toBe(true)
  })

  it('matches merchant stock', () => {
    const hits = searchSync('alteration')
    expect(hits.some((h) => h.source === 'shop')).toBe(true)
  })

  it('matches boss pins without leaking plate coordinates', () => {
    const hits = searchSync('putrescent knight')
    expect(hits.some((h) => h.source === 'boss' && h.name === 'Putrescent Knight')).toBe(true)
    for (const hit of hits) expect(hit.detail).not.toMatch(/\d+\.\d+\s*,\s*\d+\.\d+/)
  })

  it('matches missables', () => {
    const hits = searchSync('missable')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.source === 'missable')).toBe(true)
  })

  it('respects the 16-result cap for broad queries', () => {
    expect(searchSync('the')).toHaveLength(16)
    for (const q of ['lord', 'grace']) {
      expect(searchSync(q).length).toBeLessThanOrEqual(16)
    }
  })
})

describe('search grouping', () => {
  it('tags every hit with a non-empty section', () => {
    for (const q of ['godrick', 'elleh', 'moonveil', 'missable']) {
      for (const hit of searchSync(q)) {
        expect(hit.group).toBeTruthy()
      }
    }
  })

  it('files bosses, graces and loot under their own headers', () => {
    expect(searchSync('godrick').find((h) => h.id === 'boss:godrick')?.group).toBe('Bosses')
    expect(searchSync('elleh').find((h) => h.source === 'warp')?.group).toBe('Graces')
    expect(searchSync('moonveil').find((h) => h.source === 'loot')?.group).toBe('Loot')
  })

  it('groupHits buckets results and orders sections by GROUP_ORDER', () => {
    const hits = searchSync('lord')
    const sections = groupHits(hits)
    expect(sections.flatMap((s) => s.hits)).toHaveLength(hits.length)
    const rank = (group: string) => {
      const i = GROUP_ORDER.indexOf(group)
      return i === -1 ? GROUP_ORDER.length : i
    }
    const ranks = sections.map((s) => rank(s.group))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })
})

/** Task 152 — the four fixes found by clicking through the quick search. */
describe('Task 152 — search result fixes', () => {
  const QUERIES = ['Omen', 'Radahn', 'Godrick', 'Ranni', 'Limgrave', 'Smithing Stone']

  it('files enemies under an Enemies group (§1)', () => {
    expect(searchSync('omen').some((h) => h.group === 'Enemies' && h.id === 'enemy:omen')).toBe(true)
    for (const q of ['Omen', 'Radahn', 'Godrick', 'Smithing Stone']) {
      expect(searchSync(q).some((h) => h.group === 'Enemies'), q).toBe(true)
    }
  })

  it('shows one row per resolved entity, so alias rows are never their own row (§2)', () => {
    for (const q of QUERIES) {
      const hits = searchSync(q)
      expect(new Set(hits.map((h) => h.id)).size, q).toBe(hits.length)
    }
    // The boss, its kill-flag pin and its alias plane row collapse to one.
    expect(searchSync('Omen').filter((h) => h.name === 'Margit, the Fell Omen')).toHaveLength(1)
  })

  it('never shows raw plate coordinates as a location (§2)', () => {
    for (const q of QUERIES) {
      for (const hit of searchSync(q)) {
        expect(hit.detail, `${q}: ${hit.name}`).not.toMatch(/\d+\.\d+\s*,\s*\d+\.\d+/)
      }
    }
  })

  it('drops a grace that only repeats a boss name (§2)', () => {
    for (const q of ['Omen', 'Margit', 'Godrick', 'Radahn']) {
      const hits = searchSync(q)
      const bossNames = new Set(hits.filter((h) => h.group === 'Bosses').map((h) => h.name.toLowerCase()))
      expect(hits.filter((h) => h.group === 'Graces' && bossNames.has(h.name.toLowerCase())), q).toHaveLength(0)
    }
  })

  it('matches on word starts, not mid-word (§3)', () => {
    // "Omen" must not pull in "Haligtree Promenade" (prom-OMEN-ade).
    expect(searchSync('omen').some((h) => h.id === 'grace:haligtree-promenade')).toBe(false)
  })
})
