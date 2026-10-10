import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `BeforeYouGoCard` reads the shared workspace; give it a current area so the
// region tips have somewhere to land.
vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  return {
    ...actual,
    useWorkspace: () =>
      ({
        character: emptyCharacter,
        currentArea: { region: 'Limgrave', factId: 'grace:first-step', source: 'grace', at: 1 },
      }) as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { emptyCharacter } from './data/seed'
import { PvpTechPanel } from './build/KitLibraryPanels'
import { EntityPanel } from './library/EntityPanel'
import { BossFacts } from './library/BossFacts'
import { BeforeYouGoCard } from './BeforeYouGoCard'
import { PlayerTips } from './PlayerTip'
import { tipsByKind, type PlayerTipKind } from './lib/playerTips'
import type { LibraryEntity } from './library/model'

const TAG = 'Player tip · patch'

/** React server rendering escapes apostrophes; decode so text asserts read plainly. */
const decode = (html: string) =>
  html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')

/**
 * Task 195 §2/§4 — every placement renders the "Player tip · patch X" tag with
 * the tip text inside the existing component, not a new page.
 */

describe('Task 195 §2 — PlayerTips renders the tag', () => {
  const KINDS: PlayerTipKind[] = ['boss', 'item', 'pvp', 'mechanic', 'region', 'general']
  it.each(KINDS)('renders every %s tip with its tag', (kind) => {
    const tips = tipsByKind(kind)
    const html = decode(renderToStaticMarkup(<PlayerTips tips={tips} />))
    expect(html).toContain(TAG)
    expect(html).toContain(`patch ${tips[0].patch}`)
    expect(html).toContain(tips[0].text.slice(0, 24))
  })
})

describe('Task 195 §2 — placements render the tag', () => {
  it('renders the PvP tech tag', () => {
    const html = decode(renderToStaticMarkup(<PvpTechPanel />))
    expect(html).toContain(TAG)
    expect(html).toContain(tipsByKind('pvp')[0].text.slice(0, 20))
  })

  it('renders the item usage-notes tag', () => {
    const entity: LibraryEntity = {
      id: 'weapons:kick',
      factId: 'item:kick',
      name: 'Kick',
      category: 'weapons',
      subtype: 'Ash of War',
    }
    const html = decode(renderToStaticMarkup(<EntityPanel entity={entity} character={emptyCharacter} />))
    expect(html).toContain('How players use it')
    expect(html).toContain(TAG)
    expect(html).toContain(tipsByKind('item')[0].text.slice(0, 20))
  })

  it('renders the boss strategy-section tag', () => {
    const html = decode(
      renderToStaticMarkup(<BossFacts factId="boss:mohg" name="Mohg, Lord of Blood" character={emptyCharacter} />),
    )
    expect(html).toContain(TAG)
  })

  it('renders the region "before you go" tag', () => {
    const html = decode(renderToStaticMarkup(<BeforeYouGoCard />))
    expect(html).toContain(TAG)
  })
})
