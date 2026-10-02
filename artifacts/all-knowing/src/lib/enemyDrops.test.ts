import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Drop = { item: string; category: number; chance: number; lot: number }
type Row = { npcParamId: number; name: string; drops: Drop[] }

/** Task 145 — the install's own NpcParam -> ItemLotParam drop tables. */
const doc = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/enemy-drops.json', import.meta.url), 'utf8'),
) as { source: string; rows: Row[] }

const wiki = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/wiki-db/enemy.json', import.meta.url), 'utf8'),
) as { records: { title: string; drops?: string[] }[] }

/** Lowercase, drop parentheticals and punctuation, collapse spaces. */
function norm(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^the /, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('regulation enemy drops (Task 145)', () => {
  it('ships a real table with valid rows', () => {
    expect(doc.rows.length).toBeGreaterThan(500)
    for (const row of doc.rows) {
      for (const drop of row.drops) {
        expect(drop.item, `npc ${row.npcParamId}`).toBeTruthy()
        expect(drop.category, drop.item).toBeGreaterThanOrEqual(1)
        expect(drop.category, drop.item).toBeLessThanOrEqual(5)
        expect(drop.chance, drop.item).toBeGreaterThan(0)
        expect(drop.chance, drop.item).toBeLessThanOrEqual(100)
      }
    }
  })

  it('gives the Omen family the Omen Cleaver', () => {
    const omen = doc.rows.filter((row) => row.name === 'Omen')
    expect(omen.length).toBeGreaterThan(0)
    expect(omen.some((row) => row.drops.some((drop) => drop.item === 'Omen Cleaver'))).toBe(true)
  })

  it('agrees with the wiki on the enemies both sources cover', () => {
    const regByName = new Map<string, Set<string>>()
    for (const row of doc.rows) {
      const key = norm(row.name)
      const set = regByName.get(key) ?? new Set<string>()
      for (const drop of row.drops) set.add(norm(drop.item))
      regByName.set(key, set)
    }
    let compared = 0
    let shared = 0
    for (const record of wiki.records) {
      const drops = (record.drops ?? []).filter(Boolean)
      if (!drops.length) continue
      const reg = regByName.get(norm(record.title))
      if (!reg?.size) continue
      compared++
      if (drops.map(norm).some((item) => reg.has(item))) shared++
    }
    const pct = compared ? (shared / compared) * 100 : 0
    console.log(`[Task 145] wiki cross-check: ${shared}/${compared} = ${pct.toFixed(1)}%`)
    expect(compared).toBeGreaterThan(0)
    expect(pct).toBeGreaterThanOrEqual(60)
  })
})
