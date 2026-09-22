import { describe, expect, it } from 'vitest'
import { canonicalFactId } from '../lib/aliases'
import { facts } from './catalog'
import { loot } from './loot'
import { allLines } from './storylines'

/** Guard: an id may exist once per table. A duplicate silently overwrites `byId` and skews counts. */
function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const dups: string[] = []
  for (const id of ids) {
    if (seen.has(id)) dups.push(id)
    seen.add(id)
  }
  return dups
}

describe('fact-id integrity', () => {
  it('has no duplicate catalog fact ids', () => {
    expect(duplicates(facts.map((f) => f.id))).toEqual([])
  })

  it('has no duplicate loot ids', () => {
    expect(duplicates(loot.map((l) => l.id))).toEqual([])
  })

  it('has no duplicate line ids', () => {
    expect(duplicates(allLines.map((l) => l.id))).toEqual([])
  })

  it('round-trips every authored catalog id through canonicalFactId', () => {
    for (const f of facts) expect(canonicalFactId(f.id), f.id).toBe(f.id)
  })
})
