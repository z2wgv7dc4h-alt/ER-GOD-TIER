import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import generatedJson from '../data/aliases.json'
import { emptyCharacter } from '../data/seed'
import { aliasStatus, bossBySlug, canonicalFactId, matchAllBosses } from './aliases'
import { applyFacts } from './infer'
import { searchSync } from './search'

type AliasRow = { engineId: string; slug: string; kind: string; fmgName: string; aliases: string[]; source: string }
const generatedRows = generatedJson as AliasRow[]
const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

describe('boss alias table', () => {
  it('resolves dump boss ids to authored boss: slugs', () => {
    expect(canonicalFactId('bossflag:510010')).toBe('boss:godrick')
    expect(canonicalFactId('bossflag:510300')).toBe('boss:radahn')
    expect(canonicalFactId('bossflag:510220')).toBe('boss:rykard')
    expect(canonicalFactId('bossflag:510040')).toBe('boss:morgott')
  })

  it('resolves by name as well as id', () => {
    expect(canonicalFactId('whatever', 'Radahn, Consort of Miquella')).toBe('boss:consort')
    expect(canonicalFactId('whatever', 'Godfrey, First Elden Lord')).toBe('boss:godfrey')
  })

  it('uses the id prefix to break grace/boss name collisions', () => {
    expect(canonicalFactId('bossflag:unknown', 'Godrick the Grafted')).toBe('boss:godrick')
    expect(canonicalFactId('grace:unknown', 'Godrick the Grafted')).toBe('grace:godrick-grace')
  })

  it('leaves authored and unknown ids untouched', () => {
    expect(canonicalFactId('boss:godrick')).toBe('boss:godrick')
    expect(canonicalFactId('bossflag:999999')).toBe('bossflag:999999')
  })

  it('finds boss rows by name', () => {
    const rows = matchAllBosses('godrick')
    expect(rows.some((r) => r.id === 'boss:godrick')).toBe(true)
    expect(matchAllBosses('')).toHaveLength(0)
  })

  it('reports hosted / seeded / linked boss coverage', () => {
    const status = aliasStatus()
    expect(status.bossHosted).toBe(215)
    expect(status.bossSeeded).toBe(88)
    expect(status.bossLinked).toBe(84)
  })

  it('looks bosses up by slug or dump id', () => {
    expect(bossBySlug('bossflag:510010')?.id).toBe('boss:godrick')
    expect(bossBySlug('boss:godrick')?.name).toBe('Godrick the Grafted')
  })

  it('canonicalizes dump ids before applying facts', () => {
    const next = applyFacts(emptyCharacter, ['bossflag:510010'], 'screenshot', 'shot')
    expect(next.defeatedBosses).toContain('boss:godrick')
    expect(next.defeatedBosses).not.toContain('bossflag:510010')
  })
})

describe('generated alias plane wiring (Task 55)', () => {
  it('links the Elleh engine grace row to the authored grace:elleh slug', () => {
    const row = generatedRows.find((r) => r.slug === 'grace:elleh' && r.source !== 'authored')
    expect(row, 'no engine row for grace:elleh').toBeTruthy()
    expect(canonicalFactId(row!.engineId)).toBe('grace:elleh')
    expect(canonicalFactId('grace:elleh')).toBe('grace:elleh')
  })

  it('links the Godrick kill flag to boss:godrick', () => {
    const rows = generatedRows.filter(
      (r) => r.slug === 'boss:godrick' && r.source === 'hosted-bosses' && r.engineId.startsWith('bossflag:'),
    )
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(canonicalFactId(r.engineId)).toBe('boss:godrick')
  })

  it('searchSync hits grace:elleh for both the full and short name', () => {
    for (const q of ['church of elleh', 'elleh']) {
      expect(searchSync(q).some((h) => h.id === 'grace:elleh'), q).toBe(true)
    }
  })

  it('gives at least 50 of the 418 graces.json warps a slug', () => {
    const graces = JSON.parse(
      readFileSync(new URL('../../public/sourced/checklists/graces.json', import.meta.url), 'utf8'),
    ) as { name: string }[]
    const slugged = new Set(
      generatedRows.filter((r) => r.kind === 'grace' && r.source !== 'authored').map((r) => loose(r.fmgName)),
    )
    const hit = graces.filter((g) => slugged.has(loose(g.name))).length
    expect(hit).toBeGreaterThanOrEqual(50)
  })
})
