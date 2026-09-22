import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { aliasStatus, bossBySlug, canonicalFactId, matchAllBosses } from './aliases'
import { applyFacts } from './infer'

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
