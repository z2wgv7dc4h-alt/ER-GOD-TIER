import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WikiSearchResults } from './WikiSearchResults'

describe('Task 133 §3 — wiki result group', () => {
  it('renders nothing for a short query', () => {
    expect(renderToStaticMarkup(<WikiSearchResults query="fr" onPick={() => {}} />)).toBe('')
  })

  it('shows an honest empty state before results resolve', () => {
    const html = renderToStaticMarkup(<WikiSearchResults query="frenzied flame" onPick={() => {}} />)
    expect(html).toContain('No wiki sections match yet')
  })
})
