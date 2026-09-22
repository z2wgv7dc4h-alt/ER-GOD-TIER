import { describe, expect, it } from 'vitest'
import { isDialogueAsk, quoteFor } from './dialogueQuote'
import type { DialogueOwners } from './dialogueOwners'

const owners: DialogueOwners = {
  note: '',
  npcs: { '2130': 'Margit' },
  byLine: { '21300100': ['2130'], '21300101': ['2130'], '999': ['2130'] },
}
const talkmsg = {
  '21300100': 'Foul tarnished, in search of the Elden Ring.',
  '21300101': 'Put these foolish ambitions to rest.',
  '999': 'Emboldened by the flame of ambition.',
}

describe('isDialogueAsk', () => {
  it('recognises quoting verbs', () => {
    expect(isDialogueAsk('what does Margit say')).toBe(true)
    expect(isDialogueAsk('quote Ranni')).toBe(true)
    expect(isDialogueAsk('where is Margit')).toBe(false)
  })
})

describe('quoteFor', () => {
  it('returns real lines for a named speaker', () => {
    const q = quoteFor('what does Margit say', owners, talkmsg)
    expect(q?.speaker).toBe('Margit')
    expect(q?.lines.length).toBe(3)
    expect(q?.lines[0].text).toContain('Foul tarnished')
  })

  it('narrows by topic when the question names one', () => {
    const q = quoteFor('what does Margit say about foolish ambitions', owners, talkmsg)
    expect(q?.lines.map((l) => l.id)).toEqual(['21300101'])
  })

  it('returns null for an unattributed or unknown speaker', () => {
    expect(quoteFor('what does Boc say', owners, talkmsg)).toBeNull()
  })
})
