import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DialogueHits } from './Dialogue'

const tables = {
  TalkMsg: { '100010020': 'But you, I am afraid, are maidenless.', '2': 'Farewell.' },
  EventTextForTalk: { '22001001': 'Use a Sacred Tear to increase the amount of HP/FP replenished by your flasks?' },
}

describe('DialogueHits', () => {
  it('shows verbatim lines that match, tagged with table and id', () => {
    const html = renderToStaticMarkup(<DialogueHits query="maidenless" preloaded={tables} />)
    expect(html).toContain('Dialogue · verbatim (game text)')
    expect(html).toContain('But you, I am afraid, are maidenless.')
    expect(html).toContain('TalkMsg · 100010020')
  })

  it('stays out of the way for short queries', () => {
    const html = renderToStaticMarkup(<DialogueHits query="ma" preloaded={tables} />)
    expect(html).toBe('')
  })

  it('renders nothing when nothing matches', () => {
    const html = renderToStaticMarkup(<DialogueHits query="zzzznotfound" preloaded={tables} />)
    expect(html).toBe('')
  })
})
