import { describe, expect, it } from 'vitest'
import { askGideonRouter } from './gideon'
import { emptyCharacter } from '../data/seed'
import type { DialogueOwners } from './dialogueOwners'

const owners: DialogueOwners = {
  note: '',
  npcRows: { '2130': 21300000 },
  npcs: { '2130': 'Margit' },
  unresolvedPrefixes: [],
  byLine: { '21300100': ['2130'] },
}
const talkmsg = { '21300100': 'Foul tarnished, in search of the Elden Ring.' }
const dialogue = { owners, talkmsg }

describe('askGideonRouter dialogue quoting', () => {
  it('answers a quote request with the verbatim line', () => {
    const act = askGideonRouter('what does Margit say', emptyCharacter, {}, [], dialogue)
    expect(act.say).toContain('Foul tarnished, in search of the Elden Ring.')
    expect(act.module).toBe('codex')
  })

  it('falls through when the speaker has no attributed lines', () => {
    const act = askGideonRouter('what does Boc say', emptyCharacter, {}, [], dialogue)
    expect(act.say).not.toContain('verbatim in-game dialogue')
  })
})
