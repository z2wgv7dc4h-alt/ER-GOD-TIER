import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character, Evidence } from '../types'
import { buildJournal, exportJournalMarkdown, journalSources } from './journal'

const evidence: Evidence[] = [
  { id: 'e1', fact: 'boss:margit', source: 'answer', confidence: 1, at: 1000 },
  { id: 'e2', fact: 'boss:godrick', source: 'save', confidence: 1, claim: 'false', at: 2000 },
  { id: 'e3', fact: 'grace:elleh', source: 'inference', confidence: 0.8, detail: 'near the start', at: 3000 },
]

const character: Character = { ...emptyCharacter, name: 'Test', evidence }

describe('journal (Task 112 §4)', () => {
  it('is newest first', () => {
    expect(buildJournal(character).map((e) => e.id)).toEqual(['e3', 'e2', 'e1'])
  })

  it('filters by source', () => {
    expect(buildJournal(character, 'save').map((e) => e.id)).toEqual(['e2'])
    expect(buildJournal(character, 'screenshot')).toEqual([])
  })

  it('carries the claim through', () => {
    const absent = buildJournal(character).find((e) => e.id === 'e2')
    expect(absent?.claim).toBe('false')
  })

  it('lists the sources present', () => {
    expect(journalSources(character)).toEqual(['answer', 'inference', 'save'])
  })

  it('exports deterministic Markdown', () => {
    const md = exportJournalMarkdown(buildJournal(character), { name: 'Test', now: 0 })
    expect(md).toContain('# Journal — Test')
    expect(md).toContain('_Exported 1970-01-01T00:00:00.000Z_')
    expect(md).toContain('near the start')
    expect(md).toContain('✗ ') // the absent claim
  })

  it('handles an empty journal', () => {
    expect(exportJournalMarkdown([], { now: 0 })).toContain('Nothing logged yet')
  })
})
