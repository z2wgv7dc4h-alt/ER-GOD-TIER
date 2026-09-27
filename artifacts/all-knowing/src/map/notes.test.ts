import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { addNote, matchNoteLinks, notesForWorld, noteMarkers, readNotes, removeNote, updateNote } from './notes'

describe('map notes (Task 111 §2)', () => {
  it('starts empty and stays empty for corrupt data', () => {
    expect(readNotes(emptyCharacter)).toEqual([])
    const bad = { ...emptyCharacter, answers: { mapNotes: 'not json' } }
    expect(readNotes(bad)).toEqual([])
  })

  it('adds, reads and removes a note through the character answers', () => {
    const one = addNote(emptyCharacter, {
      id: 'n1',
      text: '  secret wall  ',
      x: 10,
      y: 20,
      world: 'overworld',
      at: 5,
    })
    const notes = readNotes(one)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ id: 'n1', text: 'secret wall', x: 10, y: 20, world: 'overworld', at: 5 })

    const gone = removeNote(one, 'n1')
    expect(readNotes(gone)).toEqual([])
  })

  it('ignores blank notes', () => {
    expect(readNotes(addNote(emptyCharacter, { text: '   ', x: 1, y: 1, world: 'overworld' }))).toEqual([])
  })

  it('updates text and optional entity link', () => {
    const one = addNote(emptyCharacter, { id: 'n1', text: 'a', x: 1, y: 1, world: 'overworld' })
    const two = updateNote(one, 'n1', { text: 'b', entityId: 'boss:margit' })
    expect(readNotes(two)[0]).toMatchObject({ text: 'b', entityId: 'boss:margit' })
  })

  it('splits notes by world and builds plate markers', () => {
    let c = addNote(emptyCharacter, { id: 'n1', text: 'a', x: 1, y: 1, world: 'overworld' })
    c = addNote(c, { id: 'n2', text: 'b', x: 2, y: 2, world: 'shadow', entityId: 'boss:messmer' })
    const notes = readNotes(c)
    expect(notesForWorld(notes, 'overworld').map((n) => n.id)).toEqual(['n1'])
    const markers = noteMarkers(notes, 'shadow')
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({ id: 'n2', name: 'b', campaign: 'sote', x: 2, y: 2 })
  })

  it('suggests entities to link', () => {
    expect(matchNoteLinks('m').length).toBe(0)
    const hits = matchNoteLinks('margit')
    expect(hits.some((h) => h.id === 'boss:margit')).toBe(true)
  })
})
