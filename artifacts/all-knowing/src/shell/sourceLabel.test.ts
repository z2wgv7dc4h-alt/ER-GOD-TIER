import { describe, expect, it } from 'vitest'
import { demoCharacter, emptyCharacter } from '../data/seed'
import { sourceLabel } from '../lib/sourceLabel'

/** Task 93 item 4: the character card must name its real source. */
describe('character source label (Task 93)', () => {
  it('never claims a live save when none is bound', () => {
    expect(sourceLabel(emptyCharacter)).toBe('No save loaded — demo / manual')
    expect(sourceLabel(demoCharacter)).toBe('Demo character')
  })

  it('names the save file and the screenshot / manual sources', () => {
    expect(sourceLabel({ ...emptyCharacter, source: 'save', fileName: 'ER0000.sl2' }))
      .toBe('Save file · ER0000.sl2')
    expect(sourceLabel({ ...emptyCharacter, source: 'save' })).toBe('Save file')
    expect(sourceLabel({
      ...emptyCharacter,
      source: 'reckon',
      shots: [{ id: 's1', kind: 'map', name: 'map.png', url: 'blob:local', notes: '', hits: [] }],
    })).toBe('Screenshot · 1')
    expect(sourceLabel({ ...emptyCharacter, source: 'reckon' })).toBe('Manual entry')
  })
})
