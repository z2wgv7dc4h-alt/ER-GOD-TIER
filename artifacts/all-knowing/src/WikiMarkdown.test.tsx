import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './data/seed'
import { EntityPanel } from './library/EntityPanel'
import { WikiTab } from './library/WikiTab'
import { parseWikiMarkdown, WikiMarkdown } from './WikiMarkdown'
import type { LibraryEntity } from './library/model'

describe('Task 133 §2 — wiki markdown parsing', () => {
  it('splits entity markers from plain text', () => {
    const tokens = parseWikiMarkdown('Reach [[region:limgrave|Limgrave]] then [[boss:margit|Margit]].')
    expect(tokens).toEqual([
      { kind: 'text', text: 'Reach ' },
      { kind: 'entity', id: 'region:limgrave', label: 'Limgrave' },
      { kind: 'text', text: ' then ' },
      { kind: 'entity', id: 'boss:margit', label: 'Margit' },
      { kind: 'text', text: '.' },
    ])
  })

  it('defaults the label to the entity id', () => {
    expect(parseWikiMarkdown('See [[boss:malenia]]')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'entity', id: 'boss:malenia', label: 'boss:malenia' },
    ])
  })

  it('renders each source line as a paragraph', () => {
    const html = renderToStaticMarkup(<WikiMarkdown text={'first line\n\nsecond line'} />)
    expect(html).toContain('first line')
    expect(html).toContain('second line')
    expect(html.match(/<p>/g)?.length).toBe(2)
  })
})

describe('Task 133 §2 — the Wiki tab is wired into the entity page', () => {
  const entity: LibraryEntity = { id: 'bosses:margit', factId: 'boss:margit', name: 'Margit', category: 'bosses' }

  it('shows a Wiki tab button', () => {
    const html = renderToStaticMarkup(<EntityPanel entity={entity} factId="boss:margit" character={emptyCharacter} />)
    expect(html).toContain('>Wiki<')
  })

  it('renders a loading state before the corpus resolves', () => {
    const html = renderToStaticMarkup(<WikiTab entityId="boss:margit" />)
    expect(html).toContain('Loading wiki page')
  })
})
