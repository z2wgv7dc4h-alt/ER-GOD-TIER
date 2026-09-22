import { describe, expect, it } from 'vitest'
import { linesBySpeaker, speakerLabel, type DialogueOwners } from './dialogueOwners'

const owners: DialogueOwners = {
  note: '',
  npcs: { '2130': 'Margit' },
  byLine: {
    '21300100': ['2130'],
    '10100001': ['1010'],
    '999': ['1010', '2130'],
  },
}

describe('speakerLabel', () => {
  it('returns the named speaker', () => {
    expect(speakerLabel(owners, '21300100')).toBe('Margit')
  })

  it('labels an unnamed family by its code rather than inventing a name', () => {
    expect(speakerLabel(owners, '10100001')).toBe('npc 1010')
  })

  it('prefers a named family when a line has several', () => {
    expect(speakerLabel(owners, '999')).toBe('Margit')
  })

  it('returns undefined for an unattributed line', () => {
    expect(speakerLabel(owners, '404')).toBeUndefined()
  })
})

describe('linesBySpeaker', () => {
  it('groups only named speakers', () => {
    const m = linesBySpeaker(owners)
    expect(m.get('Margit')?.sort()).toEqual(['21300100', '999'])
    expect(m.has('npc 1010')).toBe(false)
  })
})
