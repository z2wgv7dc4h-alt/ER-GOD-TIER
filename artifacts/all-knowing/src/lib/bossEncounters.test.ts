import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { encountersByGroup } from '../knowledge/catalog'
import { kindStatus, trackActionLabel } from '../library/pageModel'
import { areaBosses } from './areaHub'
import { encountersOf } from './bossRoster'
import { status } from './entityGraph'
import { applyFacts, knownFactIds, resolvedFactIds } from './infer'

/**
 * A boss fought in several places is one entity per encounter: its own id, map
 * pin, HP, drops and tick. The shared id is a page that counts its encounters.
 */

const NC = 'boss:nights-cavalry'
const limgrave = () => encountersOf(NC).find((r) => r.region === 'Limgrave')!
const forbidden = () => encountersOf(NC).find((r) => r.region === 'Forbidden Lands')!

describe('per-encounter bosses', () => {
  it("splits Night's Cavalry into its nine encounters, each with its own flag and pin", () => {
    const rows = encountersOf(NC)
    expect(rows).toHaveLength(9)
    expect(new Set(rows.map((r) => r.id)).size).toBe(9)
    expect(new Set(rows.map((r) => r.flag)).size).toBe(9)
    expect(new Set(rows.map((r) => JSON.stringify(r.coords))).size).toBe(9)
  })

  it('gives each encounter its own drops and HP from the wiki encounter tab', () => {
    expect(limgrave().drops).toEqual(['Ash of War: Repeating Thrust'])
    expect(limgrave().hp).toBe(1665)
    expect(forbidden().drops).toEqual(['Ash of War: Phantom Slash'])
  })

  it('logging one encounter ticks only that one', () => {
    const c = applyFacts(emptyCharacter, [limgrave().id], 'answer', 'test')
    const liurnia = areaBosses(c, 'Liurnia').filter((b) => b.id.startsWith(`${NC}--`))
    expect(liurnia.length).toBeGreaterThan(0)
    expect(liurnia.every((b) => !b.done)).toBe(true)
    expect(areaBosses(c, 'Limgrave').find((b) => b.id === limgrave().id)?.done).toBe(true)
  })

  it('the shared id counts as known once any encounter is (build routes still resolve)', () => {
    const c = applyFacts(emptyCharacter, [forbidden().id], 'answer', 'test')
    expect(knownFactIds(c).has(NC)).toBe(true)
  })

  it("an encounter implies its own region, never another copy of the boss", () => {
    const c = applyFacts(emptyCharacter, [forbidden().id], 'answer', 'test')
    const known = resolvedFactIds(c)
    expect(known.has('region:mountaintops')).toBe(true)
    for (const other of encountersOf(NC).filter((r) => r.id !== forbidden().id)) {
      expect(known.has(other.id), other.id).toBe(false)
    }
  })

  it('the shared page counts encounters and has no single "Mark defeated"', () => {
    const c = applyFacts(emptyCharacter, [limgrave().id], 'answer', 'test')
    const entity = { id: NC, factId: NC, name: "Night's Cavalry", category: 'bosses' as const }
    const line = kindStatus('boss', status(NC, c), entity, undefined, c)
    expect(line.label).toBe('1 of 9 defeated')
    expect(trackActionLabel('boss', false, NC)).toBeNull()
    expect(trackActionLabel('boss', false, limgrave().id)).toBe('Mark defeated')
  })

  it('a shared id logged before per-location tracking asks which one', () => {
    const c = applyFacts(emptyCharacter, [NC], 'answer', 'legacy')
    const entity = { id: NC, factId: NC, name: "Night's Cavalry", category: 'bosses' as const }
    expect(kindStatus('boss', status(NC, c), entity, undefined, c).label).toBe('Logged — which one?')
  })

  it('every encounter group in the catalog has at least two encounters', () => {
    for (const [group, ids] of encountersByGroup) expect(ids.length, group).toBeGreaterThanOrEqual(2)
  })
})
