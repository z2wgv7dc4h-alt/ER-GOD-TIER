import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyFacts } from '../lib/infer'
import { generatedAliases } from '../lib/aliases'
import { askGideonRouter, isFastLookup } from '../lib/gideon'
import type { Character } from '../types'
import { facts } from './catalog'
import { warpGraces } from './graces'
import { matchNpc, npcLocate, npcLocations, refusedNpcLocations } from './npcLocations'

const graceUniverse = new Set<string>([
  ...warpGraces.map((g) => g.id),
  ...facts.filter((f) => f.kind === 'grace').map((f) => f.id),
  ...generatedAliases.filter((a) => a.kind === 'grace').map((a) => a.slug),
])

const withFacts = (...ids: string[]): Character =>
  applyFacts(emptyCharacter, ids, 'answer', 'Task 79 fixture')

describe('Task 79 npc locator table', () => {
  it('has at most 8 NPCs and every grace id exists', () => {
    expect(new Set(npcLocations.map((r) => r.npc)).size).toBeLessThanOrEqual(8)
    for (const row of npcLocations) {
      expect(graceUniverse.has(row.graceId), `${row.npc} ${row.graceId}`).toBe(true)
      expect(row.graceId.startsWith('grace:'), row.graceId).toBe(true)
    }
  })

  it('refuses a row whose grace slug does not exist (Roundtable Hold)', () => {
    const refused = refusedNpcLocations.map((r) => `${r.npc}:${r.graceId}`)
    expect(refused).toContain('roderika:grace:roundtable-hold')
    // ...and never leaks the refused id into the usable table.
    expect(npcLocations.some((r) => r.graceId === 'grace:roundtable-hold')).toBe(false)
  })
})

describe('Task 79 npcLocate', () => {
  it('locates Blaidd at Mistwood by default, advancing with the Ranni line', () => {
    expect(npcLocate(emptyCharacter, 'blaidd')?.graceId).toBe('grace:mistwood')
    expect(npcLocate(withFacts('quest:ranni:service'), 'blaidd')?.graceId).toBe(
      'grace:siofra-river-well-depths',
    )
    expect(npcLocate(withFacts('quest:ranni:service', 'boss:radahn'), 'blaidd')?.graceId).toBe(
      'grace:nokron',
    )
    expect(
      npcLocate(withFacts('quest:ranni:service', 'boss:radahn', 'quest:ranni:ring'), 'blaidd')?.graceId,
    ).toBe('grace:ranni-s-rise')
  })

  it('resolves no pin rather than a stale one when the latest stage has no grace', () => {
    expect(npcLocate(emptyCharacter, 'roderika')?.graceId).toBe('grace:stormhill-shack')
    expect(npcLocate(withFacts('quest:roderika:given'), 'roderika')).toBeNull()
  })

  it('matches a free-text NPC mention for the router', () => {
    expect(matchNpc('where is blaidd')).toBe('blaidd')
    expect(matchNpc('where is the fingerslayer blade')).toBeUndefined()
  })

  it('Gideon answers "where is Blaidd" from the table, deterministically', () => {
    const act = askGideonRouter('where is blaidd', emptyCharacter, {}, [])
    expect(act.module).toBe('map')
    expect(act.factId).toBe('grace:mistwood')
    expect(act.navigateNow).toBe(true)
    expect(act.say).toMatch(/Blaidd is at /)
    expect(isFastLookup('where is blaidd', {}, [])).toBe(true)
  })
})
