import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DialogueBySpeaker, DialogueHits } from './Dialogue'
import type { DialogueOwners } from './lib/dialogueOwners'

const tables = {
  TalkMsg: {
    '100010020': 'But you, I am afraid, are maidenless.',
    '21300100': 'Foul tarnished, in search of the Elden Ring.',
    '2': 'Farewell.',
  },
  EventTextForTalk: { '22001001': 'Use a Sacred Tear to increase the amount of HP/FP replenished by your flasks?' },
}

const owners: DialogueOwners = {
  note: 'test',
  npcs: { '2130': 'Margit' },
  byLine: { '21300100': ['2130'] },
}

describe('DialogueHits', () => {
  it('shows verbatim lines that match, tagged with table and id', () => {
    const html = renderToStaticMarkup(<DialogueHits query="maidenless" preloaded={tables} owners={owners} />)
    expect(html).toContain('Dialogue · verbatim (game text)')
    expect(html).toContain('But you, I am afraid, are maidenless.')
    expect(html).toContain('TalkMsg · 100010020')
  })

  it('names the speaker when the line is attributed', () => {
    const html = renderToStaticMarkup(<DialogueHits query="Foul tarnished" preloaded={tables} owners={owners} />)
    expect(html).toContain('Margit · TalkMsg · 21300100')
  })

  it('renders an unattributed line without a speaker', () => {
    const html = renderToStaticMarkup(<DialogueHits query="maidenless" preloaded={tables} owners={owners} />)
    // '100010020' is not in owners.byLine, so no speaker precedes it
    expect(html).not.toContain('· TalkMsg · 100010020')
  })

  it('stays out of the way for short queries', () => {
    expect(renderToStaticMarkup(<DialogueHits query="ma" preloaded={tables} owners={owners} />)).toBe('')
  })
})

describe('DialogueBySpeaker', () => {
  it('groups a named speaker\'s attributed lines', () => {
    const html = renderToStaticMarkup(
      <DialogueBySpeaker query="margit" preloadedText={tables.TalkMsg} owners={owners} />,
    )
    expect(html).toContain('Dialogue by speaker · game text')
    expect(html).toContain('Margit')
    expect(html).toContain('Foul tarnished, in search of the Elden Ring.')
  })

  it('renders nothing for an unmatched speaker', () => {
    const html = renderToStaticMarkup(
      <DialogueBySpeaker query="boc" preloadedText={tables.TalkMsg} owners={owners} />,
    )
    expect(html).toBe('')
  })
})
