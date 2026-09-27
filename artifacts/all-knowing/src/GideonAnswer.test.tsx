import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  return {
    ...actual,
    useWorkspace: () =>
      ({ openEntity: () => {} }) as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { GideonAnswer, GideonSay } from './GideonAnswer'

const noop = () => {}

describe('GideonSay (Task 101 markers)', () => {
  it('renders a known marker as an entity link and an unknown one as plain text', () => {
    const html = renderToStaticMarkup(
      <GideonSay text="Go to [[boss:godrick|the Grafted]] then [[boss:godrick-prime|the secret one]]." />,
    )
    expect(html).toMatch(/class="wikilink"/)
    expect(html).toContain('the Grafted')
    expect(html).toContain('the secret one')
    // The invented id is never a link; it renders as plain text only.
    expect(html).not.toMatch(/<button[^>]*>[^<]*the secret one/)
  })
})

describe('GideonAnswer (Task 101 rendering)', () => {
  const html = renderToStaticMarkup(
    <GideonAnswer
      text="Mark [[boss:godrick|Godrick]] done and [[item:uchigatana]] is worth it."
      links={['boss:godrick', 'item:uchigatana', 'boss:margit']}
      actions={[
        { type: 'markDone', ids: ['boss:godrick'] },
        { type: 'equip', slot: 'right-1', id: 'item:uchigatana' },
        { type: 'showOnMap', id: 'grace:first-step' },
      ]}
      sources={[{ title: 'Wiki', url: 'https://example.com/real' }]}
      showActions
      onApply={noop}
      onApplyAll={noop}
      onNav={noop}
      onSkip={noop}
    />,
  )

  it('shows confirm chips with Apply / Apply all / Skip for character actions', () => {
    expect(html).toContain('Gideon suggests')
    expect(html).toMatch(/Mark .*Godrick.* done/)
    expect(html).toMatch(/Equip/i)
    expect(html).toContain('Apply')
    expect(html).toContain('Apply all')
    expect(html).toContain('Skip')
  })

  it('lists only links that are not already inline as "Mentioned"', () => {
    expect(html).toContain('Mentioned')
    expect(html).toMatch(/Mentioned<\/span>.*Margit/s)
  })

  it('renders navigation actions as plain buttons and sources as external links', () => {
    expect(html).toMatch(/Show .* on map/)
    expect(html).toContain('href="https://example.com/real"')
    expect(html).toContain('rel="noreferrer noopener"')
  })
})
